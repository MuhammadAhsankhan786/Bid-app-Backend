import pool from "../config/db.js";
import dotenv from "dotenv";

dotenv.config();

// Required columns for products table
const REQUIRED_COLUMNS = [
  'id',
  'title',
  'description',
  'category_id',
  'status',
  'current_bid',
  'image_url',
  'created_at',
  'seller_id',
  'starting_bid',
  'current_price',
  'auction_end_time',
  'total_bids'
];

// Demo products data - 3+ products per category
const DEMO_PRODUCTS = {
  'Watches': [
    {
      title: 'Rolex Submariner',
      description: 'Luxury diving watch with automatic movement, water resistant up to 300m. Classic design with rotating bezel.',
      starting_bid: 5000,
      current_bid: 0
    },
    {
      title: 'Omega Speedmaster',
      description: 'Professional chronograph watch, famously worn on the moon. Swiss-made with manual winding movement.',
      starting_bid: 3500,
      current_bid: 0
    },
    {
      title: 'Apple Watch Ultra',
      description: 'Premium smartwatch with titanium case, advanced fitness tracking, and 36-hour battery life.',
      starting_bid: 800,
      current_bid: 0
    },
    {
      title: 'Tag Heuer Carrera',
      description: 'Sporty chronograph with racing heritage. Swiss automatic movement with date display.',
      starting_bid: 2500,
      current_bid: 0
    }
  ],
  'Electronics': [
    {
      title: 'iPhone 15 Pro Max',
      description: 'Latest Apple flagship with A17 Pro chip, 256GB storage, titanium design, and ProRAW photography.',
      starting_bid: 1200,
      current_bid: 0
    },
    {
      title: 'Samsung Galaxy S24 Ultra',
      description: 'Premium Android phone with S Pen, 200MP camera, 512GB storage, and Snapdragon 8 Gen 3.',
      starting_bid: 1100,
      current_bid: 0
    },
    {
      title: 'Sony WH-1000XM5 Headphones',
      description: 'Premium noise-cancelling wireless headphones with 30-hour battery and LDAC support.',
      starting_bid: 350,
      current_bid: 0
    },
    {
      title: 'MacBook Pro 16" M3',
      description: 'Professional laptop with M3 Max chip, 32GB RAM, 1TB SSD, and Liquid Retina XDR display.',
      starting_bid: 2500,
      current_bid: 0
    }
  ],
  'Art': [
    {
      title: 'Abstract Canvas Painting',
      description: 'Modern abstract artwork with vibrant colors and bold brushstrokes. Signed by artist, ready to hang.',
      starting_bid: 450,
      current_bid: 0
    },
    {
      title: 'Vintage Oil Portrait',
      description: 'Classical portrait painting in oil on canvas, framed in ornate gold frame. Circa 1950s.',
      starting_bid: 800,
      current_bid: 0
    },
    {
      title: 'Contemporary Sculpture',
      description: 'Bronze sculpture by renowned artist, limited edition. Abstract form with polished finish.',
      starting_bid: 1200,
      current_bid: 0
    },
    {
      title: 'Digital Art Print',
      description: 'High-resolution digital art print on premium canvas. Limited edition of 50, numbered and signed.',
      starting_bid: 200,
      current_bid: 0
    }
  ],
  'Furniture': [
    {
      title: 'Modern Leather Sofa',
      description: '3-seater Italian leather sofa in charcoal gray. Premium quality with solid wood frame.',
      starting_bid: 1500,
      current_bid: 0
    },
    {
      title: 'Vintage Oak Dining Table',
      description: 'Solid oak dining table seats 8. Handcrafted with traditional joinery, excellent condition.',
      starting_bid: 800,
      current_bid: 0
    },
    {
      title: 'Designer Coffee Table',
      description: 'Mid-century modern coffee table with glass top and walnut base. Minimalist design.',
      starting_bid: 400,
      current_bid: 0
    },
    {
      title: 'Ergonomic Office Chair',
      description: 'Premium ergonomic office chair with lumbar support, adjustable arms, and mesh back.',
      starting_bid: 300,
      current_bid: 0
    }
  ],
  'Fashion': [
    {
      title: 'Designer Leather Jacket',
      description: 'Genuine leather biker jacket, size M. Classic design with quilted lining and zippered pockets.',
      starting_bid: 450,
      current_bid: 0
    },
    {
      title: 'Luxury Handbag',
      description: 'Premium designer handbag in black leather. Includes authenticity card and dust bag.',
      starting_bid: 600,
      current_bid: 0
    },
    {
      title: 'Swiss Made Watch',
      description: 'Classic Swiss timepiece with automatic movement. Stainless steel case with leather strap.',
      starting_bid: 1200,
      current_bid: 0
    },
    {
      title: 'Designer Sunglasses',
      description: 'Premium sunglasses with UV protection and polarized lenses. Includes original case.',
      starting_bid: 150,
      current_bid: 0
    }
  ],
  'Collectibles': [
    {
      title: 'Vintage Comic Book Collection',
      description: 'Rare comic book collection from 1960s-1980s. Includes first editions in protective sleeves.',
      starting_bid: 800,
      current_bid: 0
    },
    {
      title: 'Limited Edition Action Figures',
      description: 'Mint condition action figures in original packaging. Rare collectibles from popular franchise.',
      starting_bid: 300,
      current_bid: 0
    },
    {
      title: 'Antique Coin Collection',
      description: 'Curated collection of rare coins from various countries and time periods. Includes certificates.',
      starting_bid: 500,
      current_bid: 0
    },
    {
      title: 'Sports Memorabilia Signed',
      description: 'Authenticated signed jersey from legendary athlete. Includes certificate of authenticity.',
      starting_bid: 600,
      current_bid: 0
    }
  ]
};

