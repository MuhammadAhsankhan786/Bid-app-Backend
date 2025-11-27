/**
 * Clean Placeholder Images from Database
 * Removes placeholder image URLs from products table
 */

import pool from '../src/config/db.js';
import dotenv from 'dotenv';

dotenv.config();

async function cleanPlaceholderImages() {
  console.log('🧹 Cleaning placeholder images from database...\n');
  
  try {
    // Find products with placeholder URLs
    const placeholderProducts = await pool.query(
      `SELECT id, title, image_url 
       FROM products 
       WHERE image_url LIKE '%placeholder%' 
       OR image_url LIKE '%picsum%' 
       OR image_url LIKE '%unsplash%'
       OR image_url LIKE '%example.com%'`
    );
    
    console.log(`Found ${placeholderProducts.rows.length} products with placeholder images\n`);
    
    if (placeholderProducts.rows.length === 0) {
      console.log('✅ No placeholder images found. Database is clean!');
      return;
    }
    
    // Show what will be cleaned
    console.log('Products with placeholder images:');
    placeholderProducts.rows.forEach((product, index) => {
      console.log(`  ${index + 1}. ID: ${product.id}, Title: ${product.title}`);
      console.log(`     URL: ${product.image_url}`);
    });
    
    // Update products to remove placeholder URLs (set to NULL)
    const updateResult = await pool.query(
      `UPDATE products 
       SET image_url = NULL 
       WHERE image_url LIKE '%placeholder%' 
       OR image_url LIKE '%picsum%' 
       OR image_url LIKE '%unsplash%'
       OR image_url LIKE '%example.com%'`
    );
    
    console.log(`\n✅ Cleaned ${updateResult.rowCount} products`);
    console.log('   Placeholder image URLs have been removed (set to NULL)');
    
    // Also check image_urls array column if it exists
    try {
      const arrayUpdateResult = await pool.query(
        `UPDATE products 
         SET image_urls = ARRAY[]::TEXT[] 
         WHERE EXISTS (
           SELECT 1 FROM unnest(image_urls) AS url 
           WHERE url LIKE '%placeholder%' 
           OR url LIKE '%picsum%' 
           OR url LIKE '%unsplash%'
           OR url LIKE '%example.com%'
         )`
      );
      
      if (updateResult.rowCount > 0) {
        console.log(`✅ Cleaned ${arrayUpdateResult.rowCount} products with placeholder URLs in image_urls array`);
      }
    } catch (e) {
      // image_urls column might not exist, that's okay
      console.log('   (image_urls array column not found or already clean)');
    }
    
    console.log('\n✅ Database cleanup complete!');
    
  } catch (error) {
    console.error('❌ Error cleaning placeholder images:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

cleanPlaceholderImages()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });



