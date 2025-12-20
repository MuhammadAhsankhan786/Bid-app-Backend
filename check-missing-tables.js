/**
 * Check Missing Tables and Columns
 */

import pool from './src/config/db.js';

async function checkMissingTables() {
  console.log('🔍 Checking Missing Tables and Columns...\n');
  console.log('='.repeat(80));
  
  const requiredTables = [
    'users',
    'products',
    'categories',
    'orders',
    'bids',
    'notifications',
    'admin_activity_log',
    'otp_store',
    'documents',
    'banners',
    'payments',
    'referrals',
    'wallet',
    'referral_settings'
  ];
  
  const requiredColumns = {
    'products': ['auction_end_time', 'approved_at', 'duration', 'rejection_reason'],
    'orders': ['payment_status', 'delivery_status'],
    'users': ['status', 'phone', 'role']
  };
  
  console.log('\n📋 Checking Tables...\n');
  const missingTables = [];
  
  for (const table of requiredTables) {
    try {
      const result = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = $1
        )
      `, [table]);
      
      const exists = result.rows[0].exists;
      if (exists) {
        console.log(`   ✅ ${table}: EXISTS`);
      } else {
        console.log(`   ❌ ${table}: MISSING`);
        missingTables.push(table);
      }
    } catch (error) {
      console.log(`   ❌ ${table}: ERROR - ${error.message}`);
      missingTables.push(table);
    }
  }
  
  console.log('\n📋 Checking Columns...\n');
  const missingColumns = [];
  
  for (const [table, columns] of Object.entries(requiredColumns)) {
    for (const column of columns) {
      try {
        const result = await pool.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_name = $1 
            AND column_name = $2
          )
        `, [table, column]);
        
        const exists = result.rows[0].exists;
        if (exists) {
          console.log(`   ✅ ${table}.${column}: EXISTS`);
        } else {
          console.log(`   ❌ ${table}.${column}: MISSING`);
          missingColumns.push({ table, column });
        }
      } catch (error) {
        console.log(`   ❌ ${table}.${column}: ERROR - ${error.message}`);
        missingColumns.push({ table, column });
      }
    }
  }
  
  console.log('\n');
  console.log('='.repeat(80));
  console.log('📊 SUMMARY');
  console.log('='.repeat(80));
  console.log(`Missing Tables: ${missingTables.length}`);
  if (missingTables.length > 0) {
    missingTables.forEach(t => console.log(`   - ${t}`));
  }
  console.log(`Missing Columns: ${missingColumns.length}`);
  if (missingColumns.length > 0) {
    missingColumns.forEach(c => console.log(`   - ${c.table}.${c.column}`));
  }
  console.log('');
  
  // Generate migration script
  if (missingTables.length > 0 || missingColumns.length > 0) {
    console.log('📝 Generating Migration Script...\n');
    let migrationSQL = '-- Migration to add missing tables and columns\n\n';
    
    // Add missing tables
    if (missingTables.includes('documents')) {
      migrationSQL += `-- Documents table\n`;
      migrationSQL += `CREATE TABLE IF NOT EXISTS documents (\n`;
      migrationSQL += `  id SERIAL PRIMARY KEY,\n`;
      migrationSQL += `  product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,\n`;
      migrationSQL += `  file_name VARCHAR(255) NOT NULL,\n`;
      migrationSQL += `  file_path TEXT NOT NULL,\n`;
      migrationSQL += `  file_type VARCHAR(50),\n`;
      migrationSQL += `  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP\n`;
      migrationSQL += `);\n\n`;
    }
    
    if (missingTables.includes('payments')) {
      migrationSQL += `-- Payments table\n`;
      migrationSQL += `CREATE TABLE IF NOT EXISTS payments (\n`;
      migrationSQL += `  id SERIAL PRIMARY KEY,\n`;
      migrationSQL += `  user_id INTEGER REFERENCES users(id),\n`;
      migrationSQL += `  order_id INTEGER REFERENCES orders(id),\n`;
      migrationSQL += `  amount DECIMAL(10,2) NOT NULL,\n`;
      migrationSQL += `  method VARCHAR(50),\n`;
      migrationSQL += `  status VARCHAR(20) DEFAULT 'pending',\n`;
      migrationSQL += `  transaction_id VARCHAR(255),\n`;
      migrationSQL += `  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP\n`;
      migrationSQL += `);\n\n`;
    }
    
    if (missingTables.includes('referrals')) {
      migrationSQL += `-- Referrals table\n`;
      migrationSQL += `CREATE TABLE IF NOT EXISTS referrals (\n`;
      migrationSQL += `  id SERIAL PRIMARY KEY,\n`;
      migrationSQL += `  referrer_id INTEGER REFERENCES users(id),\n`;
      migrationSQL += `  referred_id INTEGER REFERENCES users(id),\n`;
      migrationSQL += `  reward_amount DECIMAL(10,2) DEFAULT 0,\n`;
      migrationSQL += `  status VARCHAR(20) DEFAULT 'pending',\n`;
      migrationSQL += `  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP\n`;
      migrationSQL += `);\n\n`;
    }
    
    if (missingTables.includes('wallet')) {
      migrationSQL += `-- Wallet table\n`;
      migrationSQL += `CREATE TABLE IF NOT EXISTS wallet (\n`;
      migrationSQL += `  id SERIAL PRIMARY KEY,\n`;
      migrationSQL += `  user_id INTEGER REFERENCES users(id),\n`;
      migrationSQL += `  balance DECIMAL(10,2) DEFAULT 0,\n`;
      migrationSQL += `  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,\n`;
      migrationSQL += `  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP\n`;
      migrationSQL += `);\n\n`;
    }
    
    if (missingTables.includes('referral_settings')) {
      migrationSQL += `-- Referral Settings table\n`;
      migrationSQL += `CREATE TABLE IF NOT EXISTS referral_settings (\n`;
      migrationSQL += `  id SERIAL PRIMARY KEY,\n`;
      migrationSQL += `  enabled BOOLEAN DEFAULT true,\n`;
      migrationSQL += `  reward_amount DECIMAL(10,2) DEFAULT 0,\n`;
      migrationSQL += `  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP\n`;
      migrationSQL += `);\n\n`;
    }
    
    // Add missing columns
    migrationSQL += `-- Add missing columns\n`;
    migrationSQL += `DO $$\n`;
    migrationSQL += `BEGIN\n`;
    
    for (const { table, column } of missingColumns) {
      if (table === 'products' && column === 'auction_end_time') {
        migrationSQL += `  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='auction_end_time') THEN\n`;
        migrationSQL += `    ALTER TABLE products ADD COLUMN auction_end_time TIMESTAMP;\n`;
        migrationSQL += `  END IF;\n`;
      }
      
      if (table === 'products' && column === 'approved_at') {
        migrationSQL += `  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='approved_at') THEN\n`;
        migrationSQL += `    ALTER TABLE products ADD COLUMN approved_at TIMESTAMP;\n`;
        migrationSQL += `  END IF;\n`;
      }
      
      if (table === 'products' && column === 'duration') {
        migrationSQL += `  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='duration') THEN\n`;
        migrationSQL += `    ALTER TABLE products ADD COLUMN duration INTEGER DEFAULT 1;\n`;
        migrationSQL += `  END IF;\n`;
      }
      
      if (table === 'products' && column === 'rejection_reason') {
        migrationSQL += `  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='rejection_reason') THEN\n`;
        migrationSQL += `    ALTER TABLE products ADD COLUMN rejection_reason TEXT;\n`;
        migrationSQL += `  END IF;\n`;
      }
      
      if (table === 'orders' && column === 'payment_status') {
        migrationSQL += `  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='payment_status') THEN\n`;
        migrationSQL += `    ALTER TABLE orders ADD COLUMN payment_status VARCHAR(20) DEFAULT 'pending';\n`;
        migrationSQL += `  END IF;\n`;
      }
      
      if (table === 'orders' && column === 'delivery_status') {
        migrationSQL += `  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='delivery_status') THEN\n`;
        migrationSQL += `    ALTER TABLE orders ADD COLUMN delivery_status VARCHAR(20) DEFAULT 'pending';\n`;
        migrationSQL += `  END IF;\n`;
      }
    }
    
    migrationSQL += `END $$;\n`;
    
    // Save migration script
    const fs = await import('fs');
    const path = await import('path');
    const migrationPath = path.join(process.cwd(), 'migrations', '011_add_missing_tables_columns.sql');
    fs.writeFileSync(migrationPath, migrationSQL);
    console.log(`✅ Migration script saved to: ${migrationPath}\n`);
  } else {
    console.log('✅ All tables and columns exist!\n');
  }
  
  console.log('='.repeat(80));
  
  process.exit(0);
}

checkMissingTables().catch(error => {
  console.error('❌ Check failed:', error);
  process.exit(1);
});

