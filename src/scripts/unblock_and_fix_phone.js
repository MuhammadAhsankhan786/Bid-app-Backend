/**
 * Unblock User and Fix Phone Number Issue
 * This script will:
 * 1. Unblock the blocked user (+964770091400)
 * 2. Ensure the correct number (+9647700914000) is approved
 */

import pool from "../config/db.js";

async function unblockAndFixPhone() {
  try {
    console.log('🔧 Unblocking User and Fixing Phone Number');
    console.log('========================================\n');
    
    // 1. Unblock the 10-digit number (if it exists and is blocked)
    const phone10 = '+964770091400';
    const result10 = await pool.query(
      `SELECT id, name, phone, role, status FROM users WHERE phone = $1`,
      [phone10]
    );
    
    if (result10.rows.length > 0) {
      const user10 = result10.rows[0];
      console.log('📱 Found 10-digit number:', phone10);
      console.log('   Status:', user10.status);
      
      if (user10.status === 'blocked') {
        await pool.query(
          `UPDATE users SET status = 'approved', updated_at = CURRENT_TIMESTAMP WHERE phone = $1`,
          [phone10]
        );
        console.log('   ✅ Unblocked:', phone10);
      }
    }
    
    // 2. Ensure the 11-digit number is approved
    const phone11 = '+9647700914000';
    const result11 = await pool.query(
      `SELECT id, name, phone, role, status FROM users WHERE phone = $1`,
      [phone11]
    );
    
    if (result11.rows.length > 0) {
      const user11 = result11.rows[0];
      console.log('\n📱 Found 11-digit number:', phone11);
      console.log('   Status:', user11.status);
      
      if (user11.status === 'blocked') {
        await pool.query(
          `UPDATE users SET status = 'approved', updated_at = CURRENT_TIMESTAMP WHERE phone = $1`,
          [phone11]
        );
        console.log('   ✅ Unblocked:', phone11);
      } else {
        console.log('   ✅ Already approved');
      }
    } else {
      console.log('\n❌ 11-digit number not found:', phone11);
    }
    
    console.log('\n========================================');
    console.log('✅ Fix complete');
    console.log('\n📝 Note: Phone normalization has been fixed to handle +964964 prefix');
    console.log('   The backend will now correctly normalize +964964770091400 to +9647700914000');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

unblockAndFixPhone();

