import pool from "../config/db.js";
import dotenv from "dotenv";

dotenv.config();

/**
 * ⚠️ DEVELOPMENT/TESTING ONLY
 * This script creates sample products for testing purposes.
 * DO NOT use in production - use real product data instead.
 */
async function seedSampleProducts() {
  try {
    console.log('⚠️  WARNING: This is a development/testing script.');
    console.log('   Sample products will be created for testing only.\n');
    console.log('🌱 Starting sample products seed...');

    // Check if we already have approved products
    const existingCheck = await pool.query(
      "SELECT COUNT(*) as count FROM products WHERE status = 'approved'"
    );
    const existingCount = parseInt(existingCheck.rows[0].count);

    console.log(`📊 Current approved products count: ${existingCount}`);

    if (existingCount > 0) {
      console.log('✅ Sample products already exist. Skipping seed.');
      await pool.end();
      return;
    }

    // Get or create a seller user
    let sellerResult = await pool.query(
      "SELECT id FROM users WHERE role = 'seller' AND status = 'approved' LIMIT 1"
    );

    let sellerId;
    if (sellerResult.rows.length === 0) {
      // Create a seller user if none exists
      console.log('👤 Creating seller user...');
      const newSeller = await pool.query(
        `INSERT INTO users (name, email, phone, role, status, password)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id`,
        [
          'Sample Seller',
          'seller@bidmaster.com',
          '+9647701234999',
          'seller',
          'approved',
          '$2b$10$dummy' // Dummy password for testing
        ]
      );
      sellerId = newSeller.rows[0].id;
      console.log(`✅ Created seller user with ID: ${sellerId}`);
    } else {
      sellerId = sellerResult.rows[0].id;
      console.log(`✅ Using existing seller user with ID: ${sellerId}`);
    }

    // Get or create categories
    let electronicsCategory = await pool.query(
      "SELECT id FROM categories WHERE slug = 'electronics' LIMIT 1"
    );
    if (electronicsCategory.rows.length === 0) {
      const newCategory = await pool.query(
        `INSERT INTO categories (name, slug, description)
         VALUES ($1, $2, $3)
         RETURNING id`,
        ['Electronics', 'electronics', 'Electronic devices and gadgets']
      );
      electronicsCategory = { rows: [{ id: newCategory.rows[0].id }] };
      console.log('✅ Created Electronics category');
    }

    let fashionCategory = await pool.query(
      "SELECT id FROM categories WHERE slug = 'fashion' LIMIT 1"
    );
    if (fashionCategory.rows.length === 0) {
      const newCategory = await pool.query(
        `INSERT INTO categories (name, slug, description)
         VALUES ($1, $2, $3)
         RETURNING id`,
        ['Fashion', 'fashion', 'Clothing and accessories']
      );
      fashionCategory = { rows: [{ id: newCategory.rows[0].id }] };
      console.log('✅ Created Fashion category');
    }

    let collectiblesCategory = await pool.query(
      "SELECT id FROM categories WHERE slug = 'collectibles' LIMIT 1"
    );
    if (collectiblesCategory.rows.length === 0) {
      const newCategory = await pool.query(
        `INSERT INTO categories (name, slug, description)
         VALUES ($1, $2, $3)
         RETURNING id`,
        ['Collectibles', 'collectibles', 'Rare and valuable collectibles']
      );
      collectiblesCategory = { rows: [{ id: newCategory.rows[0].id }] };
      console.log('✅ Created Collectibles category');
    }

    // Insert 3 sample approved products with active auctions
    const products = [
      {
        title: 'Vintage Rolex Watch',
        description: 'Authentic Rolex Submariner from 1985. Excellent condition, fully serviced. Includes original box and papers.',
        starting_price: 5000.00,
        starting_bid: 5000.00,
        current_price: 5200.00,
        current_bid: 5200.00,
        category_id: fashionCategory.rows[0].id,
        image_url: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800',
        status: 'approved',
        auction_end_time: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        total_bids: 5,
        startingPrice: 5000.00
      },
      {
        title: 'Limited Edition Gaming Console',
        description: 'Rare limited edition gaming console in mint condition. Includes all original accessories and packaging.',
        starting_price: 800.00,
        starting_bid: 800.00,
        current_price: 950.00,
        current_bid: 950.00,
        category_id: electronicsCategory.rows[0].id,
        image_url: 'https://images.unsplash.com/photo-1606813907291-d86efa9b94db?w=800',
        status: 'approved',
        auction_end_time: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
        total_bids: 12,
        startingPrice: 800.00
      },
      {
        title: 'Rare Collectible Trading Cards Set',
        description: 'Complete set of rare first edition trading cards. Includes ultra-rare holographic cards. Perfect for collectors.',
        starting_price: 1200.00,
        starting_bid: 1200.00,
        current_price: 1500.00,
        current_bid: 1500.00,
        category_id: collectiblesCategory.rows[0].id,
        image_url: 'https://images.unsplash.com/photo-1614594895280-79e6154b0fbd?w=800',
        status: 'approved',
        auction_end_time: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // 10 days from now
        total_bids: 8,
        startingPrice: 1200.00
      }
    ];

    console.log('📦 Inserting 3 sample products...');

    for (const product of products) {
      const result = await pool.query(
        `INSERT INTO products (
          seller_id, title, description, 
          starting_price, starting_bid, 
          current_price, current_bid,
          category_id, image_url, status, 
          auction_end_time, total_bids,
          created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
        RETURNING id, title, status`,
        [
          sellerId,
          product.title,
          product.description,
          product.starting_price,
          product.starting_bid,
          product.current_price,
          product.current_bid,
          product.category_id,
          product.image_url,
          product.status,
          product.auction_end_time,
          product.total_bids
        ]
      );

      console.log(`✅ Inserted: ${result.rows[0].title} (ID: ${result.rows[0].id}, Status: ${result.rows[0].status})`);
    }

    // Verify insertion
    const verifyCheck = await pool.query(
      "SELECT COUNT(*) as count FROM products WHERE status = 'approved'"
    );
    const finalCount = parseInt(verifyCheck.rows[0].count);
    console.log(`\n✅ Seed completed! Total approved products: ${finalCount}`);

    await pool.end();
    console.log('🔌 Database connection closed.');
  } catch (error) {
    console.error('❌ Error seeding sample products:', error);
    console.error('   Message:', error.message);
    console.error('   Stack:', error.stack);
    await pool.end();
    process.exit(1);
  }
}

seedSampleProducts();

