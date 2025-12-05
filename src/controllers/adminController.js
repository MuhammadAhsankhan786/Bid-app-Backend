import { UserModel } from "../models/userModel.js";
import { ProductModel } from "../models/productModel.js";
import pool from "../config/db.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

export const AdminController = {
  // ✅ Admin Login (supports superadmin, moderator, viewer roles)
  async login(req, res) {
    const { email, password } = req.body;
    const user = await UserModel.findByEmail(email);

    // Check if user exists and has admin role (superadmin, moderator, viewer, or legacy admin)
    const allowedRoles = ['admin', 'superadmin', 'moderator', 'viewer'];
    const userRole = user?.role?.toLowerCase();
    
    if (!user || !allowedRoles.includes(userRole)) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(400).json({ message: "Invalid credentials" });

    // Normalize role (map legacy 'admin' to 'superadmin')
    const normalizedRole = userRole === 'admin' ? 'superadmin' : userRole;

    // Generate token with scope="admin" for admin panel
    const token = jwt.sign(
      { id: user.id, role: normalizedRole, scope: 'admin' },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    res.json({
      token,
      admin: { 
        id: user.id, 
        name: user.name, 
        email: user.email,
        role: normalizedRole
      }
    });
  },

  // ✅ Get All Users (excluding admins)
  async getUsers(req, res) {
    try {
      const { search, status, role, page = 1, limit = 20 } = req.query;
      
      // Build WHERE conditions
      let whereConditions = ["u.role != 'admin'"];
      const params = [];
      let paramCount = 1;

      if (search) {
        whereConditions.push(`(u.name ILIKE $${paramCount++} OR u.email ILIKE $${paramCount++})`);
        params.push(`%${search}%`, `%${search}%`);
      }

      if (status) {
        whereConditions.push(`u.status = $${paramCount++}`);
        params.push(status);
      }

      if (role) {
        whereConditions.push(`u.role = $${paramCount++}`);
        params.push(role);
      }

      const whereClause = whereConditions.join(' AND ');
      
      // Main query - compute bids_count dynamically from bids table
      // Uses LEFT JOIN subquery to count bids per user
      let query = `
        SELECT 
          u.id, 
          u.name, 
          u.email, 
          u.phone, 
          u.role, 
          u.status, 
          COALESCE(b.bids_count, 0) as bids_count, 
          u.created_at
        FROM users u
        LEFT JOIN (
          SELECT user_id, COUNT(*) as bids_count
          FROM bids
          GROUP BY user_id
        ) b ON u.id = b.user_id
        WHERE ${whereClause}
        ORDER BY u.created_at DESC 
        LIMIT $${paramCount++} OFFSET $${paramCount}
      `;
      params.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit));

      // Count query for pagination (same WHERE conditions, no LIMIT/OFFSET)
      let countQuery = `
        SELECT COUNT(*) as count
        FROM users u
        WHERE ${whereClause}
      `;
      
      // Count params are same as main query but without LIMIT/OFFSET
      const countParams = params.slice(0, -2);

      const [result, countResult] = await Promise.all([
        pool.query(query, params),
        pool.query(countQuery, countParams)
      ]);

      res.json({
        users: result.rows,
        pagination: {
          total: parseInt(countResult.rows[0].count),
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(parseInt(countResult.rows[0].count) / parseInt(limit))
        }
      });
    } catch (error) {
      console.error("Error fetching users:", error);
      console.error("Error stack:", error.stack);
      res.status(500).json({ error: "Failed to fetch users", details: error.message });
    }
  },

  // ✅ Get User By ID
  async getUserById(req, res) {
    try {
      const { id } = req.params;
      
      console.log(`🔍 [getUserById] Fetching user with ID: ${id}`);
      
      // First check if user exists (simpler query)
      const userCheck = await pool.query(
        `SELECT id, name, email, phone, role, status, created_at 
         FROM users 
         WHERE id = $1`,
        [id]
      );

      if (userCheck.rows.length === 0) {
        console.log(`❌ [getUserById] User not found: ${id}`);
        return res.status(404).json({ 
          success: false,
          error: "User not found" 
        });
      }

      const user = userCheck.rows[0];
      
      // Check if user is admin (exclude admin users)
      const adminRoles = ['admin', 'superadmin', 'moderator', 'viewer'];
      if (adminRoles.includes(user.role?.toLowerCase())) {
        console.log(`⚠️ [getUserById] Attempted to fetch admin user: ${id}`);
        return res.status(403).json({ 
          success: false,
          error: "Cannot fetch admin user details" 
        });
      }

      // Get bids count (with error handling in case bids table doesn't exist)
      let bidsCount = 0;
      try {
        const bidsResult = await pool.query(
          `SELECT COUNT(*) as bids_count
           FROM bids
           WHERE user_id = $1`,
          [id]
        );
        bidsCount = parseInt(bidsResult.rows[0]?.bids_count || 0);
      } catch (bidsError) {
        console.warn(`⚠️ [getUserById] Could not fetch bids count: ${bidsError.message}`);
        // Continue without bids count if table doesn't exist
      }

      const userWithBids = {
        ...user,
        bids_count: bidsCount
      };

      console.log(`✅ [getUserById] User fetched successfully: ${id}`);
      res.json({
        success: true,
        user: userWithBids
      });
    } catch (error) {
      console.error("❌ [getUserById] Error fetching user:", error);
      console.error("   Error message:", error.message);
      console.error("   Error code:", error.code);
      console.error("   Error stack:", error.stack);
      res.status(500).json({ 
        success: false,
        error: "Failed to fetch user", 
        details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  },

  // ✅ Delete a User
  async deleteUser(req, res) {
    try {
      const { id } = req.params;
      
      const result = await pool.query(
        "DELETE FROM users WHERE id = $1 AND role != 'admin' RETURNING id",
        [id]
      );

      if (result.rowCount === 0) {
        return res.status(404).json({ error: "User not found or cannot be deleted" });
      }

      // Log admin action (with error handling in case table doesn't exist)
      try {
        await pool.query(
          `INSERT INTO admin_activity_log (admin_id, action, entity_type, entity_id)
           VALUES ($1, 'User deleted', 'user', $2)`,
          [req.user.id, id]
        );
      } catch (logError) {
        console.warn(`⚠️ [deleteUser] Could not log admin action: ${logError.message}`);
        // Continue even if logging fails
      }

      res.json({ 
        success: true,
        message: "User deleted successfully",
        data: { id: result.rows[0].id }
      });
    } catch (error) {
      console.error("❌ [deleteUser] Error deleting user:", error);
      console.error("   Error message:", error.message);
      res.status(500).json({ 
        error: "Failed to delete user",
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  // ✅ Approve a User (if user needs admin approval)
  async approveUser(req, res) {
    try {
      const { id } = req.params;
      const result = await pool.query(
        "UPDATE users SET status = 'approved' WHERE id = $1 AND role != 'admin' RETURNING id, name, email, status",
        [id]
      );
      
      if (result.rowCount === 0) {
        return res.status(404).json({ error: "User not found" });
      }

      // Log admin action (with error handling in case table doesn't exist)
      try {
        await pool.query(
          `INSERT INTO admin_activity_log (admin_id, action, entity_type, entity_id)
           VALUES ($1, 'User approved', 'user', $2)`,
          [req.user.id, id]
        );
      } catch (logError) {
        console.warn(`⚠️ [approveUser] Could not log admin action: ${logError.message}`);
        // Continue even if logging fails
      }

      res.json({ 
        success: true,
        message: "User approved successfully", 
        user: result.rows[0] 
      });
    } catch (error) {
      console.error("❌ [approveUser] Error approving user:", error);
      console.error("   Error message:", error.message);
      res.status(500).json({ 
        error: "Failed to approve user",
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  // ✅ Block a User
  async blockUser(req, res) {
    try {
      const { id } = req.params;
      const result = await pool.query(
        "UPDATE users SET status = 'blocked' WHERE id = $1 AND role != 'admin' RETURNING id, name, email, status",
        [id]
      );
      
      if (result.rowCount === 0) {
        return res.status(404).json({ error: "User not found" });
      }

      // Log admin action (with error handling in case table doesn't exist)
      try {
        await pool.query(
          `INSERT INTO admin_activity_log (admin_id, action, entity_type, entity_id)
           VALUES ($1, 'User blocked', 'user', $2)`,
          [req.user.id, id]
        );
      } catch (logError) {
        console.warn(`⚠️ [blockUser] Could not log admin action: ${logError.message}`);
        // Continue even if logging fails
      }

      res.json({ 
        success: true,
        message: "User blocked successfully", 
        user: result.rows[0] 
      });
    } catch (error) {
      console.error("❌ [blockUser] Error blocking user:", error);
      console.error("   Error message:", error.message);
      res.status(500).json({ 
        error: "Failed to block user",
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  // ✅ Dashboard Stats (keeping for backward compatibility, but dashboardController is preferred)
  async getDashboard(req, res) {
    try {
      const stats = {
        users: (await pool.query("SELECT COUNT(*) FROM users WHERE role != 'admin'")).rows[0].count,
        products: (await pool.query("SELECT COUNT(*) FROM products")).rows[0].count,
        pending: (await pool.query("SELECT COUNT(*) FROM products WHERE status='pending'")).rows[0].count,
        approved: (await pool.query("SELECT COUNT(*) FROM products WHERE status='approved'")).rows[0].count,
      };
      res.json(stats);
    } catch (error) {
      console.error("Error fetching dashboard:", error);
      res.status(500).json({ error: "Failed to fetch dashboard data" });
    }
  },

  // ✅ Product Approvals (keeping for backward compatibility, but productController is preferred)
  async approveProduct(req, res) {
    try {
      const updated = await ProductModel.approveProduct(req.params.id);
      res.json(updated);
    } catch (error) {
      console.error("Error approving product:", error);
      res.status(500).json({ error: "Failed to approve product" });
    }
  },

  async rejectProduct(req, res) {
    try {
      const updated = await ProductModel.rejectProduct(req.params.id);
      res.json(updated);
    } catch (error) {
      console.error("Error rejecting product:", error);
      res.status(500).json({ error: "Failed to reject product" });
    }
  },

  // ✅ Create User
  async createUser(req, res) {
    try {
      const { name, email, password, phone, role } = req.body;
      
      if (!name || !email || !password || !role) {
        return res.status(400).json({ error: "Name, email, password, and role are required" });
      }

      // Check if user already exists
      const existingUser = await pool.query(
        "SELECT id FROM users WHERE email = $1",
        [email]
      );

      if (existingUser.rows.length > 0) {
        return res.status(400).json({ error: "User with this email already exists" });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Insert user
      const result = await pool.query(
        `INSERT INTO users (name, email, password, phone, role, status)
         VALUES ($1, $2, $3, $4, $5, 'approved')
         RETURNING id, name, email, phone, role, status, created_at`,
        [name, email, hashedPassword, phone || null, role]
      );

      // Log admin action
      await pool.query(
        `INSERT INTO admin_activity_log (admin_id, action, entity_type, entity_id)
         VALUES ($1, 'User created', 'user', $2)`,
        [req.user.id, result.rows[0].id]
      );

      res.status(201).json({ message: "User created successfully", user: result.rows[0] });
    } catch (error) {
      console.error("Error creating user:", error);
      res.status(500).json({ error: "Failed to create user" });
    }
  },

  // ✅ Update User
  async updateUser(req, res) {
    try {
      const { id } = req.params;
      const { name, email, phone, status } = req.body;

      const updates = [];
      const params = [];
      let paramCount = 1;

      if (name) {
        updates.push(`name = $${paramCount++}`);
        params.push(name);
      }
      if (email) {
        updates.push(`email = $${paramCount++}`);
        params.push(email);
      }
      if (phone !== undefined) {
        updates.push(`phone = $${paramCount++}`);
        params.push(phone);
      }
      if (status) {
        updates.push(`status = $${paramCount++}`);
        params.push(status);
      }

      if (updates.length === 0) {
        return res.status(400).json({ error: "No fields to update" });
      }

      params.push(id);
      const result = await pool.query(
        `UPDATE users 
         SET ${updates.join(', ')}
         WHERE id = $${paramCount} AND role != 'admin'
         RETURNING id, name, email, phone, role, status, created_at`,
        params
      );

      if (result.rowCount === 0) {
        return res.status(404).json({ error: "User not found or cannot be updated" });
      }

      // Log admin action
      await pool.query(
        `INSERT INTO admin_activity_log (admin_id, action, entity_type, entity_id)
         VALUES ($1, 'User updated', 'user', $2)`,
        [req.user.id, id]
      );

      res.json({ message: "User updated successfully", user: result.rows[0] });
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ error: "Failed to update user" });
    }
  },

  // ✅ Update User Role
  async updateUserRole(req, res) {
    try {
      const { id } = req.params;
      const { role } = req.body;

      if (!role || !['company_products', 'seller_products', 'admin', 'superadmin', 'moderator', 'viewer'].includes(role)) {
        return res.status(400).json({ error: "Valid role (company_products, seller_products, admin) is required" });
      }

      const result = await pool.query(
        `UPDATE users 
         SET role = $1 
         WHERE id = $2 AND role != 'admin'
         RETURNING id, name, email, role, status`,
        [role, id]
      );

      if (result.rowCount === 0) {
        return res.status(404).json({ error: "User not found or cannot be updated" });
      }

      // Log admin action
      await pool.query(
        `INSERT INTO admin_activity_log (admin_id, action, entity_type, entity_id, details)
         VALUES ($1, 'User role updated', 'user', $2, $3)`,
        [req.user.id, id, JSON.stringify({ new_role: role })]
      );

      res.json({ message: "User role updated successfully", user: result.rows[0] });
    } catch (error) {
      console.error("Error updating user role:", error);
      res.status(500).json({ error: "Failed to update user role" });
    }
  },
};
