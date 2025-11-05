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
        const adminResult = await pool.query(
          `INSERT INTO users (name, email, phone, role, status, password) 
           VALUES ($1, $2, $3, 'admin', 'approved', '')
           ON CONFLICT (phone) DO UPDATE SET role = 'admin'
           RETURNING id, phone, role`,
          [`Admin ${decoded.phone}`, `admin@${decoded.phone.replace(/\+/g, '')}.com`, decoded.phone]
        );
        req.user = { id: adminResult.rows[0].id, phone: decoded.phone, role: 'admin' };
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
    console.error("Auth error:", error);
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
    console.error("Auth error:", error);
    res.status(401).json({ success: false, message: "Invalid or expired token" });
  }
};