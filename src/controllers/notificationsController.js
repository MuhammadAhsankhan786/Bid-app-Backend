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
        query += ` AND read = $2`;
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
        "UPDATE notifications SET read = true WHERE id = $1 RETURNING *",
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
  }
};

