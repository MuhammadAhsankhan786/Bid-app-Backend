import pool from "../config/db.js";

const phone = process.argv[2] || '+9647701234567';

async function checkUserRole() {
  try {
    const result = await pool.query(
      "SELECT id, name, phone, role, status FROM users WHERE phone = $1",
      [phone]
    );

    if (result.rows.length === 0) {
      console.log(`❌ User not found with phone: ${phone}`);
      return;
    }

    const user = result.rows[0];
    console.log(`\n👤 User Found:`);
    console.log(`   ID: ${user.id}`);
    console.log(`   Name: ${user.name}`);
    console.log(`   Phone: ${user.phone}`);
    console.log(`   Role: ${user.role}`);
    console.log(`   Status: ${user.status}`);
    console.log(`\n💡 To place bids, role must be 'buyer'`);
    console.log(`   Current role: '${user.role}' ${user.role === 'buyer' ? '✅' : '❌'}`);
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await pool.end();
  }
}

checkUserRole();


