/**
 * Create Admin Users NOW - Immediate fix for admin login
 * This script creates all required admin users in the database
 * Also sets password for Superadmin (required for special endpoint)
 */

import pool from "../config/db.js";
import bcrypt from "bcrypt";

async function createAdminUsers() {
  try {
    console.log('🔧 Creating Admin Users in Database...\n');
    console.log('=' .repeat(60));
    
    const adminUsers = [
      {
        phone: '+9647500914000',  // Superadmin phone (fixed)
        role: 'superadmin',
        name: 'Super Admin',
        email: 'superadmin@bidmaster.com'
      },
      {
        phone: '+9647800914000',  // Moderator phone (fixed)
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
        
        // Update if role is wrong OR if Superadmin has no password
        const needsUpdate = existing.role !== adminUser.role;
        const needsPassword = adminUser.role === 'superadmin' && !existing.password;
        
        if (needsUpdate || needsPassword) {
          let updateFields = [];
          let updateValues = [];
          let paramCount = 1;
          
          if (needsUpdate) {
            updateFields.push(`role = $${paramCount++}`);
            updateValues.push(adminUser.role);
          }
          
          updateFields.push(`name = $${paramCount++}`);
          updateValues.push(adminUser.name);
          
          updateFields.push(`email = $${paramCount++}`);
          updateValues.push(adminUser.email);
          
          updateFields.push(`status = 'approved'`);
          updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
          
          // Set password if Superadmin has no password
          if (needsPassword) {
            const defaultPassword = process.env.ADMIN_PASSWORD || 'admin123';
            const passwordHash = await bcrypt.hash(defaultPassword, 10);
            updateFields.push(`password = $${paramCount++}`);
            updateValues.push(passwordHash);
            console.log(`   🔐 Setting password for Superadmin (default: ${defaultPassword})`);
            console.log(`   💡 To change password, update ADMIN_PASSWORD in .env and run this script again`);
          }
          
          updateValues.push(adminUser.phone); // For WHERE clause
          
          await pool.query(
            `UPDATE users 
             SET ${updateFields.join(', ')}
             WHERE phone = $${paramCount}`,
            updateValues
          );
          
          if (needsUpdate) {
            console.log(`   ✅ Updated role to: ${adminUser.role}`);
          }
          if (needsPassword) {
            console.log(`   ✅ Password set for Superadmin`);
          }
        } else {
          console.log(`   ✅ Role is correct, no update needed`);
        }
      } else {
        // Create new user
        // For Superadmin, also set password (required for special endpoint)
        let passwordHash = null;
        if (adminUser.role === 'superadmin') {
          const defaultPassword = process.env.ADMIN_PASSWORD || 'admin123';
          passwordHash = await bcrypt.hash(defaultPassword, 10);
          console.log(`   🔐 Setting password for Superadmin (default: ${defaultPassword})`);
          console.log(`   💡 To change password, update ADMIN_PASSWORD in .env and run this script again`);
        }
        
        const insertResult = await pool.query(
          `INSERT INTO users (name, email, phone, role, status, password, created_at, updated_at)
           VALUES ($1, $2, $3, $4, 'approved', $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
           RETURNING id, name, phone, role, status`,
          [adminUser.name, adminUser.email, adminUser.phone, adminUser.role, passwordHash]
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

