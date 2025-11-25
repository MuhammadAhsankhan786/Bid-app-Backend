/**
 * Verify Admin Login - Check if admin users exist in database
 * This script verifies all admin panel login credentials
 */

import pool from "../config/db.js";

async function verifyAdminLogin() {
  try {
    console.log('🔍 Verifying Admin Panel Login Credentials...\n');
    console.log('=' .repeat(60));
    
    // Required admin users
    const adminUsers = [
      { phone: '+9647500914000', role: 'superadmin', name: 'Super Admin' },
      { phone: '+9647800914000', role: 'moderator', name: 'Moderator' }
    ];
    
    console.log('\n📋 Checking Admin Users in Database:\n');
    
    let allFound = true;
    for (const adminUser of adminUsers) {
      const result = await pool.query(
        `SELECT id, name, phone, role, status 
         FROM users 
         WHERE phone = $1`,
        [adminUser.phone]
      );
      
      if (result.rows.length === 0) {
        console.log(`❌ ${adminUser.name} - NOT FOUND`);
        console.log(`   Phone: ${adminUser.phone}`);
        console.log(`   Expected Role: ${adminUser.role}`);
        console.log(`   Status: User does not exist in database\n`);
        allFound = false;
      } else {
        const user = result.rows[0];
        const roleMatch = user.role?.toLowerCase() === adminUser.role.toLowerCase();
        const statusOk = user.status === 'approved';
        
        const icon = roleMatch && statusOk ? '✅' : '⚠️';
        console.log(`${icon} ${adminUser.name}`);
        console.log(`   Phone: ${user.phone}`);
        console.log(`   Role: ${user.role} (Expected: ${adminUser.role})`);
        console.log(`   Status: ${user.status}`);
        console.log(`   Name: ${user.name || 'N/A'}`);
        
        if (!roleMatch) {
          console.log(`   ⚠️  ROLE MISMATCH! Expected: ${adminUser.role}, Found: ${user.role}`);
          allFound = false;
        }
        if (!statusOk) {
          console.log(`   ⚠️  STATUS ISSUE! Should be 'approved', Found: ${user.status}`);
          allFound = false;
        }
        console.log('');
      }
    }
    
    // Test login query (same as admin-login endpoint)
    console.log('=' .repeat(60));
    console.log('\n🧪 Testing Login Query (Same as admin-login endpoint):\n');
    
    for (const adminUser of adminUsers) {
      const testResult = await pool.query(
        `SELECT id, name, email, phone, role, status 
         FROM users 
         WHERE phone = $1 AND role = $2`,
        [adminUser.phone, adminUser.role]
      );
      
      if (testResult.rows.length > 0) {
        console.log(`✅ ${adminUser.name} - Login Query SUCCESS`);
        console.log(`   Phone: ${adminUser.phone}`);
        console.log(`   Role: ${adminUser.role}`);
        console.log(`   User ID: ${testResult.rows[0].id}\n`);
      } else {
        console.log(`❌ ${adminUser.name} - Login Query FAILED`);
        console.log(`   Phone: ${adminUser.phone}`);
        console.log(`   Role: ${adminUser.role}`);
        console.log(`   Error: No user found with matching phone AND role\n`);
        
        // Check what exists
        const checkResult = await pool.query(
          `SELECT phone, role FROM users WHERE phone = $1`,
          [adminUser.phone]
        );
        if (checkResult.rows.length > 0) {
          console.log(`   Found user with phone but different role:`);
          console.log(`   Phone: ${checkResult.rows[0].phone}`);
          console.log(`   Role: ${checkResult.rows[0].role} (Expected: ${adminUser.role})\n`);
        }
      }
    }
    
    // Summary
    console.log('=' .repeat(60));
    if (allFound) {
      console.log('\n✅ All admin users are correctly configured!');
      console.log('   Admin panel login should work.\n');
    } else {
      console.log('\n⚠️  Some admin users are missing or misconfigured.');
      console.log('   Please run: migrations/008_seed_admin_users.sql\n');
    }
    
  } catch (error) {
    console.error('❌ Error verifying admin login:', error);
  } finally {
    await pool.end();
  }
}

verifyAdminLogin();

