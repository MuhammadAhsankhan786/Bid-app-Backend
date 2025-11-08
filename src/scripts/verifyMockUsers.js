import pool from '../config/db.js';
import dotenv from 'dotenv';

dotenv.config();

async function verifyMockUsers() {
  try {
    console.log('🔍 Verifying mock users in database...\n');

    const result = await pool.query(
      `SELECT name, phone, role, status, created_at 
       FROM users 
       WHERE phone IN ('+9647701234567', '+9647701234568', '+9647701234569')
       ORDER BY 
         CASE role 
           WHEN 'superadmin' THEN 1
           WHEN 'moderator' THEN 2
           WHEN 'viewer' THEN 3
           ELSE 4
         END`
    );

    console.log('📋 Mock Users in Database:\n');
    console.table(result.rows.map(row => ({
      Name: row.name,
      Phone: row.phone,
      Role: row.role,
      Status: row.status
    })));

    const expectedUsers = [
      { phone: '+9647701234567', role: 'superadmin', name: 'Super Admin' },
      { phone: '+9647701234568', role: 'moderator', name: 'Moderator User' },
      { phone: '+9647701234569', role: 'viewer', name: 'Viewer User' }
    ];

    let allCorrect = true;
    for (const expected of expectedUsers) {
      const found = result.rows.find(u => u.phone === expected.phone);
      if (!found) {
        console.log(`❌ Missing: ${expected.name} (${expected.phone})`);
        allCorrect = false;
      } else if (found.role !== expected.role) {
        console.log(`⚠️  Wrong role: ${expected.name} - expected ${expected.role}, got ${found.role}`);
        allCorrect = false;
      } else if (found.name !== expected.name) {
        console.log(`⚠️  Wrong name: ${expected.phone} - expected ${expected.name}, got ${found.name}`);
        allCorrect = false;
      }
    }

    if (allCorrect && result.rows.length === 3) {
      console.log('\n✅ All mock users verified correctly!');
      console.log('   Super Admin, Moderator, and Viewer are available for phone-based login.\n');
    } else {
      console.log('\n⚠️  Some users may need to be updated. Run: npm run seed:mock\n');
    }

    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    await pool.end();
    process.exit(1);
  }
}

verifyMockUsers();

