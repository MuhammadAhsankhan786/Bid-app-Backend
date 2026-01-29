import pool from "../config/db.js";
import dotenv from "dotenv";

dotenv.config();

/**
 * Database Schema Fix Script
 * Ensures current_bid column exists in products table
 */

async function fixDatabaseSchema() {
  try {
    console.log('🔧 Starting Database Schema Fix...\n');
    console.log('='.repeat(60));

    // Test database connection
    console.log('📊 Testing database connection...');
    const connectionTest = await pool.query('SELECT NOW() as current_time');
    console.log('✅ Database connection: SUCCESS');
    console.log(`   Current DB Time: ${connectionTest.rows[0].current_time}\n`);

    // Check if products table exists
    console.log('📋 Checking products table...');
    const tableExists = await pool.query(
      `SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'products'
      )`
    );

    if (!tableExists.rows[0].exists) {
      console.error('❌ Products table does not exist!');
      console.error('   Please run migrations first.');
      await pool.end();
      process.exit(1);
    }
    console.log('✅ Table \'products\': EXISTS');

    // Check if current_bid column exists
    console.log('\n🔍 Checking current_bid column...');
    const columnExists = await pool.query(
      `SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'products' 
        AND column_name = 'current_bid'
      )`
    );

    if (columnExists.rows[0].exists) {
      console.log('✅ Column \'current_bid\': EXISTS');
      
      // Check column properties
      const columnInfo = await pool.query(
        `SELECT 
          column_name,
          data_type,
          numeric_precision,
          numeric_scale,
          column_default,
          is_nullable
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'products' 
        AND column_name = 'current_bid'`
      );

      const col = columnInfo.rows[0];
      console.log(`   Data Type: ${col.data_type}${col.numeric_precision ? `(${col.numeric_precision},${col.numeric_scale})` : ''}`);
      console.log(`   Default Value: ${col.column_default || 'NULL'}`);
      console.log(`   Nullable: ${col.is_nullable}`);
    } else {
      console.log('⚠️  Column \'current_bid\': MISSING');
      console.log('   Adding column...');

      // Add current_bid column
      await pool.query(`
        ALTER TABLE products 
        ADD COLUMN current_bid NUMERIC(10,2) DEFAULT 0
      `);

      console.log('✅ Column \'current_bid\': ADDED');
      console.log('   Type: NUMERIC(10,2)');
      console.log('   Default: 0');

      // Update existing records to set current_bid = current_price if current_price exists
      const updateResult = await pool.query(`
        UPDATE products 
        SET current_bid = COALESCE(current_price, starting_price, starting_bid, 0)
        WHERE current_bid IS NULL OR current_bid = 0
      `);
      console.log(`   Updated ${updateResult.rowCount} existing records`);
    }

    // Verify column is working
    console.log('\n🧪 Testing column access...');
    const testQuery = await pool.query(`
      SELECT 
        id,
        title,
        starting_price,
        current_bid,
        current_price,
        starting_bid
      FROM products 
      WHERE status = 'approved'
      LIMIT 3
    `);

    console.log(`✅ Test query successful: Retrieved ${testQuery.rows.length} products`);
    if (testQuery.rows.length > 0) {
      console.log('\n📋 Sample products with current_bid:');
      testQuery.rows.forEach((product, index) => {
        console.log(`   ${index + 1}. ${product.title}`);
        console.log(`      Starting Price: $${product.starting_price || 'N/A'}`);
        console.log(`      Current Bid: $${product.current_bid || '0'}`);
        console.log(`      Current Price: $${product.current_price || 'N/A'}`);
        console.log(`      Starting Bid: $${product.starting_bid || 'N/A'}`);
        console.log('');
      });
    }

    console.log('✅ Database schema fix completed successfully!\n');
    await pool.end();
  } catch (error) {
    console.error('\n❌ Database schema fix failed:');
    console.error(`   Error: ${error.message}`);
    console.error(`   Code: ${error.code}`);
    console.error(`   Stack: ${error.stack}`);
    await pool.end();
    process.exit(1);
  }
}

fixDatabaseSchema();

