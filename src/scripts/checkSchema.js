import pool from "../config/db.js";
import dotenv from "dotenv";

dotenv.config();

async function checkSchema() {
  try {
    // Check categories table
    const categoriesResult = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'categories' 
      ORDER BY ordinal_position
    `);
    
    console.log("Categories table columns:");
    categoriesResult.rows.forEach(row => {
      console.log(`  ${row.column_name} - ${row.data_type}`);
    });
    
    await pool.end();
  } catch (error) {
    console.error("Error:", error.message);
    await pool.end();
  }
}

checkSchema();

