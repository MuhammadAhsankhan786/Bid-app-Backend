/**
 * Fix Live Database Role Constraint
 * This script updates the CHECK constraint on the users.role column
 * to allow 'company_products' and 'seller_products' instead of 'buyer' and 'seller'
 */

import pool from "../config/db.js";
import dotenv from "dotenv";

dotenv.config();

async function fixConstraint() {
  let client;
  try {
    console.log('🔧 Fixing Live Database Role Constraint\n');
    console.log('='.repeat(60));
    
    // Get a client from the pool
    client = await pool.connect();
    
    // Step 1: Check current constraint
    console.log('📊 Step 1: Checking current constraint...');
    const constraintCheck = await client.query(`
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
    
    if (constraintCheck.rows.length > 0) {
      console.log('   Current constraint:');
      constraintCheck.rows.forEach(row => {
        console.log(`   - ${row.constraint_name}: ${row.check_clause}`);
      });
    } else {
      console.log('   ⚠️  No role constraint found');
    }
    console.log('');
    
    // Step 2: Check existing roles in database
    console.log('📊 Step 2: Checking existing roles...');
    const rolesCheck = await client.query(`
      SELECT role, COUNT(*) as count 
      FROM users 
      GROUP BY role 
      ORDER BY role
    `);
    console.log('   Current roles in database:');
    rolesCheck.rows.forEach(row => {
      console.log(`   - ${row.role}: ${row.count} user(s)`);
    });
    console.log('');
    
    // Step 3: Drop old constraint
    console.log('🔄 Step 3: Dropping old CHECK constraint...');
    try {
      await client.query('ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check');
      console.log('   ✅ Old constraint dropped\n');
    } catch (error) {
      if (error.message.includes('does not exist')) {
        console.log('   ⚠️  Constraint already dropped (skipping)\n');
      } else {
        throw error;
      }
    }
    
    // Step 4: Update any old 'buyer' or 'seller' roles
    console.log('🔄 Step 4: Updating old role names...');
    const buyerUpdate = await client.query(
      `UPDATE users SET role = 'company_products' WHERE role = 'buyer'`
    );
    console.log(`   ✅ Updated ${buyerUpdate.rowCount} 'buyer' record(s) → 'company_products'`);
    
    const sellerUpdate = await client.query(
      `UPDATE users SET role = 'seller_products' WHERE role = 'seller'`
    );
    console.log(`   ✅ Updated ${sellerUpdate.rowCount} 'seller' record(s) → 'seller_products'\n`);
    
    // Step 5: Add new CHECK constraint
    console.log('🔄 Step 5: Adding new CHECK constraint...');
    try {
      await client.query(`
        ALTER TABLE users 
        ADD CONSTRAINT users_role_check 
        CHECK (role IN ('admin', 'moderator', 'viewer', 'superadmin', 'company_products', 'seller_products'))
      `);
      console.log('   ✅ New constraint added\n');
    } catch (error) {
      if (error.code === '23514') {
        console.log('   ⚠️  Constraint violation - some users may have invalid roles');
        console.log('   Error:', error.message);
      } else {
        throw error;
      }
    }
    
    // Step 6: Update default value
    console.log('🔄 Step 6: Updating default role value...');
    await client.query(`ALTER TABLE users ALTER COLUMN role SET DEFAULT 'company_products'`);
    console.log('   ✅ Default value updated\n');
    
    // Step 7: Verify constraint
    console.log('📊 Step 7: Verifying new constraint...');
    const verifyConstraint = await client.query(`
      SELECT check_clause
      FROM information_schema.check_constraints
      WHERE constraint_name = 'users_role_check'
    `);
    
    if (verifyConstraint.rows.length > 0) {
      console.log('   ✅ New constraint verified:');
      console.log(`   ${verifyConstraint.rows[0].check_clause}\n`);
    } else {
      console.log('   ⚠️  Constraint not found after creation\n');
    }
    
    // Step 8: Final verification
    console.log('📊 Step 8: Final verification...');
    const finalRoles = await client.query(`
      SELECT role, COUNT(*) as count 
      FROM users 
      GROUP BY role 
      ORDER BY role
    `);
    console.log('   Updated roles in database:');
    finalRoles.rows.forEach(row => {
      console.log(`   - ${row.role}: ${row.count} user(s)`);
    });
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ Live database constraint fixed successfully!\n');
    console.log('📝 Next Steps:');
    console.log('   1. Restart your backend server');
    console.log('   2. Test profile update with company_products/seller_products roles');
    console.log('   3. Verify no more constraint errors occur\n');
    
  } catch (error) {
    console.error('\n❌ Fix failed:');
    console.error('   Error:', error.message);
    console.error('   Code:', error.code);
    if (error.detail) {
      console.error('   Detail:', error.detail);
    }
    if (error.hint) {
      console.error('   Hint:', error.hint);
    }
    process.exit(1);
  } finally {
    if (client) {
      client.release();
    }
    await pool.end();
  }
}

fixConstraint();

