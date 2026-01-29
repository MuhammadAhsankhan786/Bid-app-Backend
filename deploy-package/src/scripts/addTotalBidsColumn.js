import pool from "../config/db.js";
import dotenv from "dotenv";

dotenv.config();

async function addTotalBidsColumn() {
  try {
    console.log('🔧 Adding total_bids column to products table...\n');

    // Check if column exists
    const columnCheck = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'products' AND column_name = 'total_bids'
    `);

    if (columnCheck.rows.length > 0) {
      console.log('✅ total_bids column already exists. Skipping.\n');
      await pool.end();
      return;
    }

    // Add the column
    await pool.query(`
      ALTER TABLE products 
      ADD COLUMN total_bids INTEGER DEFAULT 0
    `);
    console.log('✅ Added total_bids column\n');

    // Update existing products with actual bid counts
    console.log('📊 Updating total_bids for existing products...');
    const updateResult = await pool.query(`
      UPDATE products p
      SET total_bids = (
        SELECT COUNT(*) 
        FROM bids b 
        WHERE b.product_id = p.id
      )
      WHERE EXISTS (
        SELECT 1 FROM bids WHERE product_id = p.id
      )
    `);
    console.log(`✅ Updated ${updateResult.rowCount} products with bid counts\n`);

    // Verify
    const verify = await pool.query(`
      SELECT id, title, total_bids,
             (SELECT COUNT(*) FROM bids WHERE product_id = products.id) as actual_count
      FROM products 
      WHERE status = 'approved'
      LIMIT 5
    `);
    
    console.log('📋 Verification:');
    verify.rows.forEach((p, i) => {
      console.log(`   ${i + 1}. ${p.title}: total_bids=${p.total_bids}, actual=${p.actual_count}`);
    });

    await pool.end();
    console.log('\n✅ Migration completed!');
  } catch (error) {
    console.error('❌ Error:', error);
    console.error('   Message:', error.message);
    await pool.end();
    process.exit(1);
  }
}

addTotalBidsColumn();

