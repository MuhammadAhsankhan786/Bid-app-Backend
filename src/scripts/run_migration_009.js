/**
 * Run Migration 009: Update role names from 'buyer'/'seller' to 'company_products'/'seller_products'
 * This script runs the SQL migration file
 */

import pool from "../config/db.js";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function runMigration() {
  let client;
  try {
    console.log('🔄 Starting Migration 009: Update Role Names\n');
    console.log('='.repeat(60));
    
    // Read the migration file
    const migrationPath = join(__dirname, '../../migrations/009_update_role_names.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf8');
    
    console.log('\n📋 Migration Steps:');
    console.log('   1. Update existing buyer records → company_products');
    console.log('   2. Update existing seller records → seller_products');
    console.log('   3. Update CHECK constraint');
    console.log('   4. Update default role value');
    console.log('   5. Verify changes\n');
    
    // Get a client from the pool
    client = await pool.connect();
    
    // Check current state
    console.log('📊 Current State:');
    const beforeResult = await client.query(
      `SELECT role, COUNT(*) as count 
       FROM users 
       GROUP BY role 
       ORDER BY role`
    );
    console.log('   Current roles in database:');
    beforeResult.rows.forEach(row => {
      console.log(`   - ${row.role}: ${row.count} user(s)`);
    });
    console.log('');
    
    // Ask for confirmation (in production, you might want to add a prompt)
    console.log('⚠️  WARNING: This will update all existing user roles!');
    console.log('   buyer → company_products');
    console.log('   seller → seller_products\n');
    
    console.log('🔄 Executing migration...\n');
    
    // Step 1: Drop the old constraint FIRST
    console.log('Step 1: Dropping old CHECK constraint...');
    try {
      await client.query('ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check');
      console.log('✅ Old constraint dropped\n');
    } catch (error) {
      if (error.message.includes('does not exist')) {
        console.log('⚠️  Constraint already dropped (skipping)\n');
      } else {
        throw error;
      }
    }
    
    // Step 2: Update existing buyer records
    console.log('Step 2: Updating buyer → company_products...');
    const buyerUpdate = await client.query(
      `UPDATE users SET role = 'company_products' WHERE role = 'buyer'`
    );
    console.log(`✅ Updated ${buyerUpdate.rowCount} buyer record(s)\n`);
    
    // Step 3: Update existing seller records
    console.log('Step 3: Updating seller → seller_products...');
    const sellerUpdate = await client.query(
      `UPDATE users SET role = 'seller_products' WHERE role = 'seller'`
    );
    console.log(`✅ Updated ${sellerUpdate.rowCount} seller record(s)\n`);
    
    // Step 4: Add new CHECK constraint
    console.log('Step 4: Adding new CHECK constraint...');
    await client.query(`
      ALTER TABLE users 
      ADD CONSTRAINT users_role_check 
      CHECK (role IN ('admin', 'moderator', 'viewer', 'superadmin', 'company_products', 'seller_products'))
    `);
    console.log('✅ New constraint added\n');
    
    // Step 5: Update default value
    console.log('Step 5: Updating default role value...');
    await client.query(`ALTER TABLE users ALTER COLUMN role SET DEFAULT 'company_products'`);
    console.log('✅ Default value updated\n');
    
    // Run verification query
    console.log('\n📊 Verification:');
    const afterResult = await client.query(
      `SELECT role, COUNT(*) as count 
       FROM users 
       GROUP BY role 
       ORDER BY role`
    );
    console.log('   Updated roles in database:');
    afterResult.rows.forEach(row => {
      console.log(`   - ${row.role}: ${row.count} user(s)`);
    });
    
    // Check constraint
    const constraintResult = await client.query(
      `SELECT check_clause
       FROM information_schema.check_constraints
       WHERE constraint_name = 'users_role_check'`
    );
    
    if (constraintResult.rows.length > 0) {
      console.log('\n✅ CHECK constraint updated:');
      console.log(`   ${constraintResult.rows[0].check_clause}`);
    }
    
    // Check default value
    const defaultResult = await client.query(
      `SELECT column_default
       FROM information_schema.columns
       WHERE table_name = 'users' AND column_name = 'role'`
    );
    
    if (defaultResult.rows.length > 0) {
      console.log('\n✅ Default role value updated:');
      console.log(`   ${defaultResult.rows[0].column_default}`);
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ Migration 009 completed successfully!\n');
    console.log('📝 Next Steps:');
    console.log('   1. Restart your backend server');
    console.log('   2. Test signup/login with new role names');
    console.log('   3. Verify role-based routing works correctly\n');
    
  } catch (error) {
    console.error('\n❌ Migration failed:');
    console.error('   Error:', error.message);
    console.error('   Code:', error.code);
    if (error.detail) {
      console.error('   Detail:', error.detail);
    }
    process.exit(1);
  } finally {
    if (client) {
      client.release();
    }
    await pool.end();
  }
}

runMigration();

