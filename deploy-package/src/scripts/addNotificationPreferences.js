import pool from "../config/db.js";

async function addNotificationPreferences() {
    try {
        // Check if column exists
        const check = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'notification_preferences'
    `);

        if (check.rows.length === 0) {
            console.log("Adding notification_preferences column...");
            await pool.query(`
        ALTER TABLE users 
        ADD COLUMN notification_preferences JSONB DEFAULT '{
          "email_notifications": true,
          "product_approvals": true,
          "user_reports": true,
          "high_value_bids": true,
          "system_updates": true,
          "security_alerts": true
        }'
      `);
            console.log("Column added successfully!");
        } else {
            console.log("notification_preferences column already exists.");
        }

        process.exit(0);
    } catch (error) {
        console.error("Error:", error.message);
        process.exit(1);
    }
}

addNotificationPreferences();
