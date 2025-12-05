import pool from "../config/db.js";
import dotenv from "dotenv";

dotenv.config();

/**
 * Script to find products with localhost image URLs
 * These won't work in production and need to be fixed
 */

async function findProductsWithLocalhostImages() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Finding products with localhost image URLs...\n');
    
    // Get all products
    const productsResult = await client.query(`
      SELECT 
        id, 
        title, 
        images,
        image_url,
        status,
        created_at
      FROM products
      ORDER BY id DESC
    `);
    
    const products = productsResult.rows;
    const productsWithLocalhost = [];
    
    products.forEach((product) => {
      let hasLocalhost = false;
      let localhostUrls = [];
      
      // Check images array
      if (product.images) {
        try {
          const imagesStr = JSON.stringify(product.images);
          if (imagesStr !== '[]' && imagesStr !== 'null') {
            const imagesArray = JSON.parse(imagesStr);
            if (Array.isArray(imagesArray)) {
              imagesArray.forEach((img) => {
                if (img && typeof img === 'string' && img.includes('localhost')) {
                  hasLocalhost = true;
                  localhostUrls.push(img);
                }
              });
            }
          }
        } catch (error) {
          // Ignore parsing errors
        }
      }
      
      // Check legacy image_url
      if (product.image_url && product.image_url.includes('localhost')) {
        hasLocalhost = true;
        localhostUrls.push(product.image_url);
      }
      
      if (hasLocalhost) {
        productsWithLocalhost.push({
          id: product.id,
          title: product.title,
          status: product.status,
          created_at: product.created_at,
          localhostUrls
        });
      }
    });
    
    // Display results
    console.log(`📦 Total Products: ${products.length}`);
    console.log(`⚠️  Products with localhost URLs: ${productsWithLocalhost.length}\n`);
    
    if (productsWithLocalhost.length > 0) {
      console.log('⚠️  Products with localhost Image URLs (Won\'t work in production):\n');
      productsWithLocalhost.forEach((product, index) => {
        console.log(`${index + 1}. ID: ${product.id}, Title: "${product.title}", Status: ${product.status}`);
        console.log(`   Created: ${product.created_at}`);
        product.localhostUrls.forEach((url, idx) => {
          console.log(`   Image ${idx + 1}: ${url.substring(0, 100)}${url.length > 100 ? '...' : ''}`);
        });
        console.log('');
      });
      
      console.log('\n💡 These products need to be fixed or deleted.');
      console.log('   Localhost URLs won\'t work when app is deployed.\n');
    } else {
      console.log('✅ No products found with localhost URLs.\n');
    }
    
    // Summary
    console.log('📈 Summary:');
    console.log(`   Total Products: ${products.length}`);
    console.log(`   With localhost URLs: ${productsWithLocalhost.length}`);
    console.log(`   Without localhost URLs: ${products.length - productsWithLocalhost.length}`);
    
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Run the script
findProductsWithLocalhostImages()
  .then(() => {
    console.log('\n✅ Check completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Check failed:', error);
    process.exit(1);
  });

