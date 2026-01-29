import pool from '../config/db.js';

/**
 * Fix Moderator Phone Number
 * Removes old number (+9647800914000) and adds new number (+964780091400)
 */
async function fixModeratorPhone() {
  try {
    console.log('🔧 Fixing moderator phone number...');
    console.log('   Removing old: +9647800914000');
    console.log('   Adding new: +964780091400');

    // Step 1: Check if moderator exists with old phone number
    console.log('\n📤 Step 1: Checking for old moderator...');
    const oldCheck = await pool.query(
      `SELECT id, name, email, phone, role, status
       FROM users 
       WHERE phone = $1 AND role = 'moderator'`,
      ['+9647800914000']
    );

    if (oldCheck.rows.length > 0) {
      console.log('   Found old moderator:', oldCheck.rows[0]);
      // Delete old moderator
      const deleteResult = await pool.query(
        `DELETE FROM users 
         WHERE phone = $1 AND role = 'moderator'
         RETURNING id, name, email, phone, role`,
        ['+9647800914000']
      );
      console.log('✅ Old moderator deleted:', deleteResult.rows[0]);
    } else {
      console.log('ℹ️  No old moderator found with phone +9647800914000');
    }

    // Step 2: Check if moderator exists with email (might have different phone)
    console.log('\n📥 Step 2: Checking for existing moderator by email...');
    const emailCheck = await pool.query(
      `SELECT id, name, email, phone, role, status
       FROM users 
       WHERE email = $1 AND role = 'moderator'`,
      ['moderator@bidmaster.com']
    );

    if (emailCheck.rows.length > 0) {
      console.log('   Found existing moderator:', emailCheck.rows[0]);
      // Update phone number
      console.log('\n📝 Step 3: Updating phone number...');
      const updateResult = await pool.query(
        `UPDATE users 
         SET phone = $1, updated_at = CURRENT_TIMESTAMP
         WHERE email = $2 AND role = 'moderator'
         RETURNING id, name, email, phone, role, status, created_at, updated_at`,
        ['+964780091400', 'moderator@bidmaster.com']
      );
      console.log('✅ Moderator phone updated:', updateResult.rows[0]);
    } else {
      // Step 3: Add new moderator with new phone number
      console.log('\n📥 Step 3: Adding new moderator...');
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
        ['Moderator', 'moderator@bidmaster.com', '+964780091400']
      );

      if (insertResult.rows.length > 0) {
        console.log('✅ New moderator added:', insertResult.rows[0]);
      } else {
        console.log('⚠️  No user was created');
      }
    }

    // Step 4: Verify old number is removed
    console.log('\n🔍 Step 4: Verifying old number is removed...');
    const oldVerify = await pool.query(
      `SELECT id, name, email, phone, role, status
       FROM users 
       WHERE phone = $1 AND role = 'moderator'`,
      ['+9647800914000']
    );

    if (oldVerify.rows.length === 0) {
      console.log('✅ Old moderator removed successfully');
    } else {
      console.log('⚠️  Old moderator still exists:', oldVerify.rows);
    }

    // Step 5: Verify new number is added
    console.log('\n🔍 Step 5: Verifying new number is added...');
    const newCheck = await pool.query(
      `SELECT id, name, email, phone, role, status, created_at, updated_at
       FROM users 
       WHERE phone = $1 AND role = 'moderator'`,
      ['+964780091400']
    );

    if (newCheck.rows.length > 0) {
      console.log('✅ New moderator found:');
      console.log(newCheck.rows[0]);
    } else {
      console.log('❌ New moderator not found!');
    }

  } catch (error) {
    console.error('❌ Error fixing moderator phone:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run the fix
fixModeratorPhone()
  .then(() => {
    console.log('\n✅ Script completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });

