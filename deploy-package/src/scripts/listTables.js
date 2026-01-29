import pool from '../config/db.js';
import dotenv from 'dotenv';

dotenv.config();

async function listTables() {
  try {
    console.log('📋 Listing all tables in public schema...\n');
    
    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);
    
    if (result.rows.length === 0) {
      console.log('No tables found in the public schema.');
    } else {
      console.log(`Found ${result.rows.length} table(s):\n`);
      result.rows.forEach((row, index) => {
        console.log(`${index + 1}. ${row.table_name}`);
      });
      console.log('\n');
      console.table(result.rows);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error listing tables:', error.message);
    console.error('   Error details:', error);
    process.exit(1);
  }
}

listTables();

