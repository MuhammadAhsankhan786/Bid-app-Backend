/**
 * Script to check production database schema
 * Run this to verify required columns exist before deploying
 */

import pool from './src/config/db.js';

async function checkProductionSchema() {
  console.log('🔍 Checking Production Database Schema...\n');
  
  try {
    // Check products table columns
    const columns = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = 'products'
      AND column_name IN ('id', 'status', 'duration', 'auction_end_time', 'approved_at', 'rejection_reason', 'updated_at', 'seller_id')
      ORDER BY column_name
    `);
    
    console.log('📋 Products Table - Required Columns:');
    console.log('─'.repeat(60));
    
    const requiredColumns = {
      'id': false,
      'status': false,
      'duration': false,
      'auction_end_time': false,
      'approved_at': false,
      'rejection_reason': false,
      'updated_at': false,
      'seller_id': false
    };
    
    columns.rows.forEach(col => {
      requiredColumns[col.column_name] = true;
      const status = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
      console.log(`  ✅ ${col.column_name.padEnd(20)} ${col.data_type.padEnd(15)} ${status}`);
    });
    
    console.log('\n');
    console.log('⚠️  Missing Columns:');
    console.log('─'.repeat(60));
    
    let hasMissing = false;
    Object.entries(requiredColumns).forEach(([col, exists]) => {
      if (!exists) {
        hasMissing = true;
        console.log(`  ❌ ${col} - MISSING`);
      }
    });
    
    if (!hasMissing) {
      console.log('  ✅ All required columns exist!');
    }
    
    // Check sample product
    console.log('\n');
    console.log('📦 Sample Product Check:');
    console.log('─'.repeat(60));
    
    const sampleProduct = await pool.query(`
      SELECT id, title, status, duration, seller_id, 
             auction_end_time, approved_at, rejection_reason
      FROM products
      LIMIT 1
    `);
    
    if (sampleProduct.rows.length > 0) {
      const product = sampleProduct.rows[0];
      console.log(`  Product ID: ${product.id}`);
      console.log(`  Title: ${product.title}`);
      console.log(`  Status: ${product.status}`);
      console.log(`  Duration: ${product.duration || 'NULL'}`);
      console.log(`  Seller ID: ${product.seller_id || 'NULL (Company Product)'}`);
      console.log(`  Auction End Time: ${product.auction_end_time || 'NULL'}`);
      console.log(`  Approved At: ${product.approved_at || 'NULL'}`);
      console.log(`  Rejection Reason: ${product.rejection_reason || 'NULL'}`);
    } else {
      console.log('  ⚠️  No products found in database');
    }
    
    // Test column check query (same as in approveProduct)
    console.log('\n');
    console.log('🧪 Testing Column Check Queries:');
    console.log('─'.repeat(60));
    
    try {
      const auctionEndCheck = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_schema = 'public'
          AND table_name = 'products' 
          AND column_name = 'auction_end_time'
        ) as exists
      `);
      console.log(`  ✅ auction_end_time check: ${auctionEndCheck.rows[0].exists}`);
    } catch (err) {
      console.log(`  ❌ auction_end_time check failed: ${err.message}`);
    }
    
    try {
      const approvedAtCheck = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_schema = 'public'
          AND table_name = 'products' 
          AND column_name = 'approved_at'
        ) as exists
      `);
      console.log(`  ✅ approved_at check: ${approvedAtCheck.rows[0].exists}`);
    } catch (err) {
      console.log(`  ❌ approved_at check failed: ${err.message}`);
    }
    
    console.log('\n');
    console.log('✅ Schema check complete!');
    
  } catch (error) {
    console.error('❌ Error checking schema:', error);
    console.error('   Message:', error.message);
    console.error('   Code:', error.code);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

checkProductionSchema();




