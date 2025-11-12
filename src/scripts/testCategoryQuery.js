import pool from "../config/db.js";

async function testCategoryQuery() {
  try {
    console.log('Testing category query for "Watches"...\n');
    
    // Test 1: Check if category exists
    const categoryCheck = await pool.query(
      "SELECT id, name FROM categories WHERE LOWER(name) = LOWER($1)",
      ['Watches']
    );
    console.log('Category check:', categoryCheck.rows);
    
    // Test 2: Test the actual query from controller
    const category = 'Watches';
    let query = `
      SELECT 
        p.id, p.seller_id, p.title, p.description, p.image_url, p.status,
        p.created_at, p.category_id, p.highest_bidder_id, p.auction_end_time,
        p.starting_price, p.starting_bid,
        COALESCE(NULLIF(p.current_bid, 0), NULLIF(p.current_price, 0), p.starting_bid, p.starting_price, 0) as current_bid,
        COALESCE(NULLIF(p.current_price, 0), NULLIF(p.current_bid, 0), p.starting_price, p.starting_bid, 0) as current_price,
        COALESCE(p.total_bids, (SELECT COUNT(*) FROM bids WHERE product_id = p.id), 0) as total_bids,
        u.name as seller_name,
        c.name as category_name,
        buyer.name as highest_bidder_name,
        EXTRACT(EPOCH FROM (p.auction_end_time - NOW())) / 3600 as hours_left
      FROM products p
      LEFT JOIN users u ON p.seller_id = u.id
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN users buyer ON p.highest_bidder_id = buyer.id
      WHERE p.status = 'approved'
      AND LOWER(c.name) = LOWER($1)
      ORDER BY p.created_at DESC LIMIT $2 OFFSET $3
    `;
    
    const params = [category, 20, 0];
    console.log('\nExecuting query with params:', params);
    
    const result = await pool.query(query, params);
    console.log(`\n✅ Query successful! Found ${result.rows.length} products`);
    
    if (result.rows.length > 0) {
      console.log('\nFirst product:');
      console.log(JSON.stringify(result.rows[0], null, 2));
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('Code:', error.code);
    console.error('Detail:', error.detail);
    console.error('Stack:', error.stack);
  } finally {
    await pool.end();
  }
}

testCategoryQuery();


