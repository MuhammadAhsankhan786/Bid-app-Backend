import { UserModel } from "../models/userModel.js";
import { ProductModel } from "../models/productModel.js";
import pool from "../config/db.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { normalizeIraqPhone, isValidIraqPhone } from "../utils/phoneUtils.js";

export const AdminController = {
  // ✅ Admin Login (supports superadmin, moderator, viewer roles)
  async login(req, res) {
    const { email, password } = req.body;
    const user = await UserModel.findByEmail(email);

    // Check if user exists and has admin role (superadmin, moderator, viewer, employee, or legacy admin)
    const allowedRoles = ['admin', 'superadmin', 'moderator', 'viewer', 'employee'];
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
        whereConditions.push(`(u.name ILIKE $${paramCount++} OR u.email ILIKE $${paramCount++} OR u.phone ILIKE $${paramCount++})`);
        params.push(`%${search}%`, `%${search}%`, `%${search}%`);
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
      const adminRoles = ['admin', 'superadmin', 'moderator', 'viewer', 'employee'];
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

      console.log('📋 [createUser] Creating user:', { name, email, role });

      if (!name || !email || !password || !role) {
        return res.status(400).json({ error: "Name, email, password, and role are required" });
      }

      // Normalize phone number if provided
      let normalizedPhone = null;
      if (phone) {
        normalizedPhone = normalizeIraqPhone(phone);
        if (!normalizedPhone || !isValidIraqPhone(normalizedPhone)) {
          return res.status(400).json({
            error: `Invalid phone number format. Use Iraq format: +964XXXXXXXXXX (9-10 digits after +964). Received: ${phone}`
          });
        }
      }

      // Check if user already exists (by email or phone - using normalized phone)
      const existingUser = await pool.query(
        "SELECT id FROM users WHERE email = $1 OR phone = $2",
        [email, normalizedPhone || '']
      );

      if (existingUser.rows.length > 0) {
        return res.status(400).json({ error: "User with this email or phone already exists" });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // FIX: Insert user with safe defaults - use 'approved' directly instead of COALESCE subquery
      // Use normalized phone for database storage
      const result = await pool.query(
        `INSERT INTO users (name, email, password, phone, role, status, created_at)
         VALUES ($1, $2, $3, $4, $5, 'approved', CURRENT_TIMESTAMP)
         RETURNING id, name, email, phone, role, status, created_at`,
        [name, email, hashedPassword, normalizedPhone, role]
      );

      // NULL-safe: Check if result has rows before accessing
      if (!result.rows || result.rows.length === 0) {
        console.error("❌ [createUser] User insert returned no rows");
        return res.status(500).json({ error: "Failed to create user - no data returned" });
      }

      console.log('✅ [createUser] User created:', result.rows[0].id);

      // FIX: Log admin action only if table exists (don't fail if it doesn't)
      try {
        const tableCheck = await pool.query(
          `SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'admin_activity_log'
          )`
        );

        if (tableCheck.rows?.[0]?.exists && req.user?.id) {
          await pool.query(
            `INSERT INTO admin_activity_log (admin_id, action, entity_type, entity_id)
             VALUES ($1, 'User created', 'user', $2)`,
            [req.user.id, result.rows[0].id]
          );
        }
      } catch (logError) {
        console.warn("⚠️ [createUser] Could not log admin action:", logError.message);
        // Continue even if logging fails
      }

      res.status(201).json({ message: "User created successfully", user: result.rows[0] });
    } catch (error) {
      console.error("❌ [createUser] Error creating user:", error);
      console.error("   Error message:", error.message);
      console.error("   Error code:", error.code);
      console.error("   Error detail:", error.detail);
      console.error("   Error constraint:", error.constraint);
      console.error("   Error stack:", error.stack);
      res.status(500).json({
        error: "Failed to create user",
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
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

      // Add id to params - it will be the last parameter
      params.push(id);
      const idParamNum = paramCount; // This is correct - id is at position paramCount

      console.log('📋 [updateUser] Update query:', {
        updates: updates.join(', '),
        params: params,
        idParamNum: idParamNum,
        userId: id
      });

      // CRITICAL: Check if user is trying to update phone number for superadmin/moderator
      // These roles have fixed phone numbers for login security
      if (phone !== undefined) {
        // STEP 1: Sanitize phone number before validation
        const normalizedPhone = normalizeIraqPhone(phone);

        // STEP 2: Validate phone format
        if (!normalizedPhone || !isValidIraqPhone(normalizedPhone)) {
          return res.status(400).json({
            error: `Invalid phone number format. Use Iraq format: +964XXXXXXXXXX (9-10 digits after +964). Received: ${phone}`
          });
        }

        // STEP 3: Check if target user is protected role
        const userCheck = await pool.query(
          `SELECT role FROM users WHERE id = $1`,
          [id]
        );

        if (userCheck.rows.length > 0) {
          const userRole = (userCheck.rows[0].role || '').toLowerCase().trim();
          if (userRole === 'superadmin' || userRole === 'admin' || userRole === 'moderator') {
            return res.status(403).json({
              error: "Cannot update phone number for Super Admin or Moderator. Phone number is fixed for login security."
            });
          }
        }

        // STEP 4: Use normalized phone for update
        // Replace phone in params array with normalized version
        const phoneIndex = updates.findIndex(u => u.includes('phone'));
        if (phoneIndex !== -1) {
          const paramIndex = phoneIndex; // phone is at this position in params array
          params[paramIndex] = normalizedPhone;
        }
      }

      // Build WHERE clause - allow updating non-admin users
      // Only prevent updating admin/superadmin, allow others (moderator, viewer, employee can be updated)
      const result = await pool.query(
        `UPDATE users 
         SET ${updates.join(', ')}
         WHERE id = $${idParamNum} AND role NOT IN ('admin', 'superadmin')
         RETURNING id, name, email, phone, role, status, created_at`,
        params
      );

      if (!result.rows || result.rows.length === 0) {
        return res.status(404).json({ error: "User not found or cannot be updated" });
      }

      // Log admin action (NULL-safe)
      try {
        const tableCheck = await pool.query(
          `SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'admin_activity_log'
          )`
        );

        if (tableCheck.rows?.[0]?.exists && req.user?.id) {
          await pool.query(
            `INSERT INTO admin_activity_log (admin_id, action, entity_type, entity_id)
             VALUES ($1, 'User updated', 'user', $2)`,
            [req.user.id, id]
          );
        }
      } catch (logError) {
        console.warn("⚠️ [updateUser] Could not log admin action:", logError.message);
      }

      res.json({ message: "User updated successfully", user: result.rows[0] });
    } catch (error) {
      console.error("❌ [updateUser] Error updating user:", error);
      console.error("   Error message:", error.message);
      console.error("   Error code:", error.code);
      console.error("   Error detail:", error.detail);
      console.error("   Error constraint:", error.constraint);
      console.error("   Error stack:", error.stack);

      // Handle specific constraint violations
      if (error.code === '23505') { // Unique violation
        return res.status(400).json({
          error: "Duplicate value - email or phone already exists",
          details: process.env.NODE_ENV === 'development' ? error.detail : undefined
        });
      }

      if (error.code === '23503') { // Foreign key violation
        return res.status(400).json({
          error: "Invalid reference",
          details: process.env.NODE_ENV === 'development' ? error.detail : undefined
        });
      }

      // For other errors, return 500 but with safe response
      res.status(500).json({
        error: "Failed to update user",
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  // ✅ Change Admin Phone Number (Special Endpoint - Only for Superadmin/Moderator)
  async changeAdminPhone(req, res) {
    try {
      const { id } = req.params;
      const { phone, confirmPassword } = req.body;
      const currentUserId = req.user?.id;
      const currentUserRole = (req.user?.role || '').toLowerCase().trim();

      // Only Superadmin can change admin phone numbers
      if (currentUserRole !== 'superadmin' && currentUserRole !== 'super-admin') {
        return res.status(403).json({
          error: "Only Superadmin can change admin phone numbers"
        });
      }

      // Validate phone number is provided
      if (!phone || phone.trim() === '') {
        console.warn(`❌ [changeAdminPhone] Phone number missing`);
        return res.status(400).json({ error: "Phone number is required" });
      }

      // STEP 1: Sanitize phone number (remove spaces, hyphens, etc.)
      const normalizedPhone = normalizeIraqPhone(phone);
      console.log(`🔍 [changeAdminPhone] Phone normalized: '${phone}' -> '${normalizedPhone}'`);

      // STEP 2: Validate phone format AFTER sanitization
      if (!normalizedPhone || !isValidIraqPhone(normalizedPhone)) {
        console.warn(`❌ [changeAdminPhone] Invalid phone format: '${normalizedPhone}'`);
        return res.status(400).json({
          error: "Invalid phone number format. Use Iraq format: +964XXXXXXXXXX (9-10 digits after +964). Received: " + phone
        });
      }

      // Get target user
      const userCheck = await pool.query(
        `SELECT id, name, email, phone, role, password FROM users WHERE id = $1`,
        [id]
      );

      if (userCheck.rows.length === 0) {
        return res.status(404).json({ error: "User not found" });
      }

      const targetUser = userCheck.rows[0];
      const targetRole = (targetUser.role || '').toLowerCase().trim();

      // Only allow changing phone for Superadmin/Moderator
      if (targetRole !== 'superadmin' && targetRole !== 'admin' && targetRole !== 'moderator') {
        return res.status(403).json({
          error: "This endpoint is only for changing Superadmin/Moderator phone numbers"
        });
      }

      // STEP 3: Check if phone number already exists (using normalized phone)
      const phoneCheck = await pool.query(
        `SELECT id, name, role FROM users WHERE phone = $1 AND id != $2`,
        [normalizedPhone, id]
      );

      if (phoneCheck.rows.length > 0) {
        return res.status(400).json({
          error: `Phone number already exists for user: ${phoneCheck.rows[0].name} (${phoneCheck.rows[0].role})`
        });
      }

      // STEP 4: Require password confirmation (AFTER phone validation passes)
      if (!confirmPassword) {
        return res.status(400).json({
          error: "Password confirmation is required for security"
        });
      }

      // STEP 5: Verify current user's password
      const currentUserCheck = await pool.query(
        `SELECT password FROM users WHERE id = $1`,
        [currentUserId]
      );

      if (currentUserCheck.rows.length === 0) {
        return res.status(404).json({ error: "Current user not found" });
      }

      const passwordValid = await bcrypt.compare(confirmPassword, currentUserCheck.rows[0].password);
      if (!passwordValid) {
        // Use 403 Forbidden instead of 401 Unauthorized so the frontend interceptor doesn't log the user out
        return res.status(403).json({
          error: "Invalid password confirmation"
        });
      }

      // STEP 6: Update phone number (using normalized phone)
      const result = await pool.query(
        `UPDATE users 
         SET phone = $1, updated_at = NOW()
         WHERE id = $2 AND role IN ('superadmin', 'admin', 'moderator')
         RETURNING id, name, email, phone, role, updated_at`,
        [normalizedPhone, id]
      );

      if (!result.rows || result.rows.length === 0) {
        return res.status(404).json({ error: "Failed to update phone number" });
      }

      // Log admin action
      try {
        const tableCheck = await pool.query(
          `SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'admin_activity_log'
          )`
        );

        if (tableCheck.rows?.[0]?.exists && currentUserId) {
          await pool.query(
            `INSERT INTO admin_activity_log (admin_id, action, entity_type, entity_id, created_at)
             VALUES ($1, $2, 'user', $3, NOW())`,
            [
              currentUserId,
              `Changed ${targetRole} phone number from ${targetUser.phone} to ${normalizedPhone}`,
              id
            ]
          );
        }
      } catch (logError) {
        console.warn("⚠️ [changeAdminPhone] Could not log admin action:", logError.message);
      }

      console.log(`✅ [changeAdminPhone] Phone number changed for ${targetRole}:`, {
        userId: id,
        oldPhone: targetUser.phone,
        newPhone: normalizedPhone,
        changedBy: currentUserId
      });

      res.json({
        success: true,
        message: `${targetRole.charAt(0).toUpperCase() + targetRole.slice(1)} phone number updated successfully`,
        user: result.rows[0]
      });
    } catch (error) {
      console.error("❌ [changeAdminPhone] Error:", error);
      res.status(500).json({
        error: "Failed to change admin phone number",
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  // ✅ Update User Role
  async updateUserRole(req, res) {
    try {
      const { id } = req.params;
      const { role } = req.body;

      if (!role || !['company_products', 'seller_products', 'admin', 'superadmin', 'moderator', 'viewer', 'employee'].includes(role)) {
        return res.status(400).json({
          error: "Valid role is required",
          validRoles: ['company_products', 'seller_products', 'admin', 'superadmin', 'moderator', 'viewer', 'employee']
        });
      }

      console.log(`🔄 [updateUserRole] Attempting to change user ${id} role to ${role}`);

      // First check if user exists and get current role
      const userCheck = await pool.query(
        `SELECT id, role FROM users WHERE id = $1`,
        [id]
      );

      if (userCheck.rows.length === 0) {
        console.log(`❌ [updateUserRole] User ${id} not found`);
        return res.status(404).json({ error: "User not found" });
      }

      const currentRole = userCheck.rows[0].role;
      console.log(`📋 [updateUserRole] User ${id} current role: ${currentRole}`);

      // Check if user is admin (cannot change admin role)
      if (currentRole === 'admin') {
        console.log(`⚠️ [updateUserRole] Cannot change admin user role`);
        return res.status(403).json({ error: "Cannot change admin user role" });
      }

      // Perform update
      const result = await pool.query(
        `UPDATE users 
         SET role = $1 
         WHERE id = $2
         RETURNING id, name, email, role, status`,
        [role, id]
      );

      if (!result.rows || result.rows.length === 0) {
        console.log(`❌ [updateUserRole] Update query returned 0 rows for user ${id}`);
        return res.status(404).json({ error: "User not found or cannot be updated" });
      }

      console.log(`✅ [updateUserRole] User ${id} role updated from ${currentRole} to ${role}`);

      // Log admin action (only if table exists) - NULL-safe
      try {
        const tableCheck = await pool.query(
          `SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'admin_activity_log'
          )`
        );

        if (tableCheck.rows?.[0]?.exists && req.user?.id) {
          await pool.query(
            `INSERT INTO admin_activity_log (admin_id, action, entity_type, entity_id, details)
             VALUES ($1, 'User role updated', 'user', $2, $3)`,
            [req.user.id, id, JSON.stringify({ new_role: role })]
          );
        }
      } catch (logError) {
        // Don't fail the request if logging fails
        console.warn("Failed to log admin activity:", logError.message);
      }

      // NULL-safe: Ensure result.rows[0] exists before accessing
      res.json({
        message: "User role updated successfully",
        user: result.rows[0] || { id, role }
      });
    } catch (error) {
      console.error("Error updating user role:", error);
      console.error("Error stack:", error.stack);
      console.error("Error details:", {
        message: error.message,
        code: error.code,
        detail: error.detail,
        constraint: error.constraint
      });
      res.status(500).json({
        error: "Failed to update user role",
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },
};
