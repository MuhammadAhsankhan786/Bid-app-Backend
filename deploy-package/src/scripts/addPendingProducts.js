import pool from "../config/db.js";
import dotenv from "dotenv";

dotenv.config();

async function addPendingProducts() {
  try {
    console.log('🌱 Adding pending products for admin approval...');

    // Get or create a seller user
    let sellerResult = await pool.query(
      "SELECT id FROM users WHERE role = 'seller_products' LIMIT 1"
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
          'Test Seller',
          'seller@test.com',
          '+9647701234999',
          'seller_products',
          'approved',
          '$2b$10$dummy'
        ]
      );
      sellerId = newSeller.rows[0].id;
      console.log(`✅ Created seller user with ID: ${sellerId}`);
    } else {
      sellerId = sellerResult.rows[0].id;
      console.log(`✅ Using existing seller user with ID: ${sellerId}`);
    }

    // Check if categories table exists and has slug column
    const hasSlug = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'categories' AND column_name = 'slug'
    `).catch(() => ({ rows: [] }));

    const useSlug = hasSlug.rows.length > 0;
    const categoryQuery = useSlug 
      ? "SELECT id FROM categories WHERE slug = $1 LIMIT 1"
      : "SELECT id FROM categories WHERE name = $1 LIMIT 1";
    const categoryInsert = useSlug
      ? `INSERT INTO categories (name, slug, description) VALUES ($1, $2, $3) RETURNING id`
      : `INSERT INTO categories (name, description) VALUES ($1, $2) RETURNING id`;

    // Get or create categories
    let electronicsCategory = await pool.query(categoryQuery, ['electronics']);
    if (electronicsCategory.rows.length === 0) {
      const newCategory = useSlug
        ? await pool.query(categoryInsert, ['Electronics', 'electronics', 'Electronic devices and gadgets'])
        : await pool.query(categoryInsert, ['Electronics', 'Electronic devices and gadgets']);
      electronicsCategory = { rows: [{ id: newCategory.rows[0].id }] };
      console.log('✅ Created Electronics category');
    } else {
      electronicsCategory = await pool.query("SELECT id FROM categories WHERE name = 'Electronics' LIMIT 1");
      if (electronicsCategory.rows.length === 0) {
        electronicsCategory = await pool.query(categoryQuery, ['Electronics']);
      }
    }

    let fashionCategory = await pool.query(categoryQuery, ['fashion']);
    if (fashionCategory.rows.length === 0) {
      const newCategory = useSlug
        ? await pool.query(categoryInsert, ['Fashion', 'fashion', 'Clothing and accessories'])
        : await pool.query(categoryInsert, ['Fashion', 'Clothing and accessories']);
      fashionCategory = { rows: [{ id: newCategory.rows[0].id }] };
      console.log('✅ Created Fashion category');
    } else {
      fashionCategory = await pool.query("SELECT id FROM categories WHERE name = 'Fashion' LIMIT 1");
      if (fashionCategory.rows.length === 0) {
        fashionCategory = await pool.query(categoryQuery, ['Fashion']);
      }
    }

    // Check existing pending products
    const existingPending = await pool.query(
      "SELECT COUNT(*) as count FROM products WHERE status = 'pending'"
    );
    const pendingCount = parseInt(existingPending.rows[0].count);
    console.log(`📊 Current pending products: ${pendingCount}`);

    if (pendingCount >= 3) {
      console.log('✅ Already have pending products. Skipping...');
      await pool.end();
      return;
    }

    // Insert pending products
    const pendingProducts = [
      {
        title: 'Vintage Camera',
        description: 'Classic 35mm film camera in excellent condition. Perfect for photography enthusiasts.',
        starting_bid: 150.00,
        category_id: electronicsCategory.rows[0].id,
        image_url: 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=800'
      },
      {
        title: 'Designer Watch',
        description: 'Luxury Swiss watch, mint condition. Includes original box and warranty.',
        starting_bid: 500.00,
        category_id: fashionCategory.rows[0].id,
        image_url: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800'
      },
      {
        title: 'Antique Vase',
        description: 'Rare Chinese porcelain vase from 18th century. Authentic and verified.',
        starting_bid: 200.00,
        category_id: electronicsCategory.rows[0].id,
        image_url: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=800'
      }
    ];

    console.log('📦 Inserting pending products...');

    for (const product of pendingProducts) {
      const result = await pool.query(
        `INSERT INTO products (
          seller_id, title, description, 
          starting_bid, starting_price,
          category_id, image_url, status, 
          created_at
        ) VALUES ($1, $2, $3, $4, $4, $5, $6, 'pending', NOW())
        RETURNING id, title, status`,
        [
          sellerId,
          product.title,
          product.description,
          product.starting_bid,
          product.category_id,
          product.image_url
        ]
      );

      console.log(`✅ Inserted: ${result.rows[0].title} (ID: ${result.rows[0].id}, Status: ${result.rows[0].status})`);
    }

    // Also add some approved products for live auctions
    const approvedCheck = await pool.query(
      "SELECT COUNT(*) as count FROM products WHERE status = 'approved' AND auction_end_time > NOW()"
    );
    const approvedCount = parseInt(approvedCheck.rows[0].count);

    if (approvedCount < 3) {
      console.log('📦 Adding approved products for live auctions...');
      
      const liveProducts = [
        {
          title: 'Gaming Laptop',
          description: 'High-end gaming laptop with RTX 3080. Perfect for gaming and professional work.',
          starting_bid: 850.00,
          current_bid: 1050.00,
          category_id: electronicsCategory.rows[0].id,
          image_url: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=800',
          auction_end_time: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000) // 2 days from now
        },
        {
          title: 'Mountain Bike',
          description: 'Professional mountain bike, barely used. All original parts included.',
          starting_bid: 320.00,
          current_bid: 420.00,
          category_id: electronicsCategory.rows[0].id,
          image_url: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800',
          auction_end_time: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000) // 5 days from now
        },
        {
          title: 'Smart Watch',
          description: 'Latest smartwatch with health tracking features. Brand new in box.',
          starting_bid: 180.00,
          current_bid: 220.00,
          category_id: electronicsCategory.rows[0].id,
          image_url: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800',
          auction_end_time: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000) // 1 day from now
        }
      ];

      for (const product of liveProducts) {
        const result = await pool.query(
          `INSERT INTO products (
            seller_id, title, description, 
            starting_bid, starting_price,
            current_bid, current_price,
            category_id, image_url, status, 
            auction_end_time, created_at
          ) VALUES ($1, $2, $3, $4, $4, $5, $5, $6, $7, 'approved', $8, NOW())
          RETURNING id, title, status`,
          [
            sellerId,
            product.title,
            product.description,
            product.starting_bid,
            product.current_bid,
            product.category_id,
            product.image_url,
            product.auction_end_time
          ]
        );

        console.log(`✅ Inserted: ${result.rows[0].title} (ID: ${result.rows[0].id}, Status: ${result.rows[0].status})`);
      }
    }

    // Verify
    const finalPending = await pool.query(
      "SELECT COUNT(*) as count FROM products WHERE status = 'pending'"
    );
    const finalApproved = await pool.query(
      "SELECT COUNT(*) as count FROM products WHERE status = 'approved' AND auction_end_time > NOW()"
    );
    
    console.log(`\n✅ Completed!`);
    console.log(`   Pending products: ${finalPending.rows[0].count}`);
    console.log(`   Live auctions: ${finalApproved.rows[0].count}`);

    await pool.end();
    console.log('🔌 Database connection closed.');
  } catch (error) {
    console.error('❌ Error adding products:', error);
    console.error('   Message:', error.message);
    console.error('   Stack:', error.stack);
    await pool.end();
    process.exit(1);
  }
}

addPendingProducts();

