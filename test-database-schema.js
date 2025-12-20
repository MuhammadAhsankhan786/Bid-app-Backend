/**
 * Database Schema Test
 * Tests if required tables and columns exist
 */

import pool from './src/config/db.js';

async function testDatabaseSchema() {
  console.log('🔍 Testing Database Schema...\n');
  console.log('='.repeat(80));
  
  const checks = [
    { name: 'products table', query: "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'products')" },
    { name: 'categories table', query: "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'categories')" },
    { name: 'users table', query: "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users')" },
    { name: 'orders table', query: "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'orders')" },
    { name: 'products.category_id column', query: "SELECT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'category_id')" },
    { name: 'categories.id column', query: "SELECT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'categories' AND column_name = 'id')" },
    { name: 'categories.name column', query: "SELECT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'categories' AND column_name = 'name')" },
  ];
  
  console.log('\n📋 Checking Tables and Columns...\n');
  
  for (const check of checks) {
    try {
      const result = await pool.query(check.query);
      const exists = result.rows[0].exists;
      console.log(`   ${exists ? '✅' : '❌'} ${check.name}: ${exists ? 'EXISTS' : 'MISSING'}`);
    } catch (error) {
      console.log(`   ❌ ${check.name}: ERROR - ${error.message}`);
    }
  }
  
  // Test actual queries
  console.log('\n📋 Testing Actual Queries...\n');
  
  // Test 1: Simple products query
  try {
    const result = await pool.query('SELECT COUNT(*) as count FROM products');
    console.log(`   ✅ Products count query: ${result.rows[0].count} products`);
  } catch (error) {
    console.log(`   ❌ Products count query: ${error.message}`);
  }
  
  // Test 2: Products with categories JOIN
  try {
    const result = await pool.query(`
      SELECT p.id, p.title, c.name as category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LIMIT 5
    `);
    console.log(`   ✅ Products with categories JOIN: ${result.rows.length} rows`);
    if (result.rows.length > 0) {
      console.log(`      Sample: ${JSON.stringify(result.rows[0], null, 2)}`);
    }
  } catch (error) {
    console.log(`   ❌ Products with categories JOIN: ${error.message}`);
    console.log(`      Error code: ${error.code}`);
    console.log(`      Error detail: ${error.detail}`);
  }
  
  // Test 3: Categories table
  try {
    const result = await pool.query('SELECT COUNT(*) as count FROM categories');
    console.log(`   ✅ Categories count: ${result.rows[0].count} categories`);
  } catch (error) {
    console.log(`   ❌ Categories count: ${error.message}`);
  }
  
  // Test 4: Orders query
  try {
    const result = await pool.query(`
      SELECT o.*, p.title as product_name
      FROM orders o
      LEFT JOIN products p ON o.product_id = p.id
      LIMIT 5
    `);
    console.log(`   ✅ Orders with products JOIN: ${result.rows.length} rows`);
  } catch (error) {
    console.log(`   ❌ Orders with products JOIN: ${error.message}`);
    console.log(`      Error code: ${error.code}`);
    console.log(`      Error detail: ${error.detail}`);
  }
  
  console.log('\n');
  console.log('='.repeat(80));
  console.log('Test Complete!');
  console.log('='.repeat(80));
  
  process.exit(0);
}

testDatabaseSchema().catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});

