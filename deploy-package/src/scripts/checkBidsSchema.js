import pool from '../config/db.js';
import dotenv from 'dotenv';

dotenv.config();

async function checkSchema() {
  try {
    const bidsResult = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'bids' 
      ORDER BY ordinal_position;
    `);
    
    console.log('BIDS table columns:');
    console.table(bidsResult.rows);
    
    const notificationsResult = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'notifications' 
      ORDER BY ordinal_position;
    `);
    
    console.log('\nNOTIFICATIONS table columns:');
    console.table(notificationsResult.rows);
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkSchema();

