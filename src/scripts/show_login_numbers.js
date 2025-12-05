/**
 * Show All Login Numbers
 * Display all phone numbers that can be used for login
 */

import pool from "../config/db.js";

async function showLoginNumbers() {
  try {
    console.log('📱 ========================================');
    console.log('📱 LOGIN NUMBERS FOR APPLICATION');
    console.log('📱 ========================================\n');
    
    // Get all users with login roles
    const result = await pool.query(
      `SELECT phone, role, name, status, email 
       FROM users 
       WHERE role IN ('superadmin', 'admin', 'moderator', 'viewer', 'company_products', 'seller_products')
       ORDER BY 
         CASE role 
           WHEN 'superadmin' THEN 1
           WHEN 'admin' THEN 2
           WHEN 'moderator' THEN 3
           WHEN 'viewer' THEN 4
           WHEN 'company_products' THEN 5
           WHEN 'seller_products' THEN 6
         END,
         phone`
    );
    
    if (result.rows.length === 0) {
      console.log('❌ No users found in database');
      process.exit(1);
    }
    
    // Group by role
    const byRole = {};
    result.rows.forEach(user => {
      if (!byRole[user.role]) {
        byRole[user.role] = [];
      }
      byRole[user.role].push(user);
    });
    
    // Display Admin Panel Logins
    console.log('🔐 ADMIN PANEL LOGIN (No OTP Required):');
    console.log('─'.repeat(50));
    
    const adminRoles = ['superadmin', 'admin', 'moderator', 'viewer'];
    adminRoles.forEach(role => {
      if (byRole[role] && byRole[role].length > 0) {
        byRole[role].forEach(user => {
          console.log(`\n📱 ${role.toUpperCase()}:`);
          console.log(`   Phone: ${user.phone}`);
          console.log(`   Name: ${user.name || 'N/A'}`);
          console.log(`   Status: ${user.status}`);
          console.log(`   Login Method: Admin Panel (Direct Login)`);
        });
      }
    });
    
    // Display Flutter App Logins
    console.log('\n\n📱 FLUTTER APP LOGIN (OTP Required):');
    console.log('─'.repeat(50));
    
    const appRoles = ['company_products', 'seller_products'];
    appRoles.forEach(role => {
      if (byRole[role] && byRole[role].length > 0) {
        byRole[role].forEach(user => {
          console.log(`\n📱 ${role.toUpperCase()}:`);
          console.log(`   Phone: ${user.phone}`);
          console.log(`   Name: ${user.name || 'N/A'}`);
          console.log(`   Status: ${user.status}`);
          console.log(`   Login Method: Flutter App (OTP via SMS)`);
        });
      }
    });
    
    // Summary
    console.log('\n\n📊 SUMMARY:');
    console.log('─'.repeat(50));
    console.log(`   Total Users: ${result.rows.length}`);
    Object.keys(byRole).forEach(role => {
      console.log(`   ${role}: ${byRole[role].length} user(s)`);
    });
    
    console.log('\n\n💡 NOTES:');
    console.log('─'.repeat(50));
    console.log('   • Admin Panel: Use phone + role (no OTP)');
    console.log('   • Flutter App: Use phone + OTP (SMS)');
    console.log('   • Phone format: +964XXXXXXXXXX or 964XXXXXXXXXX');
    console.log('   • OTP_BYPASS=true: Any OTP code works (dev mode)');
    
    console.log('\n📱 ========================================\n');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

showLoginNumbers();

