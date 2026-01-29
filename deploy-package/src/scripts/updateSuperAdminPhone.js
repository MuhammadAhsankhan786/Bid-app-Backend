import pool from '../config/db.js';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Update Super Admin phone number to verified Twilio number
 * This allows admin panel login with the verified Twilio number
 */

const VERIFIED_TWILIO_NUMBER = '+9647700914000';

async function updateSuperAdminPhone() {
  try {
    console.log('🔄 Updating Super Admin phone number...\n');
    console.log('🔌 Connecting to database...\n');

    // Test database connection
    await pool.query('SELECT NOW()');
    console.log('✅ Database connection successful\n');

    // Find existing superadmin user
    const existingUser = await pool.query(
      'SELECT id, name, phone, role FROM users WHERE role = $1 LIMIT 1',
      ['superadmin']
    );

    if (existingUser.rows.length === 0) {
      console.log('⚠️  No superadmin user found. Creating new user...\n');
      
      // Create new superadmin user with verified Twilio number
      const result = await pool.query(
        `INSERT INTO users (name, email, phone, role, status, password, created_at)
         VALUES ($1, $2, $3, $4, $5, '', NOW())
         RETURNING id, name, phone, role`,
        ['Super Admin', 'superadmin@bidmaster.com', VERIFIED_TWILIO_NUMBER, 'superadmin', 'approved']
      );

      const newUser = result.rows[0];
      console.log('✅ Created Super Admin user:');
      console.log(`   ID: ${newUser.id}`);
      console.log(`   Name: ${newUser.name}`);
      console.log(`   Phone: ${newUser.phone}`);
      console.log(`   Role: ${newUser.role}\n`);
    } else {
      const user = existingUser.rows[0];
      const oldPhone = user.phone;
      
      if (oldPhone === VERIFIED_TWILIO_NUMBER) {
        console.log('✅ Super Admin already has verified Twilio number:');
        console.log(`   Phone: ${user.phone}\n`);
      } else {
        // Update phone number
        await pool.query(
          'UPDATE users SET phone = $1 WHERE id = $2',
          [VERIFIED_TWILIO_NUMBER, user.id]
        );

        console.log('✅ Updated Super Admin phone number:');
        console.log(`   Old: ${oldPhone}`);
        console.log(`   New: ${VERIFIED_TWILIO_NUMBER}\n`);
      }
    }

    // Verify update
    const verification = await pool.query(
      'SELECT id, name, phone, role FROM users WHERE role = $1',
      ['superadmin']
    );

    if (verification.rows.length > 0) {
      const verified = verification.rows[0];
      console.log('🔍 Verification:');
      console.log(`   Name: ${verified.name}`);
      console.log(`   Phone: ${verified.phone}`);
      console.log(`   Role: ${verified.role}\n`);
      
      if (verified.phone === VERIFIED_TWILIO_NUMBER) {
        console.log('✅ Super Admin phone number is now set to verified Twilio number!');
        console.log('   You can now login to Admin Panel with this number.\n');
      } else {
        console.warn('⚠️  Warning: Phone number does not match verified Twilio number');
      }
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error updating Super Admin phone:', error);
    console.error('   Error details:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the update function
updateSuperAdminPhone();