async function verifyProductsTable() {
  console.log('🔍 Verifying products table structure...');
  
  try {
    // Get existing columns
    const columnsResult = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'products'
      ORDER BY ordinal_position
    `);
    
    const existingColumns = columnsResult.rows.map(row => row.column_name);
    console.log(`   Found ${existingColumns.length} columns in products table`);
    
    // Check for required columns
    const missingColumns = REQUIRED_COLUMNS.filter(col => !existingColumns.includes(col));
    
    if (missingColumns.length > 0) {
      console.log(`   ⚠️  Missing columns: ${missingColumns.join(', ')}`);
      console.log('   🔧 Attempting to add missing columns...');
      
      for (const column of missingColumns) {
        try {
          let alterQuery = '';
          
          switch (column) {
            case 'category_id':
              alterQuery = `ALTER TABLE products ADD COLUMN category_id INTEGER REFERENCES categories(id)`;
              break;
            case 'seller_id':
              alterQuery = `ALTER TABLE products ADD COLUMN seller_id INTEGER REFERENCES users(id)`;
              break;
            case 'starting_bid':
              alterQuery = `ALTER TABLE products ADD COLUMN starting_bid DECIMAL(10,2) DEFAULT 0`;
              break;
            case 'current_bid':
              alterQuery = `ALTER TABLE products ADD COLUMN current_bid DECIMAL(10,2) DEFAULT 0`;
              break;
            case 'current_price':
              alterQuery = `ALTER TABLE products ADD COLUMN current_price DECIMAL(10,2) DEFAULT 0`;
              break;
            case 'image_url':
              alterQuery = `ALTER TABLE products ADD COLUMN image_url TEXT`;
              break;
            case 'status':
              alterQuery = `ALTER TABLE products ADD COLUMN status VARCHAR(20) DEFAULT 'pending'`;
              break;
            case 'auction_end_time':
              alterQuery = `ALTER TABLE products ADD COLUMN auction_end_time TIMESTAMP`;
              break;
            case 'total_bids':
              alterQuery = `ALTER TABLE products ADD COLUMN total_bids INTEGER DEFAULT 0`;
              break;
            default:
              console.log(`   ⚠️  Cannot auto-add column: ${column}`);
              continue;
          }
          
          if (alterQuery) {
            await pool.query(alterQuery);
            console.log(`   ✅ Added column: ${column}`);
          }
        } catch (error) {
          console.log(`   ⚠️  Could not add column ${column}: ${error.message}`);
        }
      }
    } else {
      console.log('   ✅ All required columns exist');
    }
    
    return true;
  } catch (error) {
    console.error('   ❌ Error verifying products table:', error.message);
    return false;
  }
}

async function getOrCreateCategory(categoryName) {
  try {
    // Try to find by name (case-insensitive)
    let result = await pool.query(
      "SELECT id FROM categories WHERE LOWER(name) = LOWER($1) LIMIT 1",
      [categoryName]
    );
    
    if (result.rows.length > 0) {
      return result.rows[0].id;
    }
    
    // Check if slug column exists
    const slugColumnCheck = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'categories' AND column_name = 'slug'
    `);
    
    const hasSlugColumn = slugColumnCheck.rows.length > 0;
    
    // Create category if it doesn't exist
    if (hasSlugColumn) {
      const slug = categoryName.toLowerCase().replace(/\s+/g, '-');
      // Check if unique constraint exists on slug
      const slugConstraintCheck = await pool.query(`
        SELECT constraint_name 
        FROM information_schema.table_constraints 
        WHERE table_name = 'categories' 
          AND constraint_type = 'UNIQUE'
          AND constraint_name LIKE '%slug%'
      `);
      
      if (slugConstraintCheck.rows.length > 0) {
        result = await pool.query(
          `INSERT INTO categories (name, slug, description) 
           VALUES ($1, $2, $3) 
           ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
           RETURNING id`,
          [categoryName, slug, `Products in the ${categoryName} category`]
        );
      } else {
        // No unique constraint, just insert
        result = await pool.query(
          `INSERT INTO categories (name, slug, description) 
           VALUES ($1, $2, $3) 
           RETURNING id`,
          [categoryName, slug, `Products in the ${categoryName} category`]
        );
      }
    } else {
      // If slug column doesn't exist, check for unique on name
      const nameConstraintCheck = await pool.query(`
        SELECT constraint_name 
        FROM information_schema.table_constraints 
        WHERE table_name = 'categories' 
          AND constraint_type = 'UNIQUE'
          AND constraint_name LIKE '%name%'
      `);
      
      if (nameConstraintCheck.rows.length > 0) {
        result = await pool.query(
          `INSERT INTO categories (name, description) 
           VALUES ($1, $2) 
           ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
           RETURNING id`,
          [categoryName, `Products in the ${categoryName} category`]
        );
      } else {
        // No unique constraint, just insert
        result = await pool.query(
          `INSERT INTO categories (name, description) 
           VALUES ($1, $2) 
           RETURNING id`,
          [categoryName, `Products in the ${categoryName} category`]
        );
      }
    }
    
    return result.rows[0].id;
  } catch (error) {
    console.error(`   ❌ Error getting/creating category ${categoryName}:`, error.message);
    return null;
  }
}

