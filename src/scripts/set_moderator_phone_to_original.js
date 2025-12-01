import pool from '../config/db.js';

/**
 * Set Moderator Phone Number to +9647800914000 (User's actual number)
 */
async function setModeratorPhone() {
  try {
    console.log('🔧 Setting moderator phone number to +9647800914000...');

    // Step 1: Check if moderator exists with current number
    console.log('\n📤 Step 1: Checking for existing moderator...');
    const currentCheck = await pool.query(
      `SELECT id, name, email, phone, role, status
       FROM users 
       WHERE email = $1 AND role = 'moderator'`,
      ['moderator@bidmaster.com']
    );

    if (currentCheck.rows.length > 0) {
      console.log('   Found existing moderator:', currentCheck.rows[0]);
      
      // Update phone number to +9647800914000
      console.log('\n📝 Step 2: Updating phone number to +9647800914000...');
      const updateResult = await pool.query(
        `UPDATE users 
         SET phone = $1, updated_at = CURRENT_TIMESTAMP
         WHERE email = $2 AND role = 'moderator'
         RETURNING id, name, email, phone, role, status, created_at, updated_at`,
        ['+9647800914000', 'moderator@bidmaster.com']
      );
      
      if (updateResult.rows.length > 0) {
        console.log('✅ Moderator phone updated successfully!');
        console.log(JSON.stringify(updateResult.rows[0], null, 2));
      }
    } else {
      // Create new moderator if doesn't exist
      console.log('\n📥 Step 2: Creating new moderator...');
      const insertResult = await pool.query(
        `INSERT INTO users (name, email, phone, role, status, created_at, updated_at)
         VALUES ($1, $2, $3, 'moderator', 'approved', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         ON CONFLICT (phone) DO UPDATE SET
           name = EXCLUDED.name,
           email = EXCLUDED.email,
           role = 'moderator',
           status = 'approved',
           updated_at = CURRENT_TIMESTAMP
         RETURNING id, name, email, phone, role, status, created_at, updated_at`,
        ['Moderator', 'moderator@bidmaster.com', '+9647800914000']
      );

      if (insertResult.rows.length > 0) {
        console.log('✅ New moderator created successfully!');
        console.log(JSON.stringify(insertResult.rows[0], null, 2));
      }
    }

    // Step 3: Verify the update
    console.log('\n🔍 Step 3: Verifying moderator phone number...');
    const verifyResult = await pool.query(
      `SELECT id, name, email, phone, role, status, created_at, updated_at
       FROM users 
       WHERE phone = $1 AND role = 'moderator'`,
      ['+9647800914000']
    );

    if (verifyResult.rows.length > 0) {
      console.log('✅ Verification successful! Moderator found:');
      console.log(JSON.stringify(verifyResult.rows[0], null, 2));
      console.log('\n✅ You can now login with:');
      console.log('   Phone: +9647800914000');
      console.log('   Role: moderator');
    } else {
      console.log('❌ Verification failed! Moderator not found with phone +9647800914000');
    }

  } catch (error) {
    console.error('❌ Error setting moderator phone:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run the script
setModeratorPhone()
  .then(() => {
    console.log('\n✅ Script completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });

