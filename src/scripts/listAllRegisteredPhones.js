import pool from '../config/db.js';

/**
 * List all registered phone numbers in the database
 */
async function listAllRegisteredPhones() {
  try {
    console.log('\n📋 Fetching all registered phone numbers from database...');
    console.log('='.repeat(70));
    
    // Query all users with phone numbers
    const result = await pool.query(
      `SELECT id, name, email, phone, role, status, created_at 
       FROM users 
       WHERE phone IS NOT NULL AND phone != ''
       ORDER BY id ASC`
    );
    
    if (result.rows.length === 0) {
      console.log('❌ No users with phone numbers found in database');
      console.log(JSON.stringify({ registered_numbers: [] }, null, 2));
      process.exit(0);
    }
    
    console.log(`\n✅ Found ${result.rows.length} registered users with phone numbers:\n`);
    
    // Format for display
    result.rows.forEach((user, index) => {
      const phone = user.phone || 'N/A';
      const name = user.name || 'Unnamed';
      const role = user.role || 'N/A';
      const status = user.status || 'N/A';
      
      console.log(`${index + 1}. ${phone.padEnd(15)} | ${name.padEnd(20)} | ${role.padEnd(12)} | ${status}`);
    });
    
    // Prepare JSON output
    const jsonOutput = {
      registered_numbers: result.rows.map(user => ({
        id: user.id,
        name: user.name || null,
        email: user.email || null,
        role: user.role || null,
        phone: user.phone,
        status: user.status || null,
        created_at: user.created_at ? user.created_at.toISOString() : null
      }))
    };
    
    console.log('\n' + '='.repeat(70));
    console.log('📱 Phone Numbers Summary:');
    console.log('='.repeat(70));
    
    // Group by role
    const byRole = {};
    result.rows.forEach(user => {
      const role = user.role || 'unknown';
      if (!byRole[role]) {
        byRole[role] = [];
      }
      byRole[role].push(user.phone);
    });
    
    Object.entries(byRole).forEach(([role, phones]) => {
      console.log(`\n${role.toUpperCase()} (${phones.length}):`);
      phones.forEach(phone => {
        console.log(`   - ${phone}`);
      });
    });
    
    console.log('\n' + '='.repeat(70));
    console.log('🔐 Login Information:');
    console.log('='.repeat(70));
    console.log('✅ All numbers can be used for login');
    console.log('✅ OTP for all numbers: 1234');
    console.log('✅ Phone format: +964XXXXXXXXXX (9-10 digits after +964)');
    
    // Verify test numbers
    console.log('\n' + '='.repeat(70));
    console.log('🧪 Test Numbers Verification:');
    console.log('='.repeat(70));
    
    const testNumbers = [
      '+9647701234567', // Super Admin
      '+9647701234568', // Moderator
      '+9647701234569', // Viewer
    ];
    
    testNumbers.forEach(testPhone => {
      const found = result.rows.find(u => u.phone === testPhone);
      if (found) {
        console.log(`✅ ${testPhone} - Found (${found.name}, ${found.role})`);
      } else {
        console.log(`⚠️  Phone not found in DB: ${testPhone}`);
      }
    });
    
    console.log('\n' + '='.repeat(70));
    console.log('📄 JSON Output:');
    console.log('='.repeat(70));
    console.log(JSON.stringify(jsonOutput, null, 2));
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('   Stack:', error.stack);
    process.exit(1);
  }
}

listAllRegisteredPhones();





