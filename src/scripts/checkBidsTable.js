import pool from "../config/db.js";

async function checkBidsTable() {
  try {
    console.log('\n🔍 Checking BIDS table schema...\n');
    
    // Get table columns
    const columns = await pool.query(`
      SELECT 
        column_name, 
        data_type, 
        is_nullable,
        column_default
      FROM information_schema.columns 
      WHERE table_name = 'bids' 
      ORDER BY ordinal_position
    `);
    
    console.log('📋 BIDS Table Columns:');
    columns.rows.forEach(col => {
      console.log(`   ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable}) ${col.column_default ? `default: ${col.column_default}` : ''}`);
    });
    
    // Get constraints
    const constraints = await pool.query(`
      SELECT 
        constraint_name,
        constraint_type
      FROM information_schema.table_constraints 
      WHERE table_name = 'bids'
    `);
    
    console.log('\n🔒 Constraints:');
    constraints.rows.forEach(con => {
      console.log(`   ${con.constraint_name}: ${con.constraint_type}`);
    });
    
    // Get foreign keys
    const foreignKeys = await pool.query(`
      SELECT
        tc.constraint_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY' 
        AND tc.table_name = 'bids'
    `);
    
    if (foreignKeys.rows.length > 0) {
      console.log('\n🔗 Foreign Keys:');
      foreignKeys.rows.forEach(fk => {
        console.log(`   ${fk.column_name} → ${fk.foreign_table_name}.${fk.foreign_column_name}`);
      });
    }
    
    // Check if product_id 4 exists
    const productCheck = await pool.query('SELECT id, title, status, seller_id FROM products WHERE id = $1', [4]);
    console.log('\n📦 Product ID 4:');
    if (productCheck.rows.length > 0) {
      console.log(`   ✅ Found: ${JSON.stringify(productCheck.rows[0], null, 2)}`);
    } else {
      console.log('   ❌ Product ID 4 not found!');
    }
    
    // Check user
    const userCheck = await pool.query('SELECT id, name, phone, role FROM users WHERE phone = $1', ['+9647701234567']);
    console.log('\n👤 User (+9647701234567):');
    if (userCheck.rows.length > 0) {
      console.log(`   ✅ Found: ${JSON.stringify(userCheck.rows[0], null, 2)}`);
    } else {
      console.log('   ❌ User not found!');
    }
    
    // Try to insert a test bid (will rollback)
    if (productCheck.rows.length > 0 && userCheck.rows.length > 0) {
      console.log('\n🧪 Testing bid insert (will rollback)...');
      await pool.query('BEGIN');
      try {
        const testBid = await pool.query(
          'INSERT INTO bids (product_id, user_id, amount) VALUES ($1, $2, $3) RETURNING *',
          [4, userCheck.rows[0].id, 250.00]
        );
        console.log('   ✅ Insert successful:', testBid.rows[0]);
        await pool.query('ROLLBACK');
      } catch (error) {
        await pool.query('ROLLBACK');
        console.log('   ❌ Insert failed:', error.message);
        console.log('   Error code:', error.code);
        console.log('   Error detail:', error.detail);
        console.log('   Error constraint:', error.constraint);
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

checkBidsTable();


