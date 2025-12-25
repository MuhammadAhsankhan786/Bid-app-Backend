/**
 * Direct Fix: Add Employee Role to Database Constraint
 */

import pool from './src/config/db.js';

async function fixEmployeeConstraint() {
  console.log('🔧 Fixing Employee Role Constraint...');
  console.log('');
  
  try {
    // Step 1: Check current constraint
    console.log('Step 1: Checking current constraint...');
    const checkResult = await pool.query(`
      SELECT constraint_name, check_clause
      FROM information_schema.check_constraints
      WHERE constraint_name = 'users_role_check'
    `);
    
    if (checkResult.rows.length > 0) {
      console.log('✅ Constraint exists:');
      console.log('   Constraint:', checkResult.rows[0].constraint_name);
      console.log('   Check clause:', checkResult.rows[0].check_clause);
      
      if (checkResult.rows[0].check_clause.includes("'employee'")) {
        console.log('✅ Employee role already in constraint!');
        return;
      } else {
        console.log('⚠️  Employee role NOT in constraint');
      }
    } else {
      console.log('⚠️  Constraint not found');
    }
    
    console.log('');
    console.log('Step 2: Dropping old constraint...');
    await pool.query(`
      ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check
    `);
    console.log('✅ Old constraint dropped');
    
    console.log('');
    console.log('Step 3: Adding new constraint with employee role...');
    await pool.query(`
      ALTER TABLE users 
      ADD CONSTRAINT users_role_check 
      CHECK (role IN (
        'admin', 
        'moderator', 
        'viewer', 
        'superadmin', 
        'company_products', 
        'seller_products', 
        'employee'
      ))
    `);
    console.log('✅ New constraint added with employee role');
    
    console.log('');
    console.log('Step 4: Verifying...');
    const verifyResult = await pool.query(`
      SELECT check_clause
      FROM information_schema.check_constraints
      WHERE constraint_name = 'users_role_check'
    `);
    
    if (verifyResult.rows[0].check_clause.includes("'employee'")) {
      console.log('✅ Verification: Employee role is now in constraint!');
    } else {
      console.log('❌ Verification failed');
    }
    
    console.log('');
    console.log('Step 5: Testing employee user creation...');
    const testPhone = '+9647700923000';
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
    console.log('✅ Employee user created successfully:');
    console.log('   ID:', newUser.id);
    console.log('   Name:', newUser.name);
    console.log('   Phone:', newUser.phone);
    console.log('   Role:', newUser.role);
    console.log('   Status:', newUser.status);
    
    console.log('');
    console.log('✅ Fix Complete! Employee login should work now.');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('   Code:', error.code);
    console.error('   Detail:', error.detail);
    console.error('   Constraint:', error.constraint);
  } finally {
    await pool.end();
  }
}

fixEmployeeConstraint();

