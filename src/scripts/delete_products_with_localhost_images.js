import pool from "../config/db.js";
import dotenv from "dotenv";

dotenv.config();

/**
 * Script to delete products with localhost image URLs
 * These won't work in production/mobile app
 */

async function deleteProductsWithLocalhostImages() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    console.log('🔍 Finding products with localhost image URLs...\n');
    
    // Find products with localhost URLs
    const productsResult = await client.query(`
      SELECT 
        id, 
        title, 
        images,
        image_url,
        status,
        created_at
      FROM products
      WHERE 
        -- Check images array for localhost
        (images::text LIKE '%localhost%')
        OR
        -- Check legacy image_url for localhost
        (image_url LIKE '%localhost%')
      ORDER BY id DESC
    `);
    
    const productsToDelete = productsResult.rows;
    
    if (productsToDelete.length === 0) {
      console.log('✅ No products found with localhost URLs.');
      await client.query('COMMIT');
      return;
    }
    
    console.log(`📦 Found ${productsToDelete.length} products with localhost URLs:\n`);
    productsToDelete.forEach((product, index) => {
      console.log(`${index + 1}. ID: ${product.id}, Title: "${product.title}", Status: ${product.status}`);
    });
    
    console.log('\n🗑️  Starting deletion process...\n');
    
    const productIds = productsToDelete.map(p => p.id);
    let deletedBidsCount = 0;
    let deletedProductsCount = 0;
    
    // Delete related bids first
    try {
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
        if (deletedBidsCount > 0) {
          console.log(`✅ Deleted ${deletedBidsCount} related bids`);
        }
      }
    } catch (error) {
      console.log(`⚠️  Could not delete bids: ${error.message}`);
    }
    
    // Delete related orders
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
        if (ordersDeleteResult.rowCount > 0) {
          console.log(`✅ Deleted ${ordersDeleteResult.rowCount} related orders`);
        }
      }
    } catch (error) {
      console.log(`⚠️  Could not delete orders: ${error.message}`);
    }
    
    // Delete the products
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
deleteProductsWithLocalhostImages()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });

