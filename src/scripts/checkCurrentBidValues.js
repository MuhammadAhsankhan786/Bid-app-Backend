import pool from "../config/db.js";
import dotenv from "dotenv";

dotenv.config();

async function checkCurrentBidValues() {
  try {
    console.log('🔍 Checking current_bid and current_price values in database...\n');

    const products = await pool.query(`
      SELECT 
        id, title,
        current_bid, current_price,
        starting_bid, starting_price,
        NULLIF(current_bid, 0) as nullif_current_bid,
        NULLIF(current_price, 0) as nullif_current_price,
        COALESCE(NULLIF(current_bid, 0), NULLIF(current_price, 0), starting_bid, starting_price, 0) as calculated_current_bid
      FROM products 
      WHERE status = 'approved'
    `);

    console.log('📊 Products with bid/price values:');
    products.rows.forEach((p, i) => {
      console.log(`\n   ${i + 1}. ${p.title} (ID: ${p.id})`);
      console.log(`      current_bid (raw): ${p.current_bid} (type: ${typeof p.current_bid})`);
      console.log(`      current_price (raw): ${p.current_price} (type: ${typeof p.current_price})`);
      console.log(`      NULLIF(current_bid, 0): ${p.nullif_current_bid}`);
      console.log(`      NULLIF(current_price, 0): ${p.nullif_current_price}`);
      console.log(`      COALESCE result: ${p.calculated_current_bid}`);
    });

    await pool.end();
  } catch (error) {
    console.error('❌ Error:', error);
    await pool.end();
    process.exit(1);
  }
}

checkCurrentBidValues();

