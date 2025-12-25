/**
 * Script to find or reset Superadmin password
 * This helps identify the correct password for test scripts
 */

import pool from './src/config/db.js';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';

dotenv.config();

async function findSuperadminPassword() {
  try {
    console.log('\n🔍 Finding Superadmin user...\n');
    
    // Find Superadmin user
    const result = await pool.query(
      `SELECT id, name, email, phone, role, password 
       FROM users 
       WHERE role IN ('superadmin', 'admin')
       ORDER BY id ASC
       LIMIT 1`
    );
    
    if (result.rows.length === 0) {
      console.log('❌ No Superadmin found in database');
      console.log('\n💡 You may need to create a Superadmin user first.');
      return;
    }
    
    const superadmin = result.rows[0];
    console.log('✅ Found Superadmin:');
    console.log(`   ID: ${superadmin.id}`);
    console.log(`   Name: ${superadmin.name}`);
    console.log(`   Email: ${superadmin.email}`);
    console.log(`   Phone: ${superadmin.phone}`);
    console.log(`   Role: ${superadmin.role}`);
    console.log(`   Has Password: ${superadmin.password ? 'Yes (hashed)' : 'No'}`);
    
    if (!superadmin.password) {
      console.log('\n⚠️  Superadmin has no password set!');
      console.log('\n💡 Options:');
      console.log('   1. Reset password using the script below');
      console.log('   2. Use admin-login endpoint (phone + role, no password needed)');
      return;
    }
    
    // Test common passwords
    console.log('\n🔐 Testing common passwords...\n');
    
    const commonPasswords = [
      'admin123',
      'admin',
      'password',
      '123456',
      'admin@123',
      'Admin123',
      'superadmin',
      'Superadmin123'
    ];
    
    let found = false;
    for (const testPassword of commonPasswords) {
      const match = await bcrypt.compare(testPassword, superadmin.password);
      if (match) {
        console.log(`✅ PASSWORD FOUND: "${testPassword}"`);
        console.log(`\n📝 Add this to your .env file:`);
        console.log(`   ADMIN_PASSWORD=${testPassword}`);
        found = true;
        break;
      }
    }
    
    if (!found) {
      console.log('❌ None of the common passwords matched.');
      console.log('\n💡 Options:');
      console.log('   1. Reset the password (see script below)');
      console.log('   2. Check your database seed/migration scripts');
      console.log('   3. Ask the database administrator');
      
      console.log('\n📝 To reset password, run:');
      console.log('   node reset-superadmin-password.js <new_password>');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

findSuperadminPassword();

