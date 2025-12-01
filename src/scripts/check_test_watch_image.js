/**
 * Check Test Watch Product Image
 */

import pool from "../config/db.js";

async function checkTestWatchImage() {
  try {
    console.log('🔍 Checking Test Watch Product Image');
    console.log('========================================\n');
    
    const result = await pool.query(
      `SELECT id, title, image_url, images, status 
       FROM products 
       WHERE title ILIKE $1`,
      ['%Test Watch%']
    );
    
    if (result.rows.length === 0) {
      console.log('❌ Test Watch product not found');
      process.exit(1);
    }
    
    result.rows.forEach(product => {
      console.log(`\n📦 Product: ${product.title}`);
      console.log('   ID:', product.id);
      console.log('   Status:', product.status);
      console.log('   image_url:', product.image_url);
      console.log('   image_url type:', typeof product.image_url);
      console.log('   images:', product.images);
      console.log('   images type:', typeof product.images);
      
      // Check if image_url is valid
      if (!product.image_url || product.image_url === null || product.image_url === '') {
        console.log('   ⚠️ image_url is NULL or empty');
      } else if (typeof product.image_url === 'string') {
        if (product.image_url.includes('example.com')) {
          console.log('   ⚠️ image_url contains example.com (invalid)');
        } else {
          console.log('   ✅ image_url looks valid');
        }
      } else {
        console.log('   ⚠️ image_url is not a string');
      }
      
      // Check images field (JSONB)
      if (product.images) {
        try {
          const imagesArray = typeof product.images === 'string' 
            ? JSON.parse(product.images) 
            : product.images;
          
          if (Array.isArray(imagesArray) && imagesArray.length > 0) {
            console.log('   ✅ images array has', imagesArray.length, 'items');
            imagesArray.forEach((img, idx) => {
              console.log(`      [${idx}]: ${img}`);
            });
          } else {
            console.log('   ⚠️ images array is empty');
          }
        } catch (e) {
          console.log('   ⚠️ Error parsing images:', e.message);
        }
      } else {
        console.log('   ⚠️ images field is NULL or empty');
      }
    });
    
    console.log('\n========================================');
    console.log('✅ Check complete');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkTestWatchImage();

