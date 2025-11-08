import pool from "../config/db.js";
import dotenv from "dotenv";

dotenv.config();

async function testApiResponse() {
  try {
    console.log('🧪 Testing API Response Format...\n');

    // Simulate the exact query from MobileProductController.getAllProducts
    const { category, search, page = 1, limit = 20 } = {};

    let query = `
      SELECT 
        p.*,
        u.name as seller_name,
        c.name as category_name,
        buyer.name as highest_bidder_name,
        EXTRACT(EPOCH FROM (p.auction_end_time - NOW())) / 3600 as hours_left
      FROM products p
      LEFT JOIN users u ON p.seller_id = u.id
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN users buyer ON p.highest_bidder_id = buyer.id
      WHERE p.status = 'approved'
      ORDER BY p.created_at DESC
      LIMIT $1 OFFSET $2
    `;
    const params = [parseInt(limit), (parseInt(page) - 1) * parseInt(limit)];

    const result = await pool.query(query, params);
    console.log(`✅ Found ${result.rows.length} products\n`);

    // Get total count
    const countQuery = `
      SELECT COUNT(*) FROM products 
      WHERE status = 'approved'
    `;
    const countResult = await pool.query(countQuery);
    const totalCount = parseInt(countResult.rows[0].count);

    const response = {
      success: true,
      data: result.rows,
      pagination: {
        total: totalCount,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(totalCount / limit)
      }
    };

    console.log('📦 API Response Structure:');
    console.log(JSON.stringify(response, null, 2));

    console.log('\n🔍 Checking Flutter Compatibility:');
    console.log(`   Response has 'success': ${response.hasOwnProperty('success')}`);
    console.log(`   Response has 'data' array: ${Array.isArray(response.data)}`);
    console.log(`   Response has 'pagination': ${response.hasOwnProperty('pagination')}`);
    
    if (response.data.length > 0) {
      const firstProduct = response.data[0];
      console.log('\n📋 First Product Fields:');
      console.log(`   id: ${firstProduct.id} (${typeof firstProduct.id})`);
      console.log(`   title: ${firstProduct.title} (${typeof firstProduct.title})`);
      console.log(`   starting_price: ${firstProduct.starting_price} (${typeof firstProduct.starting_price})`);
      console.log(`   starting_bid: ${firstProduct.starting_bid} (${typeof firstProduct.starting_bid})`);
      console.log(`   current_bid: ${firstProduct.current_bid} (${typeof firstProduct.current_bid})`);
      console.log(`   current_price: ${firstProduct.current_price} (${typeof firstProduct.current_price})`);
      console.log(`   image_url: ${firstProduct.image_url || 'NULL'} (${typeof firstProduct.image_url})`);
      console.log(`   status: ${firstProduct.status} (${typeof firstProduct.status})`);
      console.log(`   auction_end_time: ${firstProduct.auction_end_time} (${typeof firstProduct.auction_end_time})`);
      console.log(`   total_bids: ${firstProduct.total_bids} (${typeof firstProduct.total_bids})`);
      console.log(`   category_name: ${firstProduct.category_name || 'NULL'} (${typeof firstProduct.category_name})`);
      console.log(`   seller_name: ${firstProduct.seller_name || 'NULL'} (${typeof firstProduct.seller_name})`);
      
      // Check what Flutter expects
      console.log('\n✅ Flutter ProductModel expects:');
      console.log('   - id (int)');
      console.log('   - title (String)');
      console.log('   - starting_price or starting_bid (double)');
      console.log('   - current_bid or current_price (double?)');
      console.log('   - image_url (String?)');
      console.log('   - status (String)');
      console.log('   - auction_end_time (DateTime?)');
      console.log('   - total_bids (int?)');
      console.log('   - category_name (String?)');
      
      // Check for potential issues
      console.log('\n⚠️  Potential Issues:');
      if (!firstProduct.image_url) {
        console.log('   ❌ image_url is NULL - Flutter might show placeholder');
      }
      if (firstProduct.current_bid === null && firstProduct.current_price === null) {
        console.log('   ⚠️  current_bid and current_price are NULL - Flutter will use startingPrice');
      }
      if (!firstProduct.category_name) {
        console.log('   ⚠️  category_name is NULL - Some products missing category');
      }
      if (!firstProduct.auction_end_time) {
        console.log('   ❌ auction_end_time is NULL - Countdown timer won\'t work');
      }
    }

    await pool.end();
  } catch (error) {
    console.error('❌ Error testing API response:', error);
    console.error('   Message:', error.message);
    console.error('   Stack:', error.stack);
    await pool.end();
    process.exit(1);
  }
}

testApiResponse();

