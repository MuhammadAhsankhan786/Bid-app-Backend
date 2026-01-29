/**
 * Fix Flutter User Blocked Status
 * Unblock the user account for +9647700914000
 */

import pool from "../config/db.js";

async function fixFlutterUserBlocked() {
  try {
    const phone = '+9647700914000';
    
    console.log('🔧 Fixing Flutter User Blocked Status');
    console.log('========================================\n');
    
    // Check current status
    const checkResult = await pool.query(
      `SELECT id, name, email, phone, role, status 
       FROM users 
       WHERE phone = $1`,
      [phone]
    );
    
    if (checkResult.rows.length === 0) {
      console.log('❌ User not found:', phone);
      process.exit(1);
    }
    
    const user = checkResult.rows[0];
    console.log('📱 Current Status:');
    console.log('   ID:', user.id);
    console.log('   Name:', user.name);
    console.log('   Phone:', user.phone);
    console.log('   Role:', user.role);
    console.log('   Status:', user.status);
    
    if (user.status === 'blocked') {
      // Unblock the user
      const updateResult = await pool.query(
        `UPDATE users 
         SET status = 'approved', 
             updated_at = CURRENT_TIMESTAMP
         WHERE phone = $1
         RETURNING id, name, phone, role, status`,
        [phone]
      );
      
      console.log('\n✅ User unblocked successfully!');
      console.log('   New Status:', updateResult.rows[0].status);
    } else {
      console.log('\n✅ User is already approved');
    }
    
    // Also check and fix the similar number (10 digits)
    const similarPhone = '+964770091400';
    const similarResult = await pool.query(
      `SELECT id, name, phone, role, status 
       FROM users 
       WHERE phone = $1`,
      [similarPhone]
    );
    
    if (similarResult.rows.length > 0) {
      const similarUser = similarResult.rows[0];
      console.log('\n📱 Found similar number:', similarPhone);
      console.log('   Status:', similarUser.status);
      
      if (similarUser.status === 'blocked') {
        console.log('   ⚠️ This number is blocked. Do you want to unblock it?');
        console.log('   (This might be a different user)');
      }
    }
    
    console.log('\n========================================');
    console.log('✅ Fix complete');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error fixing user:', error);
    process.exit(1);
  }
}

fixFlutterUserBlocked();

