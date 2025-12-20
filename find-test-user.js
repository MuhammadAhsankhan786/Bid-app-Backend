/**
 * Find a valid non-admin user for testing
 */

import pool from './src/config/db.js';

async function findTestUser() {
  try {
    const result = await pool.query(`
      SELECT id, name, email, role, status 
      FROM users 
      WHERE role NOT IN ('admin', 'superadmin', 'moderator', 'viewer', 'employee')
      LIMIT 5
    `);
    
    console.log('📋 Non-admin users found:');
    result.rows.forEach((user, i) => {
      console.log(`   ${i+1}. ID: ${user.id}, Name: ${user.name}, Role: ${user.role}, Status: ${user.status}`);
    });
    
    if (result.rows.length > 0) {
      console.log(`\n✅ Use User ID ${result.rows[0].id} for testing Update User API`);
    } else {
      console.log('\n⚠️  No non-admin users found');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

findTestUser();

