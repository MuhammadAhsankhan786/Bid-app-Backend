import { UserModel } from "../models/userModel.js";
import { ProductModel } from "../models/productModel.js";
import pool from "../config/db.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

export const AdminController = {
  // ✅ Admin Login
  async login(req, res) {
    const { email, password } = req.body;
    const user = await UserModel.findByEmail(email);

    if (!user || user.role !== "admin")
      return res.status(400).json({ message: "Invalid credentials" });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(400).json({ message: "Invalid credentials" });

    

    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    res.json({
      token,
      admin: { id: user.id, name: user.name, email: user.email }
    });
  },

  // ✅ Get All Users (excluding admins)
  async getUsers(req, res) {
    try {
      const { search, status, role, page = 1, limit = 20 } = req.query;
      
      let query = `
        SELECT 
          id, name, email, phone, role, status, bids_count, created_at
        FROM users 
        WHERE role != 'admin'
      `;
      const params = [];
      let paramCount = 1;

      if (search) {
        query += ` AND (name ILIKE $${paramCount++} OR email ILIKE $${paramCount++})`;
        params.push(`%${search}%`, `%${search}%`);
      }

      if (status) {
        query += ` AND status = $${paramCount++}`;
        params.push(status);
      }

      if (role) {
        query += ` AND role = $${paramCount++}`;
        params.push(role);
      }

      query += ` ORDER BY created_at DESC LIMIT $${paramCount++} OFFSET $${paramCount}`;
      params.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit));

      const result = await pool.query(query, params);
      const countResult = await pool.query(`
        SELECT COUNT(*) FROM users 
        WHERE role != 'admin'
        ${search ? `AND (name ILIKE '%${search}%' OR email ILIKE '%${search}%')` : ''}
        ${status ? `AND status = '${status}'` : ''}
        ${role ? `AND role = '${role}'` : ''}
      `);

      res.json({
        users: result.rows,
        pagination: {
          total: parseInt(countResult.rows[0].count),
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(countResult.rows[0].count / limit)
        }
      });
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ error: "Failed to fetch users" });
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

      // Log admin action
      await pool.query(
        `INSERT INTO admin_activity_log (admin_id, action, entity_type, entity_id)
         VALUES ($1, 'User deleted', 'user', $2)`,
        [req.user.id, id]
      );

      res.json({ message: "User deleted successfully" });
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ error: "Failed to delete user" });
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

      // Log admin action
      await pool.query(
        `INSERT INTO admin_activity_log (admin_id, action, entity_type, entity_id)
         VALUES ($1, 'User approved', 'user', $2)`,
        [req.user.id, id]
      );

      res.json({ message: "User approved successfully", user: result.rows[0] });
    } catch (error) {
      console.error("Error approving user:", error);
      res.status(500).json({ error: "Failed to approve user" });
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

      // Log admin action
      await pool.query(
        `INSERT INTO admin_activity_log (admin_id, action, entity_type, entity_id)
         VALUES ($1, 'User blocked', 'user', $2)`,
        [req.user.id, id]
      );

      res.json({ message: "User blocked successfully", user: result.rows[0] });
    } catch (error) {
      console.error("Error blocking user:", error);
      res.status(500).json({ error: "Failed to block user" });
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
};
