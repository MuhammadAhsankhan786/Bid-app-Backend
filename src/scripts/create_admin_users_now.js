/**
 * Create Admin Users NOW - Immediate fix for admin login
 * This script creates all required admin users in the database
 */

import pool from "../config/db.js";

async function createAdminUsers() {
  try {
    console.log('🔧 Creating Admin Users in Database...\n');
    console.log('=' .repeat(60));
    
    const adminUsers = [
      {
        phone: '+9647500914000',
        role: 'superadmin',
        name: 'Super Admin',
        email: 'superadmin@bidmaster.com'
      },
      {
        phone: '+9647800914000',
        role: 'moderator',
        name: 'Moderator',
        email: 'moderator@bidmaster.com'
      }
    ];
    
    for (const adminUser of adminUsers) {
      console.log(`\n📱 Creating: ${adminUser.name}`);
      console.log(`   Phone: ${adminUser.phone}`);
      console.log(`   Role: ${adminUser.role}`);
      
      // Check if user exists
      const checkResult = await pool.query(
        `SELECT id, phone, role FROM users WHERE phone = $1`,
        [adminUser.phone]
      );
      
      if (checkResult.rows.length > 0) {
        const existing = checkResult.rows[0];
        console.log(`   ⚠️  User exists with role: ${existing.role}`);
        
        // Update if role is wrong
        if (existing.role !== adminUser.role) {
          await pool.query(
            `UPDATE users 
             SET role = $1, 
                 name = $2,
                 email = $3,
                 status = 'approved',
                 updated_at = CURRENT_TIMESTAMP 
             WHERE phone = $4`,
            [adminUser.role, adminUser.name, adminUser.email, adminUser.phone]
          );
          console.log(`   ✅ Updated role to: ${adminUser.role}`);
        } else {
          console.log(`   ✅ Role is correct, no update needed`);
        }
      } else {
        // Create new user
        const insertResult = await pool.query(
          `INSERT INTO users (name, email, phone, role, status, created_at, updated_at)
           VALUES ($1, $2, $3, $4, 'approved', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
           RETURNING id, name, phone, role, status`,
          [adminUser.name, adminUser.email, adminUser.phone, adminUser.role]
        );
        
        const newUser = insertResult.rows[0];
        console.log(`   ✅ Created user with ID: ${newUser.id}`);
      }
    }
    
    // Verify all users
    console.log('\n' + '=' .repeat(60));
    console.log('\n✅ VERIFICATION:\n');
    
    for (const adminUser of adminUsers) {
      const verifyResult = await pool.query(
        `SELECT id, name, phone, role, status 
         FROM users 
         WHERE phone = $1 AND role = $2`,
        [adminUser.phone, adminUser.role]
      );
      
      if (verifyResult.rows.length > 0) {
        const user = verifyResult.rows[0];
        console.log(`✅ ${adminUser.name}:`);
        console.log(`   ID: ${user.id}`);
        console.log(`   Phone: ${user.phone}`);
        console.log(`   Role: ${user.role}`);
        console.log(`   Status: ${user.status}`);
        console.log(`   ✅ Login query will work!\n`);
      } else {
        console.log(`❌ ${adminUser.name}: NOT FOUND\n`);
      }
    }
    
    // Test login query (same as backend)
    console.log('=' .repeat(60));
    console.log('\n🧪 TESTING LOGIN QUERY (Same as backend):\n');
    
    const testPhone = '+9647500914000';
    const testRole = 'superadmin';
    
    const testResult = await pool.query(
      `SELECT id, name, email, phone, role, status 
       FROM users 
       WHERE phone = $1 AND role = $2`,
      [testPhone, testRole]
    );
    
    if (testResult.rows.length > 0) {
      console.log('✅ Login query SUCCESS!');
      console.log(`   Found user: ${testResult.rows[0].name}`);
      console.log(`   Phone: ${testResult.rows[0].phone}`);
      console.log(`   Role: ${testResult.rows[0].role}`);
      console.log('\n✅ Admin login will work now!\n');
    } else {
      console.log('❌ Login query FAILED!');
      console.log('   User not found with phone and role combination\n');
    }
    
    console.log('=' .repeat(60));
    console.log('\n✅ All admin users created/updated successfully!');
    console.log('   You can now login in admin panel.\n');
    
  } catch (error) {
    console.error('❌ Error creating admin users:', error);
    console.error('   Details:', error.message);
  } finally {
    await pool.end();
  }
}

createAdminUsers();

