import pool from '../config/db.js';
import dotenv from 'dotenv';

dotenv.config();

async function queryUsers() {
  try {
    console.log('🔍 Querying users table...\n');
    
    const result = await pool.query('SELECT * FROM users;');
    
    if (result.rows.length === 0) {
      console.log('No users found in the database.');
    } else {
      console.log(`Found ${result.rows.length} user(s):\n`);
      console.table(result.rows);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error querying users:', error.message);
    console.error('   Error details:', error);
    process.exit(1);
  }
}

queryUsers();

