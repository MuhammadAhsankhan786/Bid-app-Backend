/**
 * Check Flutter User Login - Verify +9647700914000
 * This script checks if the Flutter app user number exists in the database
 */

import pool from "../config/db.js";

async function checkFlutterUser() {
  try {
    const phone = '+9647700914000';
    
    console.log('🔍 Checking Flutter User:', phone);
    console.log('========================================\n');
    
    const result = await pool.query(
      `SELECT id, name, email, phone, role, status, created_at 
       FROM users 
       WHERE phone = $1`,
      [phone]
    );
    
    if (result.rows.length === 0) {
      console.log('❌ User NOT FOUND in database');
      console.log('\n📝 This number should be used for Flutter app login');
      console.log('   Flutter app uses: /api/auth/verify-otp endpoint');
      console.log('   If user doesn\'t exist, it will be auto-created as "buyer" role');
      console.log('\n✅ This is NORMAL - Flutter app auto-creates users on first login');
    } else {
      const user = result.rows[0];
      console.log('✅ User FOUND in database:');
      console.log('   ID:', user.id);
      console.log('   Name:', user.name);
      console.log('   Email:', user.email);
      console.log('   Phone:', user.phone);
      console.log('   Role:', user.role);
      console.log('   Status:', user.status);
      console.log('   Created:', user.created_at);
      console.log('\n✅ This user can login via Flutter app');
      console.log('   Endpoint: POST /api/auth/verify-otp');
      console.log('   Required: phone + otp');
    }
    
    console.log('\n========================================');
    console.log('✅ Check complete');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error checking user:', error);
    process.exit(1);
  }
}

checkFlutterUser();

