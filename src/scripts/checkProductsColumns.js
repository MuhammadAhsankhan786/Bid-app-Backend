import pool from "../config/db.js";

async function checkProductsColumns() {
  try {
    const result = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'products' 
        AND column_name IN ('highest_bidder_id', 'total_bids', 'current_bid', 'current_price')
      ORDER BY column_name
    `);
    
    console.log('\n📋 Products Table Columns (for bid update):');
    if (result.rows.length === 0) {
      console.log('   ❌ No matching columns found!');
    } else {
      result.rows.forEach(col => {
        console.log(`   ✅ ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
      });
    }
    
    // Check if all required columns exist
    const required = ['highest_bidder_id', 'total_bids', 'current_bid', 'current_price'];
    const found = result.rows.map(r => r.column_name);
    const missing = required.filter(r => !found.includes(r));
    
    if (missing.length > 0) {
      console.log('\n❌ Missing columns:', missing);
    } else {
      console.log('\n✅ All required columns exist!');
    }
    
    // Test UPDATE query
    console.log('\n🧪 Testing UPDATE query...');
    await pool.query('BEGIN');
    try {
      await pool.query(`
        UPDATE products 
        SET current_bid = $1, 
            current_price = $1,
            highest_bidder_id = $2,
            total_bids = COALESCE(total_bids, 0) + 1
        WHERE id = $3
      `, [250.00, 24, 4]);
      console.log('   ✅ UPDATE query successful');
      await pool.query('ROLLBACK');
    } catch (error) {
      await pool.query('ROLLBACK');
      console.log('   ❌ UPDATE query failed:', error.message);
      console.log('   Error code:', error.code);
      console.log('   Error detail:', error.detail);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

checkProductsColumns();


