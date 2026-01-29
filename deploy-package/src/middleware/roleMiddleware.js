import jwt from "jsonwebtoken";
import pool from "../config/db.js";

/**
 * Role-Based Access Control Middleware
 * Checks if the authenticated user's role is in the allowed roles list
 * 
 * @param {...string} allowedRoles - Roles that are allowed to access the route
 * @returns {Function} Express middleware function
 */
export const authorizeRoles = (...allowedRoles) => {
  return async (req, res, next) => {
    try {
      // Get token from Authorization header
      const token = req.headers.authorization?.split(" ")[1];

      if (!token) {
        return res.status(401).json({ 
          success: false, 
          message: "Unauthorized - Token required" 
        });
      }

      // Verify and decode JWT token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      let userRole = null;
      let userId = null;

      // Extract role from token (handle both phone-based and email-based auth)
      if (decoded.phone) {
        // Phone-based authentication - fetch user from database
        const userResult = await pool.query(
          "SELECT id, role FROM users WHERE phone = $1",
          [decoded.phone]
        );
        
        if (userResult.rows.length === 0) {
          return res.status(401).json({ 
            success: false, 
            message: "User not found" 
          });
        }
        
        userRole = userResult.rows[0].role;
        userId = userResult.rows[0].id;
      } else if (decoded.role) {
        // Email-based authentication - role is in token
        userRole = decoded.role;
        userId = decoded.id;
      } else if (decoded.id) {
        // ID-based authentication - fetch user from database
        const userResult = await pool.query(
          "SELECT id, role FROM users WHERE id = $1",
          [decoded.id]
        );
        
        if (userResult.rows.length === 0) {
          return res.status(401).json({ 
            success: false, 
            message: "User not found" 
          });
        }
        
        userRole = userResult.rows[0].role;
        userId = userResult.rows[0].id;
      } else {
        return res.status(401).json({ 
          success: false, 
          message: "Invalid token format" 
        });
      }

      // Normalize role to lowercase for comparison
      userRole = userRole?.toLowerCase();

      // Map legacy 'admin' role to 'superadmin' for backward compatibility
      if (userRole === 'admin') {
        userRole = 'superadmin';
      }

      // Check if user role is in allowed roles list
      const normalizedAllowedRoles = allowedRoles.map(role => role.toLowerCase());
      
      console.log('[RoleMiddleware] Authorization check:', {
        userRole,
        allowedRoles: normalizedAllowedRoles,
        path: req.path,
        method: req.method
      });
      
      if (!normalizedAllowedRoles.includes(userRole)) {
        console.log('[RoleMiddleware] ❌ Access denied:', {
          userRole,
          required: normalizedAllowedRoles,
          path: req.path
        });
        return res.status(403).json({ 
          success: false, 
          message: "Access denied: insufficient privileges",
          required: normalizedAllowedRoles,
          current: userRole
        });
      }
      
      console.log('[RoleMiddleware] ✅ Access granted:', {
        userRole,
        path: req.path
      });

      // Attach user info to request object
      req.user = {
        id: userId,
        role: userRole,
        ...decoded
      };

      next();
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({ 
          success: false, 
          message: "Token expired" 
        });
      }
      
      if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({ 
          success: false, 
          message: "Invalid token" 
        });
      }

      console.error("Role authorization error:", error);
      return res.status(500).json({ 
        success: false, 
        message: "Authorization error" 
      });
    }
  };
};

/**
 * Helper function to check if user has any of the specified roles
 * Can be used in controllers for additional checks
 */
export const hasRole = (userRole, ...allowedRoles) => {
  const normalizedUserRole = userRole?.toLowerCase();
  const normalizedAllowedRoles = allowedRoles.map(role => role.toLowerCase());
  
  // Map legacy 'admin' to 'superadmin'
  const roleToCheck = normalizedUserRole === 'admin' ? 'superadmin' : normalizedUserRole;
  
  return normalizedAllowedRoles.includes(roleToCheck);
};

