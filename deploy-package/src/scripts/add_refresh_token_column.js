import pool from "../config/db.js";
import dotenv from "dotenv";
import fs from "fs";

dotenv.config();

async function addRefreshTokenColumn() {
  try {
    console.log('🔍 Checking for refresh_token column...');
    
    // Check if column exists
    const checkResult = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'refresh_token'
    `);
    
    if (checkResult.rows.length > 0) {
      console.log('✅ refresh_token column already exists');
      return;
    }
    
    console.log('📝 Adding refresh_token column...');
    
    // Add column
    await pool.query(`
      ALTER TABLE users 
      ADD COLUMN refresh_token TEXT
    `);
    
    console.log('✅ refresh_token column added successfully');
    
    // Add index for faster lookups
    try {
      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_users_refresh_token 
        ON users(refresh_token) 
        WHERE refresh_token IS NOT NULL
      `);
      console.log('✅ Index created on refresh_token');
    } catch (indexError) {
      console.log('⚠️  Index creation skipped (may already exist)');
    }
    
  } catch (error) {
    console.error('❌ Error adding refresh_token column:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

addRefreshTokenColumn()
  .then(() => {
    console.log('✅ Migration complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  });

