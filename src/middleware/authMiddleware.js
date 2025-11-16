import jwt from "jsonwebtoken";
import pool from "../config/db.js";
import { verifyAccessToken } from "../utils/tokenUtils.js";

export const verifyAdmin = async (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Verify scope is "admin" for admin routes (backward compatible: allow tokens without scope)
    const tokenScope = decoded.scope;
    if (tokenScope && tokenScope !== 'admin') {
      console.log('⚠️ [verifyAdmin] Invalid scope for admin route:', tokenScope);
      return res.status(403).json({ 
        message: "This token is not valid for admin panel. Please use admin panel login." 
      });
    }
    // If scope is undefined/null, allow for backward compatibility (old tokens)
    
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
        // Allow superadmin, moderator, viewer roles (map legacy 'admin' to 'superadmin')
        const allowedRoles = ['admin', 'superadmin', 'moderator', 'viewer'];
        const userRole = user.role?.toLowerCase();
        if (!allowedRoles.includes(userRole)) {
          return res.status(403).json({ message: "Forbidden - Admin access required" });
        }
        // Map legacy 'admin' to 'superadmin' for consistency
        const normalizedRole = userRole === 'admin' ? 'superadmin' : userRole;
        req.user = { id: user.id, phone: user.phone, role: normalizedRole };
      }
    } else if (decoded.role) {
      // Email-based authentication
      // Allow superadmin, moderator, viewer roles (map legacy 'admin' to 'superadmin')
      const allowedRoles = ['admin', 'superadmin', 'moderator', 'viewer'];
      const userRole = decoded.role?.toLowerCase();
      if (!allowedRoles.includes(userRole)) {
        return res.status(403).json({ message: "Forbidden - Admin access required" });
      }
      // Map legacy 'admin' to 'superadmin' for consistency
      const normalizedRole = userRole === 'admin' ? 'superadmin' : userRole;
      req.user = { ...decoded, role: normalizedRole };
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
    // 🔍 DEEP TRACE: Log incoming token
    console.log('🔍 [DEEP TRACE] verifyUser middleware - INCOMING TOKEN');
    console.log('   Token preview:', token.substring(0, 50) + '...');
    
    // Use token utility to verify access token
    const decoded = verifyAccessToken(token);
    
    // 🔍 DEEP TRACE: Log decoded token
    if (decoded) {
      console.log('   🔍 Decoded Token Payload:');
      console.log('      ID:', decoded.id);
      console.log('      Phone:', decoded.phone);
      console.log('      Role (from token):', decoded.role);
      console.log('      Scope (from token):', decoded.scope);
      console.log('      Expired:', decoded.expired);
    }
    
    // Check if token is expired
    if (decoded && decoded.expired) {
      return res.status(401).json({ 
        success: false, 
        error: "token_expired",
        message: "Token expired" 
      });
    }
    
    if (!decoded) {
      return res.status(401).json({ 
        success: false, 
        error: "invalid_token",
        message: "Invalid token" 
      });
    }

    // Verify scope is "mobile" for mobile routes (backward compatible: allow tokens without scope)
    const tokenScope = decoded.scope;
    if (tokenScope && tokenScope !== 'mobile') {
      console.log('⚠️ [verifyUser] Invalid scope for mobile route:', tokenScope);
      return res.status(403).json({ 
        success: false, 
        error: "invalid_scope",
        message: "This token is not valid for mobile app. Please use mobile app login." 
      });
    }
    // If scope is undefined/null, allow for backward compatibility (old tokens)
    
    // Verify user exists in database
    let user;
    if (decoded.phone) {
      // Phone-based authentication
      const userResult = await pool.query(
        "SELECT id, name, email, phone, role, status FROM users WHERE phone = $1",
        [decoded.phone]
      );
      if (userResult.rows.length === 0) {
        return res.status(401).json({ 
          success: false, 
          error: "user_not_found",
          message: "User not found" 
        });
      }
      user = userResult.rows[0];
    } else if (decoded.id) {
      // ID-based authentication
      const userResult = await pool.query(
        "SELECT id, name, email, phone, role, status FROM users WHERE id = $1",
        [decoded.id]
      );
      if (userResult.rows.length === 0) {
        return res.status(401).json({ 
          success: false, 
          error: "user_not_found",
          message: "User not found" 
        });
      }
      user = userResult.rows[0];
    } else {
      return res.status(401).json({ 
        success: false, 
        error: "invalid_token_format",
        message: "Invalid token format" 
      });
    }

    // 🔍 DEEP TRACE: Compare token role vs database role
    console.log('   🔍 Database User:');
    console.log('      ID:', user.id);
    console.log('      Phone:', user.phone);
    console.log('      Role (from database):', user.role);
    if (decoded.role && user.role && decoded.role.toLowerCase() !== user.role.toLowerCase()) {
      console.log('   ⚠️⚠️⚠️ ROLE MISMATCH: Token role (' + decoded.role + ') != Database role (' + user.role + ')');
      console.log('   ⚠️ Using database role:', user.role);
    }

    // Check if user is blocked
    if (user.status === 'blocked') {
      return res.status(403).json({ 
        success: false, 
        error: "account_blocked",
        message: "Account is blocked" 
      });
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
      return res.status(401).json({ 
        success: false, 
        error: "token_expired",
        message: "Token expired" 
      });
    }
    res.status(401).json({ 
      success: false, 
      error: "invalid_token",
      message: "Invalid or expired token" 
    });
  }
};