async function getOrCreateSeller() {
  try {
    // Try to find an existing seller
    let result = await pool.query(
      "SELECT id FROM users WHERE role = 'seller' AND status = 'approved' LIMIT 1"
    );
    
    if (result.rows.length > 0) {
      return result.rows[0].id;
    }
    
    // Create a seller if none exists
    result = await pool.query(
      `INSERT INTO users (name, email, phone, role, status, password) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       ON CONFLICT (phone) DO UPDATE SET role = 'seller', status = 'approved'
       RETURNING id`,
      [
        'Demo Seller',
        'seller@bidmaster.com',
        '+9647701234999',
        'seller',
        'approved',
        '$2b$10$dummy' // Dummy password
      ]
    );
    
    return result.rows[0].id;
  } catch (error) {
    console.error('   ❌ Error getting/creating seller:', error.message);
    return null;
  }
}

async function seedCategoryProducts(categoryName, products, categoryId, sellerId) {
  console.log(`🧩 [Seed] Seeding products for category: ${categoryName}`);
  
  let insertedCount = 0;
  let skippedCount = 0;
  
  for (const product of products) {
    try {
      // Check if product already exists (by title)
      const existingCheck = await pool.query(
        "SELECT id FROM products WHERE LOWER(title) = LOWER($1) LIMIT 1",
        [product.title]
      );
      
      if (existingCheck.rows.length > 0) {
        skippedCount++;
        continue;
      }
      
      // Calculate auction end time (7 days from now)
      const auctionEndTime = new Date();
      auctionEndTime.setDate(auctionEndTime.getDate() + 7);
      
      // Generate placeholder image URL
      const imageUrl = `https://placehold.co/400x300?text=${encodeURIComponent(categoryName + ' - ' + product.title)}`;
      
      // Insert product - check if starting_price column exists
      const startingPriceCheck = await pool.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'products' AND column_name = 'starting_price'
      `);
      const hasStartingPrice = startingPriceCheck.rows.length > 0;
      
      if (hasStartingPrice) {
        // Insert with starting_price
        await pool.query(
          `INSERT INTO products (
            title, description, category_id, seller_id, 
            starting_price, starting_bid, current_bid, current_price, 
            image_url, status, auction_end_time, total_bids
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
          [
            product.title,
            product.description,
            categoryId,
            sellerId,
            product.starting_bid,
            product.starting_bid,
            product.current_bid || product.starting_bid,
            product.current_bid || product.starting_bid,
            imageUrl,
            'approved',
            auctionEndTime,
            0
          ]
        );
      } else {
        // Insert without starting_price
        await pool.query(
          `INSERT INTO products (
            title, description, category_id, seller_id, 
            starting_bid, current_bid, current_price, 
            image_url, status, auction_end_time, total_bids
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
          [
            product.title,
            product.description,
            categoryId,
            sellerId,
            product.starting_bid,
            product.current_bid || product.starting_bid,
            product.current_bid || product.starting_bid,
            imageUrl,
            'approved',
            auctionEndTime,
            0
          ]
        );
      }
      
      insertedCount++;
    } catch (error) {
      console.error(`   ⚠️  Error inserting product "${product.title}":`, error.message);
    }
  }
  
  if (insertedCount > 0) {
    console.log(`🧩 [Seed] Inserted ${insertedCount} new records for ${categoryName}`);
  }
  
  if (skippedCount > 0) {
    console.log(`🧩 [Seed] Skipped ${skippedCount} existing records for ${categoryName}`);
  }
  
  if (insertedCount === 0 && skippedCount > 0) {
    console.log(`🧩 [Seed] Category already populated — skipping.`);
  }
  
  return { inserted: insertedCount, skipped: skippedCount };
}

async function verifySeeding() {
  console.log('\n🔍 Verifying seeded data...\n');
  
  try {
    const categories = Object.keys(DEMO_PRODUCTS);
    
    for (const categoryName of categories) {
      // Get category ID
      const categoryResult = await pool.query(
        "SELECT id FROM categories WHERE LOWER(name) = LOWER($1) LIMIT 1",
        [categoryName]
      );
      
      if (categoryResult.rows.length === 0) {
        console.log(`🧩 [Verify] Category: ${categoryName} | Count: 0 (category not found)`);
        continue;
      }
      
      const categoryId = categoryResult.rows[0].id;
      
      // Count products in this category
      const countResult = await pool.query(
        "SELECT COUNT(*) as count FROM products WHERE category_id = $1 AND status = 'approved'",
        [categoryId]
      );
      
      const count = parseInt(countResult.rows[0].count);
      console.log(`🧩 [Verify] Category: ${categoryName} | Count: ${count}`);
    }
    
    // Total count
    const totalResult = await pool.query(
      "SELECT COUNT(*) as count FROM products WHERE status = 'approved'"
    );
    const totalCount = parseInt(totalResult.rows[0].count);
    console.log(`\n🧩 [Verify] Total approved products: ${totalCount}`);
    
  } catch (error) {
    console.error('❌ Error during verification:', error.message);
  }
}

async function seedDemoData() {
  try {
    console.log('🌱 Starting demo data seeding...\n');
    
    // Step 1: Verify products table structure
    const tableValid = await verifyProductsTable();
    if (!tableValid) {
      console.error('❌ Products table verification failed. Exiting.');
      await pool.end();
      return;
    }
    
    console.log('');
    
    // Step 2: Get or create seller
    console.log('👤 Getting or creating seller user...');
    const sellerId = await getOrCreateSeller();
    if (!sellerId) {
      console.error('❌ Could not get or create seller. Exiting.');
      await pool.end();
      return;
    }
    console.log(`   ✅ Seller ID: ${sellerId}\n`);
    
    // Step 3: Seed products for each category
    let totalInserted = 0;
    let totalSkipped = 0;
    
    for (const [categoryName, products] of Object.entries(DEMO_PRODUCTS)) {
      // Get or create category
      const categoryId = await getOrCreateCategory(categoryName);
      if (!categoryId) {
        console.error(`   ⚠️  Skipping category ${categoryName} - could not get/create category`);
        continue;
      }
      
      // Seed products
      const result = await seedCategoryProducts(categoryName, products, categoryId, sellerId);
      totalInserted += result.inserted;
      totalSkipped += result.skipped;
    }
    
    console.log(`\n✅ Seeding complete!`);
    console.log(`   Total inserted: ${totalInserted}`);
    console.log(`   Total skipped: ${totalSkipped}`);
    
    // Step 4: Verify seeding
    await verifySeeding();
    
    console.log('\n✅ Demo data seeding completed successfully!');
    
  } catch (error) {
    console.error('❌ Error during seeding:', error);
    console.error('   Stack:', error.stack);
  } finally {
    await pool.end();
  }
}

// Run seeding
seedDemoData();

