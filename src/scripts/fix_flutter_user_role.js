/**
 * Fix Flutter User Role - Ensure +9647700914000 has role 'company_products'
 * This script fixes the 403 error by ensuring correct role in database
 */

import pool from "../config/db.js";

async function fixFlutterUserRole() {
  try {
    console.log('🔧 Fixing Flutter User Role...\n');
    
    const phone = '+9647700914000';
    
    // Check current role
    const checkResult = await pool.query(
      `SELECT id, name, phone, role, status 
       FROM users 
       WHERE phone = $1`,
      [phone]
    );
    
    if (checkResult.rows.length === 0) {
      console.log(`❌ User with phone ${phone} not found in database`);
      console.log('   Please run migration: migrations/008_seed_admin_users.sql');
      return;
    }
    
    const user = checkResult.rows[0];
    console.log('📋 Current User Info:');
    console.log(`   Phone: ${user.phone}`);
    console.log(`   Current Role: ${user.role}`);
    console.log(`   Status: ${user.status}`);
    console.log(`   Name: ${user.name || 'N/A'}\n`);
    
    // Check if role needs to be fixed
    if (user.role?.toLowerCase() === 'company_products' || user.role?.toLowerCase() === 'seller_products') {
      console.log('✅ User role is already correct (company_products/seller_products)');
      console.log('   No changes needed.\n');
    } else {
      console.log(`⚠️  User role is '${user.role}', should be 'company_products'`);
      console.log('   Updating role to company_products...\n');
      
      // Update role to company_products
      await pool.query(
        `UPDATE users 
         SET role = 'company_products', 
             updated_at = CURRENT_TIMESTAMP 
         WHERE phone = $1`,
        [phone]
      );
      
      console.log('✅ User role updated to company_products');
      
      // Verify update
      const verifyResult = await pool.query(
        `SELECT id, phone, role, status 
         FROM users 
         WHERE phone = $1`,
        [phone]
      );
      
      if (verifyResult.rows[0].role === 'company_products') {
        console.log('✅ Verification: Role is now company_products\n');
      } else {
        console.log('❌ Verification failed: Role is still', verifyResult.rows[0].role);
      }
    }
    
    // Final summary
    console.log('=' .repeat(60));
    console.log('\n📋 FINAL STATUS\n');
    const finalResult = await pool.query(
      `SELECT phone, role, status 
       FROM users 
       WHERE phone = $1`,
      [phone]
    );
    
    const finalUser = finalResult.rows[0];
    console.log(`   Phone: ${finalUser.phone}`);
    console.log(`   Role: ${finalUser.role}`);
    console.log(`   Status: ${finalUser.status}`);
    console.log('\n✅ Flutter user is ready for OTP login!');
    console.log('   Token will have scope: mobile');
    console.log('   403 error should be fixed now.\n');
    
  } catch (error) {
    console.error('❌ Error fixing user role:', error);
  } finally {
    await pool.end();
  }
}

fixFlutterUserRole();

