import pool from "../config/db.js";
import dotenv from "dotenv";

dotenv.config();

async function verifyTotalBidsColumn() {
  try {
    console.log('🔍 Verifying total_bids column exists...\n');

    // Check if column exists
    const columnCheck = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'products' AND column_name = 'total_bids'
    `);

    if (columnCheck.rows.length === 0) {
      console.log('❌ total_bids column does NOT exist in products table!');
      console.log('   Need to add it via migration.\n');
    } else {
      console.log('✅ total_bids column exists:');
      console.log(`   Column: ${columnCheck.rows[0].column_name}`);
      console.log(`   Type: ${columnCheck.rows[0].data_type}\n`);
    }

    // Check actual values
    const productsCheck = await pool.query(`
      SELECT id, title, total_bids, 
             (SELECT COUNT(*) FROM bids WHERE product_id = products.id) as actual_bid_count
      FROM products 
      WHERE status = 'approved'
      LIMIT 5
    `);

    console.log('📊 Products with total_bids:');
    productsCheck.rows.forEach((p, i) => {
      console.log(`   ${i + 1}. ${p.title}`);
      console.log(`      total_bids (column): ${p.total_bids ?? 'NULL'}`);
      console.log(`      actual_bid_count: ${p.actual_bid_count}`);
      console.log('');
    });

    await pool.end();
  } catch (error) {
    console.error('❌ Error:', error);
    await pool.end();
    process.exit(1);
  }
}

verifyTotalBidsColumn();

