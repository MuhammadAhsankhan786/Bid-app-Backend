import pool from "../config/db.js";
import dotenv from "dotenv";

dotenv.config();

async function testCategoryFilter() {
  try {
    console.log('🧪 Testing Category Filter...\n');

    // Check what categories exist
    const categories = await pool.query('SELECT id, name, slug FROM categories');
    console.log('📂 Available Categories:');
    categories.rows.forEach(c => {
      console.log(`   ${c.id}: ${c.name} (slug: ${c.slug})`);
    });

    // Test category filter queries
    const testCategories = ['Electronics', 'Watches', 'Fashion', 'Art'];
    
    for (const cat of testCategories) {
      console.log(`\n🔍 Testing category: "${cat}"`);
      
      const query = `
        SELECT 
          p.id, p.title, c.name as category_name
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE p.status = 'approved'
          AND (LOWER(c.name) = LOWER($1) OR LOWER(c.slug) = LOWER($1))
        LIMIT 5
      `;
      
      try {
        const result = await pool.query(query, [cat]);
        console.log(`   ✅ Found ${result.rows.length} products`);
        result.rows.forEach(p => {
          console.log(`      - ${p.title} (${p.category_name})`);
        });
      } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
      }
    }

    await pool.end();
  } catch (error) {
    console.error('❌ Error:', error);
    await pool.end();
    process.exit(1);
  }
}

testCategoryFilter();

