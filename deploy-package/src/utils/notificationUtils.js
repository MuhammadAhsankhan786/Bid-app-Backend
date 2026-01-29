import pool from "../config/db.js";

/**
 * Send a notification to all admin users (superadmin, admin, moderator)
 * @param {string} title - Notification title
 * @param {string} message - Notification message body
 * @param {string} type - Notification type (order, product, user, system)
 * @param {string|number} relatedId - ID of the related entity (optional)
 * @returns {Promise<void>}
 */
export async function notifyAdmins(title, message, type, relatedId = null) {
    try {
        // Get all admin users
        // diverse roles: 'admin', 'superadmin', 'super-admin', 'moderator'
        const adminResult = await pool.query(
            "SELECT id FROM users WHERE role IN ('admin', 'superadmin', 'super-admin', 'moderator')"
        );

        if (adminResult.rows.length === 0) {
            console.warn('⚠️ [notifyAdmins] No admins found to notify');
            return;
        }

        const values = [];
        const created_at = new Date().toISOString();

        // Construct bulk insert query or loop
        // Looping is safer for now to handle individual errors if needed, 
        // but a single query is better for performance. 
        // Given low volume of admins, loop is fine.

        for (const admin of adminResult.rows) {
            try {
                await pool.query(
                    `INSERT INTO notifications (title, message, user_id, type, is_read, created_at)
           VALUES ($1, $2, $3, $4, false, $5)`,
                    [title, message, admin.id, type, created_at]
                );
            } catch (err) {
                // Fallback for schema issues (missing 'type' or 'title' columns)
                if (err.code === '42703' || err.message.includes('column')) {
                    await pool.query(
                        `INSERT INTO notifications (message, user_id, is_read, created_at)
               VALUES ($1, $2, false, $3)`,
                        [message, admin.id, created_at]
                    );
                } else {
                    console.error(`❌ [notifyAdmins] Failed to notify admin ${admin.id}:`, err.message);
                }
            }
        }

        console.log(`✅ [notifyAdmins] Sent "${type}" notification to ${adminResult.rows.length} admins`);
    } catch (error) {
        console.error('❌ [notifyAdmins] Error:', error.message);
    }
}
