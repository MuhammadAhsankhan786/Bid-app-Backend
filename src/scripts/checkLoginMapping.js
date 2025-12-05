/**
 * Check Login Mapping - Database ke hisaab se verify karein
 * Kaun login kis se hoga (phone number aur role mapping)
 */

import pool from "../config/db.js";

async function checkLoginMapping() {
  try {
    console.log('🔍 Database Login Mapping Check\n');
    console.log('=' .repeat(60));
    
    // Get all users with their login credentials
    const result = await pool.query(`
      SELECT 
        id,
        name,
        email,
        phone,
        role,
        status,
        created_at,
        updated_at
      FROM users
      WHERE phone IS NOT NULL
      ORDER BY 
        CASE role
          WHEN 'superadmin' THEN 1
          WHEN 'admin' THEN 2
          WHEN 'moderator' THEN 3
          WHEN 'company_products' THEN 4
          WHEN 'seller_products' THEN 5
          ELSE 6
        END,
        phone
    `);
    
    if (result.rows.length === 0) {
      console.log('❌ No users found in database\n');
      return;
    }
    
    console.log(`\n📊 Total Users: ${result.rows.length}\n`);
    console.log('=' .repeat(60));
    
    // Group by login method
    const adminPanelUsers = [];
    const flutterAppUsers = [];
    
    result.rows.forEach(user => {
      const role = user.role?.toLowerCase();
      const adminRoles = ['superadmin', 'admin', 'moderator', 'viewer'];
      
      if (adminRoles.includes(role)) {
        adminPanelUsers.push(user);
      } else {
        flutterAppUsers.push(user);
      }
    });
    
    // Admin Panel Login (No OTP)
    console.log('\n🔐 ADMIN PANEL LOGIN (No OTP Required)\n');
    console.log('   Endpoint: POST /api/auth/admin-login');
    console.log('   Method: Direct phone + role login\n');
    
    if (adminPanelUsers.length > 0) {
      adminPanelUsers.forEach(user => {
        console.log(`   📱 Phone: ${user.phone}`);
        console.log(`      Role: ${user.role}`);
        console.log(`      Name: ${user.name || 'N/A'}`);
        console.log(`      Status: ${user.status}`);
        console.log(`      Login Request:`);
        console.log(`      {`);
        console.log(`        "phone": "${user.phone}",`);
        console.log(`        "role": "${user.role}"`);
        console.log(`      }`);
        console.log('');
      });
    } else {
      console.log('   ⚠️  No admin panel users found\n');
    }
    
    // Flutter App Login (OTP Required)
    console.log('=' .repeat(60));
    console.log('\n📱 FLUTTER APP LOGIN (OTP Required)\n');
    console.log('   Endpoint 1: POST /api/auth/send-otp');
    console.log('   Endpoint 2: POST /api/auth/verify-otp');
    console.log('   Method: Phone + OTP (Twilio Verify)\n');
    
    if (flutterAppUsers.length > 0) {
      flutterAppUsers.forEach(user => {
        console.log(`   📱 Phone: ${user.phone}`);
        console.log(`      Role: ${user.role}`);
        console.log(`      Name: ${user.name || 'N/A'}`);
        console.log(`      Status: ${user.status}`);
        console.log(`      Login Steps:`);
        console.log(`      1. Send OTP: { "phone": "${user.phone}" }`);
        console.log(`      2. Verify OTP: { "phone": "${user.phone}", "otp": "<OTP from SMS>" }`);
        console.log('');
      });
    } else {
      console.log('   ⚠️  No Flutter app users found\n');
    }
    
    // Summary
    console.log('=' .repeat(60));
    console.log('\n📋 SUMMARY\n');
    console.log(`   Admin Panel Users: ${adminPanelUsers.length}`);
    console.log(`   Flutter App Users: ${flutterAppUsers.length}`);
    console.log(`   Total Users: ${result.rows.length}`);
    
    // Check for required phone numbers
    console.log('\n' + '=' .repeat(60));
    console.log('\n✅ REQUIRED PHONE NUMBERS CHECK\n');
    
    const requiredPhones = [
      { phone: '+9647500914000', role: 'superadmin', name: 'Super Admin', method: 'Admin Panel (No OTP)' },
      { phone: '+9647800914000', role: 'moderator', name: 'Moderator', method: 'Admin Panel (No OTP)' },
      { phone: '+9647700914000', role: 'company_products', name: 'Flutter User', method: 'Flutter App (OTP Required)' }
    ];
    
    let allFound = true;
    requiredPhones.forEach(required => {
      const found = result.rows.find(u => u.phone === required.phone);
      if (found) {
        const roleMatch = found.role?.toLowerCase() === required.role.toLowerCase();
        const statusOk = found.status === 'approved';
        const icon = roleMatch && statusOk ? '✅' : '⚠️';
        console.log(`   ${icon} ${required.phone}`);
        console.log(`      Role: ${found.role} (Expected: ${required.role})`);
        console.log(`      Name: ${found.name || 'N/A'}`);
        console.log(`      Status: ${found.status}`);
        console.log(`      Method: ${required.method}`);
        if (!roleMatch) {
          console.log(`      ⚠️  Role mismatch!`);
          allFound = false;
        }
        if (!statusOk) {
          console.log(`      ⚠️  Status should be 'approved'!`);
          allFound = false;
        }
        console.log('');
      } else {
        console.log(`   ❌ ${required.phone} - NOT FOUND`);
        console.log(`      Expected Role: ${required.role}`);
        console.log(`      Method: ${required.method}`);
        console.log('');
        allFound = false;
      }
    });
    
    // Viewer role info
    console.log('   📱 Viewer Role:');
    console.log('      Any Iraq phone number can login as viewer');
    console.log('      Method: Admin Panel (No OTP)');
    console.log('      Auto-created on first login');
    console.log('');
    
    if (allFound) {
      console.log('✅ All required phone numbers are configured correctly!\n');
    } else {
      console.log('⚠️  Some required phone numbers are missing or misconfigured.');
      console.log('   Please run: migrations/008_seed_admin_users.sql\n');
    }
    
    console.log('=' .repeat(60));
    
  } catch (error) {
    console.error('❌ Error checking login mapping:', error);
  } finally {
    await pool.end();
  }
}

checkLoginMapping();

