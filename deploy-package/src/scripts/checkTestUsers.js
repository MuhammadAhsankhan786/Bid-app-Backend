import pool from '../config/db.js';

async function checkTestUsers() {
  try {
    const result = await pool.query(
      `SELECT phone, name, role, status 
       FROM users 
       WHERE phone LIKE '+964%' 
       ORDER BY created_at DESC 
       LIMIT 10`
    );
    
    console.log('\n📱 Test Users in Database:');
    console.log('='.repeat(60));
    
    if (result.rows.length === 0) {
      console.log('❌ No users found with Iraq phone numbers (+964)');
      console.log('\n💡 To test login, you need to create users with phone numbers like:');
      console.log('   +9647701234567 (Super Admin)');
      console.log('   +9647701234568 (Moderator)');
      console.log('   +9647701234569 (Viewer)');
      console.log('   +964809809808080 (Buyer/Seller)');
    } else {
      result.rows.forEach((user, index) => {
        console.log(`\n${index + 1}. Phone: ${user.phone}`);
        console.log(`   Name: ${user.name || 'N/A'}`);
        console.log(`   Role: ${user.role}`);
        console.log(`   Status: ${user.status}`);
      });
    }
    
    console.log('\n' + '='.repeat(60));
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkTestUsers();

