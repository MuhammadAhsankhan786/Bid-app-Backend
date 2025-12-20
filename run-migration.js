/**
 * Run Migration to Add Missing Tables and Columns
 */

import pool from './src/config/db.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function runMigration() {
  console.log('🚀 Running Migration to Add Missing Tables and Columns...\n');
  console.log('='.repeat(80));
  
  const migrationPath = path.join(__dirname, 'migrations', '011_add_missing_tables_columns.sql');
  const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
  
  try {
    console.log('📋 Executing migration...\n');
    await pool.query(migrationSQL);
    console.log('✅ Migration completed successfully!\n');
    
    // Verify
    console.log('🔍 Verifying...\n');
    
    const checks = [
      { name: 'products.approved_at', query: "SELECT EXISTS (SELECT FROM information_schema.columns WHERE table_name='products' AND column_name='approved_at')" },
      { name: 'products.duration', query: "SELECT EXISTS (SELECT FROM information_schema.columns WHERE table_name='products' AND column_name='duration')" },
      { name: 'orders.payment_status', query: "SELECT EXISTS (SELECT FROM information_schema.columns WHERE table_name='orders' AND column_name='payment_status')" },
      { name: 'orders.delivery_status', query: "SELECT EXISTS (SELECT FROM information_schema.columns WHERE table_name='orders' AND column_name='delivery_status')" },
      { name: 'referrals table', query: "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name='referrals')" },
      { name: 'wallet table', query: "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name='wallet')" },
      { name: 'referral_settings table', query: "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name='referral_settings')" },
      { name: 'otp_store table', query: "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name='otp_store')" }
    ];
    
    for (const check of checks) {
      const result = await pool.query(check.query);
      const exists = result.rows[0].exists;
      console.log(`   ${exists ? '✅' : '❌'} ${check.name}: ${exists ? 'EXISTS' : 'MISSING'}`);
    }
    
    console.log('\n');
    console.log('='.repeat(80));
    console.log('✅ Migration Complete!');
    console.log('='.repeat(80));
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    console.error('   Error message:', error.message);
    console.error('   Error code:', error.code);
    console.error('   Error detail:', error.detail);
    process.exit(1);
  }
  
  process.exit(0);
}

runMigration().catch(error => {
  console.error('❌ Migration failed:', error);
  process.exit(1);
});

