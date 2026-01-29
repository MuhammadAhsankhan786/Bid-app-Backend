import pool from '../config/db.js';
import dotenv from 'dotenv';

dotenv.config();

async function checkSchema() {
  try {
    // Check role column constraints
    const constraints = await pool.query(`
      SELECT 
        tc.constraint_name,
        cc.check_clause
      FROM information_schema.table_constraints tc
      JOIN information_schema.check_constraints cc 
        ON tc.constraint_name = cc.constraint_name
      WHERE tc.table_name = 'users' 
        AND tc.constraint_type = 'CHECK'
        AND cc.check_clause LIKE '%role%'
    `);
    
    console.log('Role constraints:');
    console.table(constraints.rows);
    
    // Check password column
    const passwordCol = await pool.query(`
      SELECT 
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_name = 'users' 
        AND column_name = 'password'
    `);
    
    console.log('\nPassword column:');
    console.table(passwordCol.rows);
    
    // Check existing roles
    const existingRoles = await pool.query(`
      SELECT DISTINCT role 
      FROM users 
      ORDER BY role
    `);
    
    console.log('\nExisting roles in database:');
    console.table(existingRoles.rows);
    
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    await pool.end();
    process.exit(1);
  }
}

checkSchema();

