import pool from "../config/db.js";
import dotenv from "dotenv";

dotenv.config();

/**
 * Script to delete products that have no images or invalid images
 * This will:
 * 1. Find all products with missing/null/empty images
 * 2. Delete related bids first (due to foreign key constraints)
 * 3. Delete the products
 * 4. Show summary of deleted items
 */

async function deleteProductsWithoutImages() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    console.log('🔍 Checking for products without images...\n');
    
    // Step 1: Find products with missing images
    // Check both 'images' JSONB column and legacy 'image_url' column
    const productsQuery = `
      SELECT 
        id, 
        title, 
        seller_id,
        images,
        image_url,
        status,
        created_at
      FROM products
      WHERE 
        -- images is NULL or empty array
        (images IS NULL OR images = '[]'::jsonb OR jsonb_array_length(images) = 0)
        AND
        -- image_url is also NULL or empty
        (image_url IS NULL OR image_url = '' OR TRIM(image_url) = '')
    `;
    
    const productsResult = await client.query(productsQuery);
    const productsToDelete = productsResult.rows;
    
    if (productsToDelete.length === 0) {
      console.log('✅ No products found without images. All products have valid images.');
      await client.query('COMMIT');
      return;
    }
    
    console.log(`📦 Found ${productsToDelete.length} products without images:\n`);
    productsToDelete.forEach((product, index) => {
      console.log(`${index + 1}. ID: ${product.id}, Title: "${product.title}", Status: ${product.status}, Created: ${product.created_at}`);
    });
    
    console.log('\n🗑️  Starting deletion process...\n');
    
    const productIds = productsToDelete.map(p => p.id);
    let deletedBidsCount = 0;
    let deletedProductsCount = 0;
    
    // Step 2: Delete related bids first (if bids table exists)
    try {
      // Check if bids table exists and has product_id column
      const bidsCheck = await client.query(`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.tables 
          WHERE table_name = 'bids'
        ) AND EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'bids' AND column_name = 'product_id'
        )
      `);
      
      if (bidsCheck.rows[0].exists) {
        const bidsDeleteResult = await client.query(
          `DELETE FROM bids WHERE product_id = ANY($1::int[])`,
          [productIds]
        );
        deletedBidsCount = bidsDeleteResult.rowCount;
        console.log(`✅ Deleted ${deletedBidsCount} related bids`);
      }
    } catch (error) {
      console.log(`⚠️  Could not delete bids (may not exist or have different structure): ${error.message}`);
    }
    
    // Step 3: Delete related orders (if orders table exists)
    try {
      const ordersCheck = await client.query(`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.tables 
          WHERE table_name = 'orders'
        ) AND EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'orders' AND column_name = 'product_id'
        )
      `);
      
      if (ordersCheck.rows[0].exists) {
        const ordersDeleteResult = await client.query(
          `DELETE FROM orders WHERE product_id = ANY($1::int[])`,
          [productIds]
        );
        console.log(`✅ Deleted ${ordersDeleteResult.rowCount} related orders`);
      }
    } catch (error) {
      console.log(`⚠️  Could not delete orders (may not exist): ${error.message}`);
    }
    
    // Step 4: Delete the products
    const deleteResult = await client.query(
      `DELETE FROM products WHERE id = ANY($1::int[]) RETURNING id, title`,
      [productIds]
    );
    
    deletedProductsCount = deleteResult.rowCount;
    
    await client.query('COMMIT');
    
    console.log('\n✅ Deletion completed successfully!\n');
    console.log('📊 Summary:');
    console.log(`   - Products deleted: ${deletedProductsCount}`);
    console.log(`   - Bids deleted: ${deletedBidsCount}`);
    console.log(`   - Total items removed: ${deletedProductsCount + deletedBidsCount}\n`);
    
    // Show deleted product details
    if (deleteResult.rows.length > 0) {
      console.log('🗑️  Deleted Products:');
      deleteResult.rows.forEach((product, index) => {
        console.log(`   ${index + 1}. ID: ${product.id}, Title: "${product.title}"`);
      });
    }
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error deleting products:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Run the script
deleteProductsWithoutImages()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });

