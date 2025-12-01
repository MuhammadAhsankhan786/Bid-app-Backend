import pool from '../config/db.js';

/**
 * Verify Moderator Phone Number in Database
 */
async function verifyModeratorPhone() {
  try {
    console.log('🔍 Verifying moderator phone numbers in database...\n');

    // Check for moderator with new number
    const newCheck = await pool.query(
      `SELECT id, name, email, phone, role, status, created_at, updated_at
       FROM users 
       WHERE phone = $1 AND role = 'moderator'`,
      ['+964780091400']
    );

    console.log('📱 Checking for phone: +964780091400 (NEW - Correct)');
    if (newCheck.rows.length > 0) {
      console.log('✅ Found moderator with NEW phone number:');
      console.log(JSON.stringify(newCheck.rows[0], null, 2));
    } else {
      console.log('❌ No moderator found with phone +964780091400');
    }

    // Check for moderator with old number
    const oldCheck = await pool.query(
      `SELECT id, name, email, phone, role, status
       FROM users 
       WHERE phone = $1 AND role = 'moderator'`,
      ['+9647800914000']
    );

    console.log('\n📱 Checking for phone: +9647800914000 (OLD - Should not exist)');
    if (oldCheck.rows.length > 0) {
      console.log('⚠️  Found moderator with OLD phone number (should be removed):');
      console.log(JSON.stringify(oldCheck.rows[0], null, 2));
    } else {
      console.log('✅ No moderator found with old phone number (correct)');
    }

    // List all moderators
    const allModerators = await pool.query(
      `SELECT id, name, email, phone, role, status
       FROM users 
       WHERE role = 'moderator'
       ORDER BY updated_at DESC`
    );

    console.log('\n📋 All moderators in database:');
    if (allModerators.rows.length > 0) {
      allModerators.rows.forEach((mod, index) => {
        console.log(`\n${index + 1}. ${mod.name}`);
        console.log(`   Phone: ${mod.phone}`);
        console.log(`   Email: ${mod.email}`);
        console.log(`   Status: ${mod.status}`);
      });
    } else {
      console.log('❌ No moderators found in database');
    }

  } catch (error) {
    console.error('❌ Error verifying moderator phone:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run the verification
verifyModeratorPhone()
  .then(() => {
    console.log('\n✅ Verification completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Verification failed:', error);
    process.exit(1);
  });

