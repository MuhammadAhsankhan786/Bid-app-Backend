/**
 * Create ONE NUMBER LOGIN USER
 * 
 * This script creates a user with the ONE NUMBER LOGIN PHONE
 * that can be used for both buyer and seller roles.
 * 
 * Phone: +9647701234567
 * OTP: 1234 (always works in test mode)
 */

import pool from '../config/db.js';
import bcrypt from 'bcrypt';

const ONE_NUMBER_LOGIN_PHONE = '+9647701234567';
// Note: OTP is sent via Twilio Verify API, not hardcoded

async function createOneNumberUser() {
  try {
    console.log('\n🎯 Creating ONE NUMBER LOGIN USER');
    console.log(`📱 Phone: ${ONE_NUMBER_LOGIN_PHONE}`);
    console.log(`📱 Phone: ${ONE_NUMBER_LOGIN_PHONE}\n`);
    console.log(`💡 OTP will be sent via Twilio Verify API\n`);

    // Check if user already exists
    const existingUser = await pool.query(
      'SELECT id, name, email, phone, role, status FROM users WHERE phone = $1',
      [ONE_NUMBER_LOGIN_PHONE]
    );

    if (existingUser.rows.length > 0) {
      const user = existingUser.rows[0];
      console.log('✅ User already exists:');
      console.log(`   ID: ${user.id}`);
      console.log(`   Name: ${user.name || 'N/A'}`);
      console.log(`   Email: ${user.email || 'N/A'}`);
      console.log(`   Phone: ${user.phone}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   Status: ${user.status}`);
      console.log('\n💡 User can login with this phone number. OTP will be sent via Twilio.');
      console.log('💡 After login, user can select buyer or seller role');
      return;
    }

    // Create user with buyer role (default, can be changed to seller)
    const hashedPassword = await bcrypt.hash('test123', 10);
    const result = await pool.query(
      `INSERT INTO users (name, email, phone, password, role, status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       RETURNING id, name, email, phone, role, status`,
      [
        'Test User',
        `user+${ONE_NUMBER_LOGIN_PHONE.replace(/\+/g, '')}@bidmaster.com`,
        ONE_NUMBER_LOGIN_PHONE,
        hashedPassword,
        'company_products', // Default role, can be changed via role selection
        'approved'
      ]
    );

    const user = result.rows[0];
    console.log('✅ ONE NUMBER LOGIN USER CREATED:');
    console.log(`   ID: ${user.id}`);
    console.log(`   Name: ${user.name}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Phone: ${user.phone}`);
    console.log(`   Role: ${user.role} (can be changed to seller via role selection)`);
    console.log(`   Status: ${user.status}`);
    console.log('\n🎯 LOGIN INSTRUCTIONS:');
    console.log(`   1. Use phone: ${ONE_NUMBER_LOGIN_PHONE}`);
    console.log(`   2. OTP will be sent via Twilio Verify API`);
    console.log(`   3. After login, select buyer or seller role`);
    console.log(`   4. User can switch roles anytime\n`);

  } catch (error) {
    console.error('❌ Error creating ONE NUMBER LOGIN USER:', error);
    throw error;
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  createOneNumberUser()
    .then(() => {
      console.log('✅ Script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Script failed:', error);
      process.exit(1);
    });
}

export default createOneNumberUser;











