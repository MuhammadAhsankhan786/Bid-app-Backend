/**
 * Test Employee Login with Auto-Create
 * Tests if employee can login with any Iraq number
 */

import pool from './src/config/db.js';

async function testEmployeeLogin() {
  const testPhone = '+9647700923000'; // Test phone from screenshot
  
  console.log('🧪 Testing Employee Login Auto-Create');
  console.log('📱 Test Phone:', testPhone);
  console.log('');
  
  try {
    // Step 1: Check if user exists
    console.log('Step 1: Checking if user exists...');
    const checkResult = await pool.query(
      `SELECT id, name, email, phone, role, status 
       FROM users 
       WHERE phone = $1`,
      [testPhone]
    );
    
    if (checkResult.rows.length > 0) {
      const user = checkResult.rows[0];
      console.log('✅ User found in database:');
      console.log('   ID:', user.id);
      console.log('   Name:', user.name);
      console.log('   Phone:', user.phone);
      console.log('   Role:', user.role);
      console.log('   Status:', user.status);
      console.log('');
      
      if (user.role !== 'employee') {
        console.log('⚠️  User exists but role is not "employee"');
        console.log('   Current role:', user.role);
        console.log('   Expected role: employee');
        console.log('');
        console.log('💡 Fix: Update role to employee');
        await pool.query(
          `UPDATE users SET role = 'employee', status = 'approved' WHERE id = $1`,
          [user.id]
        );
        console.log('✅ Role updated to employee');
      } else {
        console.log('✅ User role is already "employee"');
      }
      
      if (user.status !== 'approved') {
        console.log('⚠️  User status is not "approved"');
        console.log('   Current status:', user.status);
        console.log('   Fixing...');
        await pool.query(
          `UPDATE users SET status = 'approved' WHERE id = $1`,
          [user.id]
        );
        console.log('✅ Status updated to approved');
      }
    } else {
      console.log('❌ User not found in database');
      console.log('');
      console.log('Step 2: Testing auto-create logic...');
      
      // Test auto-create
      const employeeEmail = `employee${testPhone.replace(/\+/g, '')}@bidmaster.com`;
      const insertResult = await pool.query(
        `INSERT INTO users (name, email, phone, role, status, created_at)
         VALUES ($1, $2, $3, 'employee', 'approved', CURRENT_TIMESTAMP)
         ON CONFLICT (phone) DO UPDATE SET
           role = 'employee',
           status = 'approved'
         RETURNING id, name, email, phone, role, status`,
        [`Employee ${testPhone}`, employeeEmail, testPhone]
      );
      
      const newUser = insertResult.rows[0];
      console.log('✅ Employee user auto-created:');
      console.log('   ID:', newUser.id);
      console.log('   Name:', newUser.name);
      console.log('   Email:', newUser.email);
      console.log('   Phone:', newUser.phone);
      console.log('   Role:', newUser.role);
      console.log('   Status:', newUser.status);
    }
    
    console.log('');
    console.log('✅ Test Complete!');
    console.log('📱 Phone:', testPhone, 'should now work for employee login');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('   Code:', error.code);
    console.error('   Detail:', error.detail);
  } finally {
    await pool.end();
  }
}

testEmployeeLogin();

