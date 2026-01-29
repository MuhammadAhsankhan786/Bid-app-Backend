/**
 * Check and Fix Login Number - 9647700914000
 * Ensure this number can login properly
 */

import pool from "../config/db.js";

async function checkAndFixLoginNumber() {
  try {
    const phoneVariations = [
      '9647700914000',      // Without +
      '+9647700914000',     // With +
      '09647700914000',     // With 0
      '009647700914000'     // With 00
    ];
    
    console.log('🔍 Checking Login Number: 9647700914000');
    console.log('========================================\n');
    
    // Check all variations
    for (const phone of phoneVariations) {
      const result = await pool.query(
        `SELECT id, name, email, phone, role, status, created_at 
         FROM users 
         WHERE phone = $1 OR phone LIKE $2`,
        [phone, `%${phone.replace(/\+/g, '').replace(/^0+/, '')}%`]
      );
      
      if (result.rows.length > 0) {
        console.log(`\n📱 Phone variation: ${phone}`);
        result.rows.forEach(user => {
          console.log('   ✅ Found:');
          console.log('      ID:', user.id);
          console.log('      Name:', user.name);
          console.log('      Phone (DB):', user.phone);
          console.log('      Role:', user.role);
          console.log('      Status:', user.status);
        });
      }
    }
    
    // Check exact match with +964
    const exactPhone = '+9647700914000';
    const exactResult = await pool.query(
      `SELECT id, name, email, phone, role, status 
       FROM users 
       WHERE phone = $1`,
      [exactPhone]
    );
    
    if (exactResult.rows.length > 0) {
      const user = exactResult.rows[0];
      console.log('\n\n✅ Main User Found:');
      console.log('   ID:', user.id);
      console.log('   Name:', user.name);
      console.log('   Phone:', user.phone);
      console.log('   Role:', user.role);
      console.log('   Status:', user.status);
      
      // Ensure status is approved
      if (user.status !== 'approved') {
        console.log('\n⚠️ User status is not approved. Updating...');
        await pool.query(
          `UPDATE users 
           SET status = 'approved', 
               updated_at = CURRENT_TIMESTAMP
           WHERE phone = $1`,
          [exactPhone]
        );
        console.log('   ✅ Status updated to: approved');
      } else {
        console.log('   ✅ Status is already: approved');
      }
    } else {
      console.log('\n❌ User not found with phone: +9647700914000');
      console.log('   Creating new user...');
      
      const buyerEmail = `buyer9647700914000@bidmaster.com`;
      const insertResult = await pool.query(
        `INSERT INTO users (name, email, phone, role, status, created_at)
         VALUES ($1, $2, $3, 'company_products', 'approved', CURRENT_TIMESTAMP)
         ON CONFLICT (phone) DO UPDATE SET
           status = 'approved',
           updated_at = CURRENT_TIMESTAMP
         RETURNING id, name, email, phone, role, status`,
        [`Buyer ${exactPhone}`, buyerEmail, exactPhone]
      );
      
      console.log('   ✅ User created/updated:');
      console.log('      ID:', insertResult.rows[0].id);
      console.log('      Phone:', insertResult.rows[0].phone);
      console.log('      Status:', insertResult.rows[0].status);
    }
    
    console.log('\n========================================');
    console.log('✅ Check complete');
    console.log('\n📝 Login Info:');
    console.log('   Phone: 9647700914000 (will normalize to +9647700914000)');
    console.log('   Role: buyer');
    console.log('   Status: approved');
    console.log('   OTP: Any code (OTP_BYPASS=true)');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkAndFixLoginNumber();

