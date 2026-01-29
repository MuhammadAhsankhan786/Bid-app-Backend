/**
 * Test Bid Placement - Debug 400 Error
 * Ye script bid placement test karega aur exact error bataega
 */

import pool from "../config/db.js";

async function testBidPlacement() {
  try {
    console.log('🧪 Testing Bid Placement...\n');
    console.log('=' .repeat(60));
    
    const productId = 7;
    const userId = 53; // From logs
    const amount = 1000;
    
    // Step 1: Check if product exists
    console.log('\n📦 Step 1: Checking Product...\n');
    const productResult = await pool.query(
      `SELECT id, title, status, seller_id, current_bid, starting_bid, auction_end_time
       FROM products 
       WHERE id = $1`,
      [productId]
    );
    
    if (productResult.rows.length === 0) {
      console.log(`❌ Product ID ${productId} not found in database\n`);
      return;
    }
    
    const product = productResult.rows[0];
    console.log('✅ Product found:');
    console.log(`   ID: ${product.id}`);
    console.log(`   Title: ${product.title}`);
    console.log(`   Status: ${product.status}`);
    console.log(`   Seller ID: ${product.seller_id}`);
    console.log(`   Current Bid: ${product.current_bid || 'null'}`);
    console.log(`   Starting Bid: ${product.starting_bid || 'null'}`);
    console.log(`   Auction End Time: ${product.auction_end_time || 'null'}\n`);
    
    // Step 2: Check product status
    if (product.status !== 'approved') {
      console.log(`❌ PROBLEM: Product status is '${product.status}', should be 'approved'`);
      console.log(`   Fix: Update product status to 'approved'\n`);
    } else {
      console.log('✅ Product status is approved\n');
    }
    
    // Step 3: Check auction end time
    if (product.auction_end_time) {
      const endTime = new Date(product.auction_end_time);
      const now = new Date();
      if (endTime < now) {
        console.log(`❌ PROBLEM: Auction has ended`);
        console.log(`   End Time: ${endTime.toISOString()}`);
        console.log(`   Current Time: ${now.toISOString()}\n`);
      } else {
        console.log('✅ Auction is still active\n');
      }
    }
    
    // Step 4: Check if user is seller
    if (product.seller_id === userId) {
      console.log(`❌ PROBLEM: User ${userId} is the seller of this product`);
      console.log(`   Sellers cannot bid on their own products\n`);
    } else {
      console.log('✅ User is not the seller\n');
    }
    
    // Step 5: Check bid amount
    const currentBid = parseFloat(product.current_bid) || parseFloat(product.starting_bid) || 0;
    console.log('💰 Step 5: Checking Bid Amount...\n');
    console.log(`   Current Bid: ${currentBid}`);
    console.log(`   New Bid: ${amount}`);
    console.log(`   Difference: ${amount - currentBid}\n`);
    
    if (amount <= currentBid) {
      console.log(`❌ PROBLEM: Bid amount (${amount}) must be higher than current bid (${currentBid})`);
      console.log(`   Minimum bid should be: ${currentBid + 1}\n`);
    } else {
      console.log('✅ Bid amount is valid\n');
    }
    
    // Step 6: Check user exists
    console.log('👤 Step 6: Checking User...\n');
    const userResult = await pool.query(
      `SELECT id, name, role, status FROM users WHERE id = $1`,
      [userId]
    );
    
    if (userResult.rows.length === 0) {
      console.log(`❌ User ID ${userId} not found in database\n`);
    } else {
      const user = userResult.rows[0];
      console.log('✅ User found:');
      console.log(`   ID: ${user.id}`);
      console.log(`   Name: ${user.name}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   Status: ${user.status}\n`);
      
      if (user.status !== 'approved') {
        console.log(`⚠️  Warning: User status is '${user.status}', should be 'approved'\n`);
      }
    }
    
    // Step 7: Summary
    console.log('=' .repeat(60));
    console.log('\n📋 SUMMARY:\n');
    
    const issues = [];
    if (product.status !== 'approved') {
      issues.push(`Product status: ${product.status} (should be 'approved')`);
    }
    if (product.auction_end_time && new Date(product.auction_end_time) < new Date()) {
      issues.push('Auction has ended');
    }
    if (product.seller_id === userId) {
      issues.push('User is the seller (cannot bid on own product)');
    }
    if (amount <= currentBid) {
      issues.push(`Bid amount (${amount}) <= current bid (${currentBid})`);
    }
    
    if (issues.length === 0) {
      console.log('✅ All checks passed! Bid should work.\n');
      console.log('💡 If still getting 400 error, check backend logs for detailed error message.\n');
    } else {
      console.log('❌ Issues found:\n');
      issues.forEach((issue, index) => {
        console.log(`   ${index + 1}. ${issue}`);
      });
      console.log('\n🔧 Fix these issues and try again.\n');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

testBidPlacement();

