import pool from '../config/db.js';

async function checkBuyerSellerUsers() {
  try {
    console.log('\n📱 Flutter App ke liye Test Users:');
    console.log('='.repeat(60));
    
    // Check for buyer/seller users
    const buyerSellerResult = await pool.query(
      `SELECT phone, name, role, status 
       FROM users 
       WHERE role IN ('buyer', 'seller') 
       AND phone LIKE '+964%'
       ORDER BY created_at DESC 
       LIMIT 10`
    );
    
    if (buyerSellerResult.rows.length === 0) {
      console.log('❌ Koi buyer/seller user nahi mila');
      console.log('\n💡 Aap in admin numbers se bhi login kar sakte hain:');
      
      const adminResult = await pool.query(
        `SELECT phone, name, role 
         FROM users 
         WHERE phone LIKE '+964%' 
         ORDER BY created_at DESC 
         LIMIT 5`
      );
      
      adminResult.rows.forEach((user, index) => {
        console.log(`\n${index + 1}. Phone: ${user.phone}`);
        console.log(`   Name: ${user.name || 'N/A'}`);
        console.log(`   Role: ${user.role}`);
        console.log(`   OTP: Sent via Twilio Verify API`);
      });
    } else {
      console.log('✅ Buyer/Seller Users:');
      buyerSellerResult.rows.forEach((user, index) => {
        console.log(`\n${index + 1}. Phone: ${user.phone}`);
        console.log(`   Name: ${user.name || 'N/A'}`);
        console.log(`   Role: ${user.role}`);
        console.log(`   Status: ${user.status}`);
        console.log(`   OTP: Sent via Twilio Verify API`);
      });
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('📝 Login Instructions:');
    console.log('='.repeat(60));
    console.log('1. Flutter app mein phone number enter karein');
    console.log('2. OTP SMS me aayega (Twilio Verify API se)');
    console.log('3. OTP enter karein aur login karein');
    console.log('\n✅ OTP Twilio Verify API se real-time SMS me bheja jayega');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkBuyerSellerUsers();

