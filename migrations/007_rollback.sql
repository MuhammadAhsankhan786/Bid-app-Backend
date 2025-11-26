-- Rollback Migration: 007_add_referral_system.sql
-- WARNING: This will remove all referral system tables and columns

-- Step 1: Drop trigger
DROP TRIGGER IF EXISTS trigger_update_referral_transactions_updated_at ON referral_transactions;
DROP FUNCTION IF EXISTS update_referral_transactions_updated_at();

-- Step 2: Drop indexes
DROP INDEX IF EXISTS idx_referral_transactions_inviter;
DROP INDEX IF EXISTS idx_referral_transactions_invitee;
DROP INDEX IF EXISTS idx_referral_transactions_status;
DROP INDEX IF EXISTS idx_referral_transactions_created;

-- Step 3: Drop referral_transactions table
DROP TABLE IF EXISTS referral_transactions CASCADE;

-- Step 4: Drop app_settings table (optional - comment out if you want to keep it)
-- DROP TABLE IF EXISTS app_settings CASCADE;

-- Step 5: Remove referral columns from users table
ALTER TABLE users DROP COLUMN IF EXISTS referral_code;
ALTER TABLE users DROP COLUMN IF EXISTS referred_by;
ALTER TABLE users DROP COLUMN IF EXISTS reward_balance;

SELECT 'Rollback completed' as status;

