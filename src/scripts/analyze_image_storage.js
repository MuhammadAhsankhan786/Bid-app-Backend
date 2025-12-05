/**
 * Analyze Image Storage in Database
 * Shows how images are stored in products table
 */

import pool from "../config/db.js";

async function analyzeImageStorage() {
  try {
    console.log('📸 ========================================');
    console.log('📸 IMAGE STORAGE ANALYSIS');
    console.log('📸 ========================================\n');
    
    const result = await pool.query(
      `SELECT id, title, image_url, images, 
              pg_typeof(image_url) as image_url_type,
              pg_typeof(images) as images_type
       FROM products 
       LIMIT 5`
    );
    
    if (result.rows.length === 0) {
      console.log('❌ No products found');
      process.exit(1);
    }
    
    console.log('📊 DATABASE SCHEMA:');
    console.log('─'.repeat(50));
    console.log('   Column: image_url');
    console.log('   Type: TEXT (String)');
    console.log('   Purpose: Single image URL (legacy/backward compatibility)');
    console.log('');
    console.log('   Column: images');
    console.log('   Type: JSONB (JSON Binary)');
    console.log('   Purpose: Array of image URLs (new format)');
    console.log('');
    
    console.log('📦 SAMPLE DATA:');
    console.log('─'.repeat(50));
    
    result.rows.forEach((product, index) => {
      console.log(`\n${index + 1}. Product ID: ${product.id}`);
      console.log(`   Title: ${product.title}`);
      console.log(`   image_url (TEXT): ${product.image_url || 'NULL'}`);
      console.log(`   image_url type: ${product.image_url_type}`);
      
      // Parse images JSONB
      let imagesArray = [];
      if (product.images) {
        try {
          imagesArray = typeof product.images === 'string' 
            ? JSON.parse(product.images) 
            : product.images;
        } catch (e) {
          imagesArray = [];
        }
      }
      
      console.log(`   images (JSONB): ${JSON.stringify(imagesArray)}`);
      console.log(`   images type: ${product.images_type}`);
      console.log(`   images count: ${Array.isArray(imagesArray) ? imagesArray.length : 0}`);
    });
    
    console.log('\n\n📋 STORAGE FORMAT SUMMARY:');
    console.log('─'.repeat(50));
    console.log('1. image_url (TEXT):');
    console.log('   - Stores: Single URL string');
    console.log('   - Example: "http://localhost:5000/uploads/products/image.jpg"');
    console.log('   - Used for: Backward compatibility');
    console.log('');
    console.log('2. images (JSONB):');
    console.log('   - Stores: Array of URL strings');
    console.log('   - Example: ["http://localhost:5000/uploads/products/image1.jpg", "http://localhost:5000/uploads/products/image2.jpg"]');
    console.log('   - Used for: Multiple images support');
    console.log('');
    
    console.log('📸 ========================================\n');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

analyzeImageStorage();

