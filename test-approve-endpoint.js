/**
 * Test script for approve product endpoint
 */

import pool from './src/config/db.js';
import dotenv from 'dotenv';
dotenv.config();

const BASE_URL = process.env.BASE_URL || 'https://api.mazaadati.com/api';
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6NTMsInBob25lIjoiKzk2NDc1MDA5MTQwMDAiLCJyb2xlIjoic3VwZXJhZG1pbiIsInNjb3BlIjoiYWRtaW4iLCJpYXQiOjE3NjYxNzIwNTMsImV4cCI6MTc2Njc3Njg1M30.zQItgDfi6jMB9n0vdk1dkOAxzSr21ksZBr3wC9aoCLQ';

async function testApproveEndpoint() {
  console.log('🧪 Testing Approve Product Endpoint\n');
  console.log('─'.repeat(60));
  
  try {
    // Step 1: Find a pending product
    console.log('\n📋 Step 1: Finding pending product...');
    const pendingResult = await pool.query(`
      SELECT id, title, status, seller_id, duration
      FROM products 
      WHERE status = 'pending' 
      ORDER BY id DESC 
      LIMIT 1
    `);
    
    if (pendingResult.rows.length === 0) {
      console.log('⚠️  No pending products found. Creating test product...');
      
      // Create a test pending product
      const createResult = await pool.query(`
        INSERT INTO products (title, description, starting_price, current_bid, category_id, status, duration, created_at)
        VALUES ('Test Product for Approval', 'Test description', 100, 100, 1, 'pending', 1, CURRENT_TIMESTAMP)
        RETURNING id, title, status
      `);
      
      const testProduct = createResult.rows[0];
      console.log(`✅ Created test product: ID ${testProduct.id}`);
      await testApproveAPI(testProduct.id, testProduct.title);
    } else {
      const product = pendingResult.rows[0];
      console.log(`✅ Found pending product:`);
      console.log(`   ID: ${product.id}`);
      console.log(`   Title: ${product.title}`);
      console.log(`   Status: ${product.status}`);
      console.log(`   Seller ID: ${product.seller_id || 'NULL (Company Product)'}`);
      console.log(`   Duration: ${product.duration || 1} days`);
      
      await testApproveAPI(product.id, product.title);
    }
    
    // Step 2: Test with already approved product (should fail)
    console.log('\n📋 Step 2: Testing with already approved product (should fail)...');
    const approvedResult = await pool.query(`
      SELECT id, title, status
      FROM products 
      WHERE status = 'approved' 
      LIMIT 1
    `);
    
    if (approvedResult.rows.length > 0) {
      const product = approvedResult.rows[0];
      console.log(`   Testing with product ID: ${product.id} (already approved)`);
      await testApproveAPI(product.id, product.title, true);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('   Stack:', error.stack);
  } finally {
    await pool.end();
  }
}

async function testApproveAPI(productId, productTitle, expectFailure = false) {
  const url = `${BASE_URL}/admin/products/approve/${productId}`;
  
  console.log(`\n🔗 Testing: PATCH ${url}`);
  console.log(`   Product: ${productTitle} (ID: ${productId})`);
  
  try {
    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${ADMIN_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({})
    });
    
    const data = await response.json();
    
    console.log(`\n📊 Response Status: ${response.status}`);
    console.log(`📊 Response Data:`, JSON.stringify(data, null, 2));
    
    if (expectFailure) {
      if (response.status === 400 || response.status === 404) {
        console.log('✅ Expected failure - Product already approved (correct behavior)');
      } else {
        console.log('⚠️  Unexpected response for already approved product');
      }
    } else {
      if (response.status === 200 && data.success) {
        console.log('✅ Product approved successfully!');
        console.log(`   New Status: ${data.data?.status}`);
        console.log(`   Approved At: ${data.data?.approved_at || 'N/A'}`);
        console.log(`   Auction End Time: ${data.data?.auction_end_time || 'N/A'}`);
        
        // Verify in database
        const verify = await pool.query(`
          SELECT id, status, approved_at, auction_end_time
          FROM products
          WHERE id = $1
        `, [productId]);
        
        if (verify.rows.length > 0) {
          const product = verify.rows[0];
          console.log('\n✅ Database Verification:');
          console.log(`   Status: ${product.status}`);
          console.log(`   Approved At: ${product.approved_at || 'NULL'}`);
          console.log(`   Auction End Time: ${product.auction_end_time || 'NULL'}`);
        }
      } else {
        console.log('❌ Failed to approve product');
        console.log(`   Error: ${data.message || 'Unknown error'}`);
        if (data.error) {
          console.log(`   Error Details:`, data.error);
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Network Error:', error.message);
    console.error('   This might be a connection issue or server is down');
  }
}

testApproveEndpoint();




