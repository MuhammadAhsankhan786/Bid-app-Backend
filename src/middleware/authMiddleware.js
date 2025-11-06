import jwt from "jsonwebtoken";
import pool from "../config/db.js";

export const verifyAdmin = async (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check if user exists and is admin (for phone-based auth, we need to verify user exists)
    if (decoded.phone) {
      // Phone-based authentication - verify user exists
      const userResult = await pool.query(
        "SELECT id, phone, role FROM users WHERE phone = $1",
        [decoded.phone]
      );
      
      if (userResult.rows.length === 0) {
        // Create admin user if doesn't exist (for OTP login)
        // Handle conflicts gracefully - try insert, fallback to select if conflict
        const email = `admin@${decoded.phone.replace(/\+/g, '')}.com`;
        try {
          const adminResult = await pool.query(
            `INSERT INTO users (name, email, phone, role, status, password) 
             VALUES ($1, $2, $3, 'admin', 'approved', '')
             ON CONFLICT (phone) DO UPDATE SET role = 'admin', status = 'approved'
             RETURNING id, phone, role`,
            [`Admin ${decoded.phone}`, email, decoded.phone]
          );
          req.user = { id: adminResult.rows[0].id, phone: decoded.phone, role: 'admin' };
        } catch (insertError) {
          // If insert fails due to email conflict or other unique violation
          if (insertError.code === '23505') { // Unique violation
            // Try to find existing user by phone or email
            const existingUser = await pool.query(
              "SELECT id, phone, role FROM users WHERE phone = $1 OR email = $2 LIMIT 1",
              [decoded.phone, email]
            );
            if (existingUser.rows.length > 0) {
              // Update existing user to admin if needed
              await pool.query(
                "UPDATE users SET role = 'admin', status = 'approved' WHERE id = $1",
                [existingUser.rows[0].id]
              );
              req.user = { id: existingUser.rows[0].id, phone: decoded.phone, role: 'admin' };
            } else {
              // If still can't find, re-throw
              throw insertError;
            }
          } else {
            throw insertError;
          }
        }
      } else {
        const user = userResult.rows[0];
        if (user.role !== 'admin') {
          return res.status(403).json({ message: "Forbidden - Admin only" });
        }
        req.user = { id: user.id, phone: user.phone, role: user.role };
      }
    } else if (decoded.role) {
      // Email-based authentication
      if (decoded.role !== "admin") {
        return res.status(403).json({ message: "Forbidden - Admin only" });
      }
      req.user = decoded;
    } else {
      return res.status(401).json({ message: "Invalid token" });
    }
    
    next();
  } catch (error) {
    // Only log non-expired token errors (expired tokens are expected)
    if (error.name !== 'TokenExpiredError') {
      console.error("Auth error:", error.name, error.message);
    }
    // Return appropriate error message
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: "Token expired" });
    }
    res.status(401).json({ message: "Invalid token" });
  }
};

// Middleware for regular user authentication (buyer/seller)
export const verifyUser = async (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ success: false, message: "Unauthorized - Token required" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Verify user exists in database
    let user;
    if (decoded.phone) {
      // Phone-based authentication
      const userResult = await pool.query(
        "SELECT id, name, email, phone, role, status FROM users WHERE phone = $1",
        [decoded.phone]
      );
      if (userResult.rows.length === 0) {
        return res.status(401).json({ success: false, message: "User not found" });
      }
      user = userResult.rows[0];
    } else if (decoded.id) {
      // ID-based authentication
      const userResult = await pool.query(
        "SELECT id, name, email, phone, role, status FROM users WHERE id = $1",
        [decoded.id]
      );
      if (userResult.rows.length === 0) {
        return res.status(401).json({ success: false, message: "User not found" });
      }
      user = userResult.rows[0];
    } else {
      return res.status(401).json({ success: false, message: "Invalid token format" });
    }

    // Check if user is blocked
    if (user.status === 'blocked') {
      return res.status(403).json({ success: false, message: "Account is blocked" });
    }

    req.user = user;
    next();
  } catch (error) {
    // Only log non-expired token errors (expired tokens are expected)
    if (error.name !== 'TokenExpiredError') {
      console.error("Auth error:", error.name, error.message);
    }
    // Return appropriate error message
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: "Token expired" });
    }
    res.status(401).json({ success: false, message: "Invalid or expired token" });
  }
};