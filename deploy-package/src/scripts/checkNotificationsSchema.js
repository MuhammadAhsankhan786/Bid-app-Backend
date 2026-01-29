import pool from "../config/db.js";
import dotenv from "dotenv";

dotenv.config();

async function checkNotificationsSchema() {
  try {
    const result = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'notifications' 
      ORDER BY ordinal_position
    `);
    
    console.log("Notifications table columns:");
    result.rows.forEach(row => {
      console.log(`  ${row.column_name} - ${row.data_type}`);
    });
    
    await pool.end();
  } catch (error) {
    console.error("Error:", error.message);
    await pool.end();
  }
}

checkNotificationsSchema();

