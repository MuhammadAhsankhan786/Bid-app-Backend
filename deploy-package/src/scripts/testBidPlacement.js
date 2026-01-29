import pool from "../config/db.js";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

async function testBidPlacement() {
  try {
    console.log('\n🧪 Testing Bid Placement Endpoint...\n');
    
    // Get user
    const userResult = await pool.query(
      "SELECT id, name, phone, role FROM users WHERE phone = $1",
      ['+9647701234567']
    );
    
    if (userResult.rows.length === 0) {
      console.log('❌ User not found!');
      return;
    }
    
    const user = userResult.rows[0];
    console.log('✅ User found:', user);
    
    // Get product
    const productResult = await pool.query(
      "SELECT id, title, status, seller_id, current_bid, starting_bid FROM products WHERE id = $1",
      [4]
    );
    
    if (productResult.rows.length === 0) {
      console.log('❌ Product not found!');
      return;
    }
    
    const product = productResult.rows[0];
    console.log('✅ Product found:', product);
    
    // Generate token
    const token = jwt.sign(
      { id: user.id, phone: user.phone, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    console.log('✅ Token generated');
    
    // Test bid placement
    const bidAmount = 250.00;
    const currentBid = parseFloat(product.current_bid) || parseFloat(product.starting_bid) || 0;
    
    console.log('\n📊 Bid Details:');
    console.log(`   Product ID: ${product.id}`);
    console.log(`   User ID: ${user.id}`);
    console.log(`   Current Bid: $${currentBid}`);
    console.log(`   New Bid: $${bidAmount}`);
    console.log(`   Valid: ${bidAmount > currentBid ? '✅' : '❌'}`);
    
    if (bidAmount <= currentBid) {
      console.log('\n❌ Bid amount must be higher than current bid!');
      return;
    }
    
    if (product.seller_id === user.id) {
      console.log('\n❌ Cannot bid on own product!');
      return;
    }
    
    if (product.status !== 'approved') {
      console.log('\n❌ Product not approved!');
      return;
    }
    
    // Simulate bid placement
    console.log('\n🔄 Starting transaction...');
    await pool.query('BEGIN');
    
    try {
      // Insert bid
      const bidResult = await pool.query(
        `INSERT INTO bids (product_id, user_id, amount) 
         VALUES ($1, $2, $3) 
         RETURNING *`,
        [product.id, user.id, bidAmount]
      );
      
      console.log('✅ Bid inserted:', bidResult.rows[0]);
      
      // Update product
      await pool.query(
        `UPDATE products 
         SET current_bid = $1, 
             current_price = $1,
             highest_bidder_id = $2,
             total_bids = COALESCE(total_bids, 0) + 1
         WHERE id = $3`,
        [bidAmount, user.id, product.id]
      );
      
      console.log('✅ Product updated');
      
      // Update user
      await pool.query(
        `UPDATE users 
         SET bids_count = COALESCE(bids_count, 0) + 1 
         WHERE id = $1`,
        [user.id]
      );
      
      console.log('✅ User updated');
      
      await pool.query('ROLLBACK'); // Rollback for testing
      console.log('✅ Transaction rolled back (test only)');
      
      console.log('\n✅ All checks passed! Bid placement should work.');
      console.log('\n📋 Next Steps:');
      console.log('   1. Make sure backend server is running: npm run dev');
      console.log('   2. Check backend console for 🧩 [BidPlace] logs');
      console.log('   3. Try placing bid from Flutter app');
      console.log('   4. If error occurs, check 🧩 [BidError] logs');
      
    } catch (error) {
      await pool.query('ROLLBACK');
      console.log('\n❌ Error during bid placement:', error.message);
      console.log('   Code:', error.code);
      console.log('   Detail:', error.detail);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

testBidPlacement();


