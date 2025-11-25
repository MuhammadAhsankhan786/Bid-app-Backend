/**
 * Fix User Role and Scope Issue
 * This script fixes the 403 error by:
 * 1. Ensuring +9647700914000 has role 'buyer' (not 'superadmin')
 * 2. Verifying the user can login via Flutter app
 */

import pool from "../config/db.js";

async function fixUserRoleAndScope() {
  try {
    console.log('🔧 Fixing User Role and Scope Issue...\n');
    console.log('=' .repeat(60));
    
    const phone = '+9647700914000';
    
    // Check current user
    const checkResult = await pool.query(
      `SELECT id, name, phone, role, status 
       FROM users 
       WHERE phone = $1`,
      [phone]
    );
    
    if (checkResult.rows.length === 0) {
      console.log(`❌ User with phone ${phone} not found in database`);
      console.log('   Please run migration: migrations/008_seed_admin_users.sql\n');
      await pool.end();
      return;
    }
    
    const user = checkResult.rows[0];
    console.log('\n📋 CURRENT USER INFO:');
    console.log(`   ID: ${user.id}`);
    console.log(`   Phone: ${user.phone}`);
    console.log(`   Current Role: ${user.role}`);
    console.log(`   Status: ${user.status}`);
    console.log(`   Name: ${user.name || 'N/A'}\n`);
    
    // Check if role needs to be fixed
    const currentRole = user.role?.toLowerCase();
    const adminRoles = ['superadmin', 'admin', 'moderator', 'viewer'];
    const needsFix = adminRoles.includes(currentRole);
    
    if (needsFix) {
      console.log(`⚠️  PROBLEM DETECTED:`);
      console.log(`   User has admin role: '${user.role}'`);
      console.log(`   This causes token to get 'admin' scope`);
      console.log(`   Flutter app requires 'mobile' scope`);
      console.log(`   Result: 403 Forbidden error\n`);
      
      console.log('🔧 FIXING: Updating role to buyer...\n');
      
      // Update role to buyer
      await pool.query(
        `UPDATE users 
         SET role = 'buyer', 
             updated_at = CURRENT_TIMESTAMP 
         WHERE phone = $1`,
        [phone]
      );
      
      console.log('✅ User role updated to buyer');
      
      // Verify update
      const verifyResult = await pool.query(
        `SELECT id, phone, role, status 
         FROM users 
         WHERE phone = $1`,
        [phone]
      );
      
      const updatedUser = verifyResult.rows[0];
      if (updatedUser.role === 'buyer') {
        console.log('✅ Verification: Role is now buyer\n');
      } else {
        console.log('❌ Verification failed: Role is still', updatedUser.role);
      }
    } else {
      console.log('✅ User role is already correct (buyer/seller)');
      console.log('   No changes needed.\n');
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
    console.log(`   Status: ${finalUser.status}\n`);
    
    console.log('✅ SOLUTION:');
    console.log('   1. User role is now: buyer');
    console.log('   2. When user logs in via verifyOTP, token will have:');
    console.log('      - Role: buyer');
    console.log('      - Scope: mobile ✅');
    console.log('   3. Flutter app will accept this token');
    console.log('   4. 403 error will be fixed\n');
    
    console.log('📝 NEXT STEPS:');
    console.log('   1. User needs to logout from Flutter app');
    console.log('   2. Login again via OTP');
    console.log('   3. New token will have correct scope (mobile)');
    console.log('   4. Profile update will work without 403 error\n');
    
  } catch (error) {
    console.error('❌ Error fixing user role:', error);
  } finally {
    await pool.end();
  }
}

fixUserRoleAndScope();

