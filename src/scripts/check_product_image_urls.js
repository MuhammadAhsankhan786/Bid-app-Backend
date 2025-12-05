import pool from "../config/db.js";
import dotenv from "dotenv";

dotenv.config();

/**
 * Script to check product image URLs and identify products with invalid/broken image URLs
 */

async function checkProductImageUrls() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Checking product image URLs...\n');
    
    // Get all products with their images
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
    
    if (products.length === 0) {
      console.log('✅ No products found.');
      return;
    }
    
    console.log(`📦 Total Products: ${products.length}\n`);
    
    const productsWithIssues = [];
    const productsWithValidImages = [];
    
    products.forEach((product) => {
      let hasValidImage = false;
      let imageUrls = [];
      let issues = [];
      
      // Check images array (new format)
      if (product.images) {
        try {
          // Check if images is empty array
          const imagesStr = JSON.stringify(product.images);
          if (imagesStr === '[]' || imagesStr === 'null') {
            issues.push('Images array is empty');
          } else {
            const imagesArray = JSON.parse(imagesStr);
            if (Array.isArray(imagesArray) && imagesArray.length > 0) {
              imagesArray.forEach((img, idx) => {
                if (img && typeof img === 'string' && img.trim() !== '') {
                  imageUrls.push(img);
                  // Check if URL is valid
                  if (img.startsWith('http://') || img.startsWith('https://') || img.startsWith('/')) {
                    hasValidImage = true;
                  } else {
                    issues.push(`Image ${idx + 1}: Invalid URL format - "${img.substring(0, 50)}..."`);
                  }
                } else {
                  issues.push(`Image ${idx + 1}: Empty or invalid`);
                }
              });
            } else {
              issues.push('Images array is empty');
            }
          }
        } catch (error) {
          issues.push(`Error parsing images: ${error.message}`);
        }
      }
      
      // Check legacy image_url
      if (!hasValidImage && product.image_url) {
        const imgUrl = product.image_url.trim();
        if (imgUrl !== '') {
          imageUrls.push(imgUrl);
          if (imgUrl.startsWith('http://') || imgUrl.startsWith('https://') || imgUrl.startsWith('/')) {
            hasValidImage = true;
          } else {
            issues.push(`Legacy image_url: Invalid URL format - "${imgUrl.substring(0, 50)}..."`);
          }
        }
      }
      
      if (!hasValidImage) {
        if (imageUrls.length === 0) {
          issues.push('No images found');
        }
        productsWithIssues.push({
          ...product,
          imageUrls,
          issues
        });
      } else {
        productsWithValidImages.push({
          ...product,
          imageUrls
        });
      }
    });
    
    // Display results
    console.log('📊 Results:\n');
    console.log(`✅ Products with valid image URLs: ${productsWithValidImages.length}`);
    console.log(`❌ Products with invalid/missing image URLs: ${productsWithIssues.length}\n`);
    
    if (productsWithIssues.length > 0) {
      console.log('❌ Products with Image Issues:\n');
      productsWithIssues.forEach((product, index) => {
        console.log(`${index + 1}. ID: ${product.id}, Title: "${product.title}", Status: ${product.status}`);
        console.log(`   Created: ${product.created_at}`);
        if (product.imageUrls.length > 0) {
          console.log(`   Image URLs found: ${product.imageUrls.length}`);
          product.imageUrls.forEach((url, idx) => {
            console.log(`      ${idx + 1}. ${url.substring(0, 80)}${url.length > 80 ? '...' : ''}`);
          });
        }
        if (product.issues.length > 0) {
          console.log(`   Issues:`);
          product.issues.forEach(issue => {
            console.log(`      - ${issue}`);
          });
        }
        console.log('');
      });
      
      console.log('\n⚠️  These products need to be fixed or deleted.\n');
      console.log('To delete products with invalid images, run:');
      console.log('   npm run delete:no-images\n');
    }
    
    if (productsWithValidImages.length > 0) {
      console.log('✅ Products with Valid Images:\n');
      productsWithValidImages.forEach((product, index) => {
        const imageCount = product.imageUrls.length;
        console.log(`${index + 1}. ID: ${product.id}, Title: "${product.title}", Images: ${imageCount}, Status: ${product.status}`);
        if (product.imageUrls.length > 0 && product.imageUrls.length <= 3) {
          product.imageUrls.forEach((url, idx) => {
            console.log(`      ${idx + 1}. ${url.substring(0, 80)}${url.length > 80 ? '...' : ''}`);
          });
        } else if (product.imageUrls.length > 3) {
          console.log(`      First image: ${product.imageUrls[0].substring(0, 80)}${product.imageUrls[0].length > 80 ? '...' : ''}`);
          console.log(`      ... and ${product.imageUrls.length - 1} more`);
        }
      });
    }
    
    // Summary
    console.log('\n📈 Summary:');
    console.log(`   Total Products: ${products.length}`);
    console.log(`   Valid Images: ${productsWithValidImages.length} (${((productsWithValidImages.length / products.length) * 100).toFixed(1)}%)`);
    console.log(`   Invalid/Missing: ${productsWithIssues.length} (${((productsWithIssues.length / products.length) * 100).toFixed(1)}%)`);
    
  } catch (error) {
    console.error('❌ Error checking products:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Run the script
checkProductImageUrls()
  .then(() => {
    console.log('\n✅ Check completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Check failed:', error);
    process.exit(1);
  });

