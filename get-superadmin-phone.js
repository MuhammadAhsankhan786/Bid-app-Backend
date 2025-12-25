/**
 * Quick script to get Superadmin phone number
 */

import pool from './src/config/db.js';
import dotenv from 'dotenv';

dotenv.config();

async function getSuperadminPhone() {
  try {
    const result = await pool.query(
      `SELECT id, name, email, phone, role 
       FROM users 
       WHERE role IN ('superadmin', 'admin')
       ORDER BY id ASC
       LIMIT 1`
    );
    
    if (result.rows.length === 0) {
      console.log('❌ No Superadmin found');
      return;
    }
    
    const superadmin = result.rows[0];
    console.log('\n✅ Superadmin Found:');
    console.log(`   ID: ${superadmin.id}`);
    console.log(`   Name: ${superadmin.name}`);
    console.log(`   Phone: ${superadmin.phone}`);
    console.log(`   Email: ${superadmin.email}`);
    console.log(`   Role: ${superadmin.role}`);
    
    console.log('\n📝 Add this to your .env file:');
    console.log(`   ADMIN_PHONE=${superadmin.phone}`);
    console.log(`   ADMIN_PASSWORD=admin123`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

getSuperadminPhone();

