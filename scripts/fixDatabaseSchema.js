/**
 * Fix Database Schema Issues
 * Adds missing columns and fixes schema mismatches
 */

import pool from '../src/config/db.js';
import dotenv from 'dotenv';

dotenv.config();

async function fixDatabaseSchema() {
  console.log('🔧 Fixing database schema issues...\n');
  
  try {
    // 1. Fix referral_transactions table - add status column if missing
    console.log('1. Checking referral_transactions table...');
    try {
      const checkStatus = await pool.query(
        `SELECT column_name FROM information_schema.columns 
         WHERE table_name = 'referral_transactions' AND column_name = 'status'`
      );
      
      if (checkStatus.rows.length === 0) {
        console.log('   ⚠️  status column missing, adding...');
        await pool.query(
          `ALTER TABLE referral_transactions 
           ADD COLUMN status VARCHAR(20) DEFAULT 'pending' 
           CHECK (status IN ('pending', 'awarded', 'revoked'))`
        );
        console.log('   ✅ Added status column');
      } else {
        console.log('   ✅ status column exists');
      }
    } catch (error) {
      console.log('   ⚠️  referral_transactions table might not exist:', error.message);
    }
    
    // 2. Fix app_settings table - check and fix schema
    console.log('\n2. Checking app_settings table...');
    try {
      const checkTable = await pool.query(
        `SELECT table_name FROM information_schema.tables 
         WHERE table_name = 'app_settings'`
      );
      
      if (checkTable.rows.length === 0) {
        console.log('   ⚠️  app_settings table missing, creating...');
        await pool.query(
          `CREATE TABLE app_settings (
            id SERIAL PRIMARY KEY,
            setting_key VARCHAR(100) UNIQUE NOT NULL,
            setting_value TEXT NOT NULL,
            description TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )`
        );
        
        await pool.query(
          `INSERT INTO app_settings (setting_key, setting_value, description)
           VALUES ('referral_reward_amount', '1.00', 'Default reward amount for each successful referral')
           ON CONFLICT (setting_key) DO NOTHING`
        );
        console.log('   ✅ Created app_settings table');
      } else {
        // Check if setting_key column exists
        const checkKey = await pool.query(
          `SELECT column_name FROM information_schema.columns 
           WHERE table_name = 'app_settings' AND column_name = 'setting_key'`
        );
        
        if (checkKey.rows.length === 0) {
          console.log('   ⚠️  setting_key column missing, fixing...');
          // Table exists but wrong schema - need to recreate
          await pool.query('DROP TABLE IF EXISTS app_settings CASCADE');
          await pool.query(
            `CREATE TABLE app_settings (
              id SERIAL PRIMARY KEY,
              setting_key VARCHAR(100) UNIQUE NOT NULL,
              setting_value TEXT NOT NULL,
              description TEXT,
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`
          );
          
          await pool.query(
            `INSERT INTO app_settings (setting_key, setting_value, description)
             VALUES ('referral_reward_amount', '1.00', 'Default reward amount for each successful referral')
             ON CONFLICT (setting_key) DO NOTHING`
          );
          console.log('   ✅ Fixed app_settings table schema');
        } else {
          console.log('   ✅ app_settings table is correct');
        }
      }
    } catch (error) {
      console.log('   ❌ Error fixing app_settings:', error.message);
    }
    
    // 3. Fix categories table - add active column if missing
    console.log('\n3. Checking categories table...');
    try {
      const checkActive = await pool.query(
        `SELECT column_name FROM information_schema.columns 
         WHERE table_name = 'categories' AND column_name = 'active'`
      );
      
      if (checkActive.rows.length === 0) {
        console.log('   ⚠️  active column missing, adding...');
        await pool.query(
          `ALTER TABLE categories ADD COLUMN active BOOLEAN DEFAULT true`
        );
        await pool.query(`UPDATE categories SET active = true WHERE active IS NULL`);
        console.log('   ✅ Added active column');
      } else {
        console.log('   ✅ active column exists');
      }
    } catch (error) {
      console.log('   ⚠️  Error fixing categories:', error.message);
    }
    
    console.log('\n✅ Database schema fixes complete!');
    
  } catch (error) {
    console.error('❌ Error fixing database schema:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

fixDatabaseSchema()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });

