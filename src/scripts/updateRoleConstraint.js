import pool from '../config/db.js';
import dotenv from 'dotenv';

dotenv.config();

async function updateConstraint() {
  try {
    console.log('🔄 Updating role constraint to allow superadmin, moderator, viewer...\n');
    
    // Drop existing constraint
    await pool.query(`
      ALTER TABLE users 
      DROP CONSTRAINT IF EXISTS users_role_check
    `);
    
    console.log('✅ Dropped old constraint');
    
    // Add new constraint with all roles
    await pool.query(`
      ALTER TABLE users 
      ADD CONSTRAINT users_role_check 
      CHECK (role IN ('admin', 'superadmin', 'moderator', 'viewer', 'buyer', 'seller'))
    `);
    
    console.log('✅ Added new constraint with all roles\n');
    
    // Verify
    const constraints = await pool.query(`
      SELECT check_clause
      FROM information_schema.check_constraints
      WHERE constraint_name = 'users_role_check'
    `);
    
    console.log('📋 New constraint:');
    console.log(constraints.rows[0].check_clause);
    console.log('\n✅ Role constraint updated successfully!');
    
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    await pool.end();
    process.exit(1);
  }
}

updateConstraint();

