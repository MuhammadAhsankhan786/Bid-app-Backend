import pool from '../config/db.js';
import dotenv from 'dotenv';

dotenv.config();

async function checkSchema() {
  try {
    console.log('🔍 Checking database schema...\n');
    
    // Check users table
    const usersCheck = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      ORDER BY ordinal_position;
    `);
    
    console.log('📊 USERS table columns:');
    console.table(usersCheck.rows);
    
    // Check products table
    const productsCheck = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'products' 
      ORDER BY ordinal_position;
    `);
    
    console.log('\n📊 PRODUCTS table columns:');
    console.table(productsCheck.rows);
    
    // Check if auctions table exists
    const auctionsCheck = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'auctions' 
      ORDER BY ordinal_position;
    `);
    
    if (auctionsCheck.rows.length > 0) {
      console.log('\n📊 AUCTIONS table columns:');
      console.table(auctionsCheck.rows);
    } else {
      console.log('\n❌ AUCTIONS table does not exist');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error checking schema:', error.message);
    process.exit(1);
  }
}

checkSchema();
