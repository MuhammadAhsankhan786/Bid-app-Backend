/**
 * Check User Status - Verify phone numbers and their status
 */

import pool from "../config/db.js";

async function checkUserStatus() {
  try {
    const phones = [
      '+9647700914000',  // Original number
      '+964964770091400', // Wrong format from UI
      '9647700914000',   // Without +
      '07700914000'      // Local format
    ];
    
    console.log('🔍 Checking User Status for Multiple Phone Formats');
    console.log('========================================\n');
    
    for (const phone of phones) {
      const result = await pool.query(
        `SELECT id, name, email, phone, role, status, created_at 
         FROM users 
         WHERE phone = $1 OR phone LIKE $2`,
        [phone, `%${phone.replace(/\+/g, '')}%`]
      );
      
      if (result.rows.length > 0) {
        console.log(`\n📱 Phone: ${phone}`);
        result.rows.forEach(user => {
          console.log('   ✅ Found:');
          console.log('      ID:', user.id);
          console.log('      Name:', user.name);
          console.log('      Phone (DB):', user.phone);
          console.log('      Role:', user.role);
          console.log('      Status:', user.status);
          console.log('      Created:', user.created_at);
        });
      } else {
        console.log(`\n📱 Phone: ${phone} - ❌ NOT FOUND`);
      }
    }
    
    // Check all users with similar numbers
    console.log('\n\n🔍 All users with 770091400 in phone:');
    const similarResult = await pool.query(
      `SELECT id, name, email, phone, role, status 
       FROM users 
       WHERE phone LIKE '%770091400%' 
       ORDER BY created_at DESC`
    );
    
    if (similarResult.rows.length > 0) {
      similarResult.rows.forEach(user => {
        console.log(`   ${user.phone} - ${user.name} (${user.role}) - Status: ${user.status}`);
      });
    } else {
      console.log('   No users found');
    }
    
    console.log('\n========================================');
    console.log('✅ Check complete');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error checking user:', error);
    process.exit(1);
  }
}

checkUserStatus();

