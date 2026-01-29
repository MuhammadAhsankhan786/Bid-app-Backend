import pool from "../config/db.js";

async function checkUsersColumns() {
  try {
    const result = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'users' 
        AND column_name = 'bids_count'
    `);
    
    if (result.rows.length === 0) {
      console.log('❌ bids_count column does NOT exist in users table');
      console.log('\n🔧 Adding bids_count column...');
      
      await pool.query(`
        ALTER TABLE users 
        ADD COLUMN IF NOT EXISTS bids_count INTEGER DEFAULT 0
      `);
      
      console.log('✅ Added bids_count column');
    } else {
      console.log('✅ bids_count column exists:', result.rows[0]);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

checkUsersColumns();


