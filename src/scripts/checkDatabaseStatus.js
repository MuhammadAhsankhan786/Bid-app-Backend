import pool from "../config/db.js";
import dotenv from "dotenv";

dotenv.config();

async function checkDatabaseStatus() {
  try {
    console.log('🔍 Checking database status...\n');

    // Test connection
    try {
      const connectionTest = await pool.query('SELECT NOW() as current_time');
      console.log('✅ Database connection: SUCCESS');
      console.log(`   Current DB time: ${connectionTest.rows[0].current_time}\n`);
    } catch (dbError) {
      console.error('❌ Database connection: FAILED');
      console.error(`   Error: ${dbError.message}`);
      await pool.end();
      process.exit(1);
    }

    // Check users table
    const usersCount = await pool.query('SELECT COUNT(*) as count FROM users');
    console.log(`👥 Users: ${usersCount.rows[0].count}`);

    // Check products table
    const productsCount = await pool.query('SELECT COUNT(*) as count FROM products');
    console.log(`📦 Total Products: ${productsCount.rows[0].count}`);

    // Check approved products
    const approvedProducts = await pool.query(
      "SELECT COUNT(*) as count FROM products WHERE status = 'approved'"
    );
    console.log(`✅ Approved Products: ${approvedProducts.rows[0].count}`);

    // Check pending products
    const pendingProducts = await pool.query(
      "SELECT COUNT(*) as count FROM products WHERE status = 'pending'"
    );
    console.log(`⏳ Pending Products: ${pendingProducts.rows[0].count}`);

    // Check categories
    const categoriesCount = await pool.query('SELECT COUNT(*) as count FROM categories');
    console.log(`📂 Categories: ${categoriesCount.rows[0].count}`);

    // Get sample approved products
    const sampleProducts = await pool.query(`
      SELECT 
        p.id,
        p.title,
        p.status,
        p.starting_price,
        p.current_bid,
        p.auction_end_time,
        c.name as category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.status = 'approved'
      LIMIT 5
    `);

    console.log(`\n📋 Sample Approved Products (first 5):`);
    if (sampleProducts.rows.length === 0) {
      console.log('   ⚠️  No approved products found!');
      console.log('   💡 Run: npm run seed-products');
    } else {
      sampleProducts.rows.forEach((product, index) => {
        console.log(`   ${index + 1}. ${product.title}`);
        console.log(`      ID: ${product.id}, Status: ${product.status}`);
        console.log(`      Starting Price: $${product.starting_price || 'N/A'}`);
        console.log(`      Current Bid: $${product.current_bid || product.starting_price || 'N/A'}`);
        console.log(`      Category: ${product.category_name || 'N/A'}`);
        console.log(`      Auction End: ${product.auction_end_time || 'N/A'}`);
        console.log('');
      });
    }

    // Check if we need to seed data
    if (parseInt(approvedProducts.rows[0].count) === 0) {
      console.log('\n⚠️  WARNING: No approved products in database!');
      console.log('   Flutter app will show empty list.');
      console.log('   Solution: Run "npm run seed-products" to add sample data.\n');
    } else {
      console.log('\n✅ Database has approved products. Flutter app should display data.\n');
    }

    await pool.end();
  } catch (error) {
    console.error('❌ Error checking database:', error);
    console.error('   Message:', error.message);
    console.error('   Stack:', error.stack);
    await pool.end();
    process.exit(1);
  }
}

checkDatabaseStatus();

