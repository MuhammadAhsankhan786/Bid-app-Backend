import pool from "../config/db.js";

export const NotificationsController = {
  // GET /api/notifications
  async getNotifications(req, res) {
    try {
      const userId = req.user.id;
      const { read, limit = 50 } = req.query;

      let query = `
        SELECT * FROM notifications
        WHERE user_id = $1
      `;
      const params = [userId];

      if (read !== undefined) {
        query += ` AND is_read = $2`;
        params.push(read === 'true');
      }

      query += ` ORDER BY created_at DESC LIMIT $${params.length + 1}`;
      params.push(parseInt(limit));

      const result = await pool.query(query, params);

      res.json({
        success: true,
        data: result.rows
      });
    } catch (error) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error"
      });
    }
  },

  // PATCH /api/notifications/read/:id
  async markAsRead(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      // Verify notification belongs to user
      const notificationResult = await pool.query(
        "SELECT id FROM notifications WHERE id = $1 AND user_id = $2",
        [id, userId]
      );

      if (notificationResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Notification not found"
        });
      }

      // Update notification
      const result = await pool.query(
        "UPDATE notifications SET is_read = true WHERE id = $1 RETURNING *",
        [id]
      );

      res.json({
        success: true,
        message: "Notification marked as read",
        data: result.rows[0]
      });
    } catch (error) {
      console.error("Error updating notification:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error"
      });
    }
  },

  // ✅ Get All Notifications (Admin)
  async getAllNotifications(req, res) {
    try {
      const { read, user_id, limit = 100, page = 1 } = req.query;

      let query = `
        SELECT 
          n.*,
          u.name as user_name,
          u.email as user_email
        FROM notifications n
        LEFT JOIN users u ON n.user_id = u.id
        WHERE 1=1
      `;
      const params = [];
      let paramCount = 1;

      if (read !== undefined) {
        query += ` AND n.is_read = $${paramCount++}`;
        params.push(read === 'true');
      }

      if (user_id) {
        query += ` AND n.user_id = $${paramCount++}`;
        params.push(user_id);
      }

      query += ` ORDER BY n.created_at DESC LIMIT $${paramCount++} OFFSET $${paramCount}`;
      params.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit));

      const result = await pool.query(query, params);

      // Get total count
      let countQuery = `
        SELECT COUNT(*) as count
        FROM notifications n
        WHERE 1=1
      `;
      const countParams = [];
      let countParamCount = 1;

      if (read !== undefined) {
        countQuery += ` AND n.is_read = $${countParamCount++}`;
        countParams.push(read === 'true');
      }

      if (user_id) {
        countQuery += ` AND n.user_id = $${countParamCount++}`;
        countParams.push(user_id);
      }

      const countResult = await pool.query(countQuery, countParams);

      res.json({
        success: true,
        data: result.rows,
        pagination: {
          total: parseInt(countResult.rows[0].count),
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(parseInt(countResult.rows[0].count) / parseInt(limit))
        }
      });
    } catch (error) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error"
      });
    }
  },

  // GET /api/notifications/settings
  async getSettings(req, res) {
    try {
      const userId = req.user.id;
      const result = await pool.query(
        "SELECT notification_preferences FROM users WHERE id = $1",
        [userId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, message: "User not found" });
      }

      // Default settings if null
      const defaultSettings = {
        email_notifications: true,
        product_approvals: true,
        user_reports: true,
        high_value_bids: true,
        system_updates: true,
        security_alerts: true
      };

      res.json({
        success: true,
        data: result.rows[0].notification_preferences || defaultSettings
      });
    } catch (error) {
      console.error("Error fetching settings:", error);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  // PUT /api/notifications/settings
  async updateSettings(req, res) {
    try {
      const userId = req.user.id;
      const settings = req.body;

      // Merge with existing settings or defaults
      const currentResult = await pool.query(
        "SELECT notification_preferences FROM users WHERE id = $1",
        [userId]
      );

      const currentSettings = currentResult.rows[0]?.notification_preferences || {};
      const newSettings = { ...currentSettings, ...settings };

      const result = await pool.query(
        "UPDATE users SET notification_preferences = $1 WHERE id = $2 RETURNING notification_preferences",
        [newSettings, userId]
      );

      res.json({
        success: true,
        message: "Notification settings updated",
        data: result.rows[0].notification_preferences
      });
    } catch (error) {
      console.error("Error updating settings:", error);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  }
};

