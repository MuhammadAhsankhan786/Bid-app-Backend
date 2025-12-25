/**
 * Script to reset Superadmin password
 * Usage: node reset-superadmin-password.js <new_password>
 */

import pool from './src/config/db.js';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';

dotenv.config();

async function resetSuperadminPassword(newPassword) {
  if (!newPassword) {
    console.error('\n❌ Error: Password is required!');
    console.error('\n📝 Usage: node reset-superadmin-password.js <new_password>');
    console.error('   Example: node reset-superadmin-password.js admin123');
    process.exit(1);
  }

  try {
    console.log('\n🔐 Resetting Superadmin password...\n');

    // Find Superadmin user
    const findResult = await pool.query(
      `SELECT id, name, email, phone, role 
       FROM users 
       WHERE phone = '+9647500914000'
       LIMIT 1`
    );

    if (findResult.rows.length === 0) {
      console.log('❌ No Superadmin found in database');
      console.log('\n💡 You may need to create a Superadmin user first.');
      process.exit(1);
    }

    const superadmin = findResult.rows[0];
    console.log('✅ Found Superadmin:');
    console.log(`   ID: ${superadmin.id}`);
    console.log(`   Name: ${superadmin.name}`);
    console.log(`   Email: ${superadmin.email}`);
    console.log(`   Phone: ${superadmin.phone}`);

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    const updateResult = await pool.query(
      `UPDATE users 
       SET password = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING id, name, email`,
      [hashedPassword, superadmin.id]
    );

    if (updateResult.rows.length > 0) {
      console.log('\n✅ Password reset successfully!');
      console.log(`\n📝 Add this to your .env file:`);
      console.log(`   ADMIN_PASSWORD=${newPassword}`);
      console.log(`\n💡 Now you can run the test script:`);
      console.log(`   node test-admin-phone-protection.js`);
    } else {
      console.log('\n❌ Failed to update password');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Get password from command line arguments
const newPassword = process.argv[2];
resetSuperadminPassword(newPassword);

