import pool from "../config/db.js";
import dotenv from "dotenv";

dotenv.config();

async function checkOrdersSchema() {
  try {
    const result = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'orders' 
      ORDER BY ordinal_position
    `);
    
    console.log("Orders table columns:");
    result.rows.forEach(row => {
      console.log(`  ${row.column_name} - ${row.data_type}`);
    });
    
    await pool.end();
  } catch (error) {
    console.error("Error:", error.message);
    await pool.end();
  }
}

checkOrdersSchema();

