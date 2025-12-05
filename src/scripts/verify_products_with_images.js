import pool from "../config/db.js";
import dotenv from "dotenv";

dotenv.config();

/**
 * Script to verify that all products in database have valid images
 * This will:
 * 1. Count total products
 * 2. Count products with valid images
 * 3. Count products without images
 * 4. Show details of any products without images
 */

async function verifyProductsWithImages() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Verifying products with images...\n');
    
    // Step 1: Get total products count
    const totalCountResult = await client.query('SELECT COUNT(*) as count FROM products');
    const totalProducts = parseInt(totalCountResult.rows[0].count);
    
    console.log(`📦 Total Products: ${totalProducts}\n`);
    
    if (totalProducts === 0) {
      console.log('✅ No products in database.');
      return;
    }
    
    // Step 2: Find products WITH valid images
    const productsWithImagesQuery = `
      SELECT 
        id, 
        title, 
        images,
        image_url,
        status,
        created_at
      FROM products
      WHERE 
        -- Has valid images array
        (images IS NOT NULL AND images != '[]'::jsonb AND jsonb_array_length(images) > 0)
        OR
        -- Has valid image_url
        (image_url IS NOT NULL AND image_url != '' AND TRIM(image_url) != '')
    `;
    
    const productsWithImagesResult = await client.query(productsWithImagesQuery);
    const productsWithImages = productsWithImagesResult.rows;
    
    // Step 3: Find products WITHOUT images
    const productsWithoutImagesQuery = `
      SELECT 
        id, 
        title, 
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
    
    const productsWithoutImagesResult = await client.query(productsWithoutImagesQuery);
    const productsWithoutImages = productsWithoutImagesResult.rows;
    
    // Step 4: Display results
    console.log('📊 Verification Results:\n');
    console.log(`✅ Products WITH valid images: ${productsWithImages.length}`);
    console.log(`❌ Products WITHOUT images: ${productsWithoutImages.length}\n`);
    
    if (productsWithImages.length > 0) {
      console.log('✅ Products with Valid Images:');
      productsWithImages.forEach((product, index) => {
        const imageCount = product.images ? JSON.parse(JSON.stringify(product.images)).length : 0;
        const hasImageUrl = product.image_url && product.image_url.trim() !== '';
        const imageInfo = imageCount > 0 ? `${imageCount} image(s)` : (hasImageUrl ? '1 image (legacy)' : 'N/A');
        
        console.log(`   ${index + 1}. ID: ${product.id}, Title: "${product.title}", Images: ${imageInfo}, Status: ${product.status}`);
      });
      console.log('');
    }
    
    if (productsWithoutImages.length > 0) {
      console.log('❌ Products WITHOUT Images (Need to be deleted):');
      productsWithoutImages.forEach((product, index) => {
        console.log(`   ${index + 1}. ID: ${product.id}, Title: "${product.title}", Status: ${product.status}, Created: ${product.created_at}`);
      });
      console.log('');
      console.log('⚠️  WARNING: Found products without images!');
      console.log('   Run: npm run delete:no-images to delete them\n');
    } else {
      console.log('✅ SUCCESS: All products have valid images!\n');
    }
    
    // Step 5: Summary statistics
    console.log('📈 Summary Statistics:');
    console.log(`   Total Products: ${totalProducts}`);
    console.log(`   With Images: ${productsWithImages.length} (${((productsWithImages.length / totalProducts) * 100).toFixed(1)}%)`);
    console.log(`   Without Images: ${productsWithoutImages.length} (${((productsWithoutImages.length / totalProducts) * 100).toFixed(1)}%)`);
    
    // Step 6: Status breakdown
    const statusBreakdown = await client.query(`
      SELECT 
        status,
        COUNT(*) as count
      FROM products
      GROUP BY status
      ORDER BY count DESC
    `);
    
    if (statusBreakdown.rows.length > 0) {
      console.log('\n📋 Products by Status:');
      statusBreakdown.rows.forEach(row => {
        console.log(`   ${row.status}: ${row.count}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error verifying products:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Run the script
verifyProductsWithImages()
  .then(() => {
    console.log('\n✅ Verification completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Verification failed:', error);
    process.exit(1);
  });

