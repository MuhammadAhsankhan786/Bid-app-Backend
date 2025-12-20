/**
 * Test Update User API by checking database directly
 */

import pool from './src/config/db.js';

async function testUpdateUserDirect() {
  console.log('🔍 Testing Update User - Database Direct Check...\n');
  console.log('='.repeat(80));
  
  const userId = 55;
  const testName = 'Updated Test Name';
  
  try {
    // Step 1: Check if user exists
    console.log('📋 Step 1: Check if user exists...');
    const userCheck = await pool.query(
      `SELECT id, name, email, phone, role, status FROM users WHERE id = $1`,
      [userId]
    );
    
    if (userCheck.rows.length === 0) {
      console.log(`❌ User ${userId} not found`);
      process.exit(1);
    }
    
    console.log(`✅ User found:`, userCheck.rows[0]);
    console.log(`   Role: ${userCheck.rows[0].role}`);
    console.log(`   Status: ${userCheck.rows[0].status}\n`);
    
    // Step 2: Check if user can be updated (role check)
    console.log('📋 Step 2: Check role constraint...');
    const role = userCheck.rows[0].role;
    const canUpdate = !['admin', 'superadmin'].includes(role);
    console.log(`   Can update: ${canUpdate} (role: ${role})\n`);
    
    // Step 3: Try UPDATE query directly
    console.log('📋 Step 3: Try UPDATE query directly...');
    try {
      const updateResult = await pool.query(
        `UPDATE users 
         SET name = $1
         WHERE id = $2 AND role NOT IN ('admin', 'superadmin')
         RETURNING id, name, email, phone, role, status, created_at`,
        [testName, userId]
      );
      
      if (updateResult.rows.length === 0) {
        console.log(`❌ UPDATE query returned 0 rows`);
        console.log(`   Possible reasons:`);
        console.log(`   - User role is in blocked list`);
        console.log(`   - User doesn't exist`);
      } else {
        console.log(`✅ UPDATE successful:`, updateResult.rows[0]);
        
        // Revert the change
        await pool.query(
          `UPDATE users SET name = $1 WHERE id = $2`,
          [userCheck.rows[0].name, userId]
        );
        console.log(`   ✅ Reverted change\n`);
      }
    } catch (updateError) {
      console.log(`❌ UPDATE query failed:`);
      console.log(`   Error: ${updateError.message}`);
      console.log(`   Code: ${updateError.code}`);
      console.log(`   Detail: ${updateError.detail}`);
      console.log(`   Constraint: ${updateError.constraint}`);
      console.log(`   Stack: ${updateError.stack}\n`);
    }
    
    // Step 4: Check admin_activity_log table
    console.log('📋 Step 4: Check admin_activity_log table...');
    try {
      const logCheck = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'admin_activity_log'
        )
      `);
      console.log(`   Table exists: ${logCheck.rows[0].exists}`);
      
      if (logCheck.rows[0].exists) {
        // Check columns
        const cols = await pool.query(`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = 'admin_activity_log'
        `);
        console.log(`   Columns: ${cols.rows.map(c => c.column_name).join(', ')}`);
      }
    } catch (logError) {
      console.log(`   ❌ Error checking log table: ${logError.message}`);
    }
    
    console.log('\n');
    console.log('='.repeat(80));
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error('   Error message:', error.message);
    console.error('   Error code:', error.code);
    console.error('   Error detail:', error.detail);
    process.exit(1);
  }
  
  process.exit(0);
}

testUpdateUserDirect();

