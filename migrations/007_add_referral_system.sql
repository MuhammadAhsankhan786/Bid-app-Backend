-- Migration: Add Referral System
-- Date: 2024
-- Description: Adds referral_code, referred_by, reward_balance to users table
--              Creates referral_transactions and app_settings tables

-- Step 1: Add referral columns to users table
DO $$
BEGIN
  -- Add referral_code column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'referral_code'
  ) THEN
    ALTER TABLE users ADD COLUMN referral_code VARCHAR(10) UNIQUE;
    RAISE NOTICE '✅ Added referral_code column to users table';
  ELSE
    RAISE NOTICE '✅ referral_code column already exists';
  END IF;

  -- Add referred_by column (stores inviter's referral_code)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'referred_by'
  ) THEN
    ALTER TABLE users ADD COLUMN referred_by VARCHAR(10);
    RAISE NOTICE '✅ Added referred_by column to users table';
  ELSE
    RAISE NOTICE '✅ referred_by column already exists';
  END IF;

  -- Add reward_balance column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'reward_balance'
  ) THEN
    ALTER TABLE users ADD COLUMN reward_balance NUMERIC(10,2) DEFAULT 0.00;
    RAISE NOTICE '✅ Added reward_balance column to users table';
  ELSE
    RAISE NOTICE '✅ reward_balance column already exists';
  END IF;
END $$;

-- Step 2: Create referral_transactions table
CREATE TABLE IF NOT EXISTS referral_transactions (
  id SERIAL PRIMARY KEY,
  inviter_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  invitee_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  invitee_phone VARCHAR(20) NOT NULL,
  amount NUMERIC(10,2) DEFAULT 1.00 NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'awarded', 'revoked')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  -- Indexes for performance
  CONSTRAINT fk_inviter FOREIGN KEY (inviter_user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_invitee FOREIGN KEY (invitee_user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Create indexes for referral_transactions
CREATE INDEX IF NOT EXISTS idx_referral_transactions_inviter ON referral_transactions(inviter_user_id);
CREATE INDEX IF NOT EXISTS idx_referral_transactions_invitee ON referral_transactions(invitee_user_id);
CREATE INDEX IF NOT EXISTS idx_referral_transactions_status ON referral_transactions(status);
CREATE INDEX IF NOT EXISTS idx_referral_transactions_created ON referral_transactions(created_at DESC);

RAISE NOTICE '✅ Created referral_transactions table with indexes';

-- Step 3: Create app_settings table (if not exists)
CREATE TABLE IF NOT EXISTS app_settings (
  id SERIAL PRIMARY KEY,
  setting_key VARCHAR(100) UNIQUE NOT NULL,
  setting_value TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default referral reward amount if not exists
INSERT INTO app_settings (setting_key, setting_value, description)
VALUES ('referral_reward_amount', '1.00', 'Default reward amount for each successful referral')
ON CONFLICT (setting_key) DO NOTHING;

RAISE NOTICE '✅ Created app_settings table and inserted default referral reward amount';

-- Step 4: Auto-generate referral codes for existing users
DO $$
DECLARE
  user_record RECORD;
  new_code VARCHAR(10);
  code_exists BOOLEAN;
  attempts INTEGER;
BEGIN
  FOR user_record IN SELECT id FROM users WHERE referral_code IS NULL OR referral_code = ''
  LOOP
    attempts := 0;
    LOOP
      -- Generate 6-character uppercase alphanumeric code
      new_code := UPPER(
        SUBSTRING(
          MD5(RANDOM()::TEXT || user_record.id::TEXT || EXTRACT(EPOCH FROM NOW())::TEXT),
          1, 6
        )
      );
      
      -- Ensure it's alphanumeric only (remove any non-alphanumeric)
      new_code := REGEXP_REPLACE(new_code, '[^A-Z0-9]', '', 'g');
      
      -- If too short, pad with random chars
      WHILE LENGTH(new_code) < 6 LOOP
        new_code := new_code || CHR(65 + FLOOR(RANDOM() * 26)::INTEGER);
      END LOOP;
      
      -- Check if code already exists
      SELECT EXISTS(SELECT 1 FROM users WHERE referral_code = new_code) INTO code_exists;
      
      EXIT WHEN NOT code_exists OR attempts > 10;
      attempts := attempts + 1;
    END LOOP;
    
    -- Update user with generated code
    UPDATE users SET referral_code = new_code WHERE id = user_record.id;
  END LOOP;
  
  RAISE NOTICE '✅ Generated referral codes for existing users';
END $$;

-- Step 5: Add trigger to update updated_at timestamp for referral_transactions
CREATE OR REPLACE FUNCTION update_referral_transactions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_referral_transactions_updated_at ON referral_transactions;
CREATE TRIGGER trigger_update_referral_transactions_updated_at
  BEFORE UPDATE ON referral_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_referral_transactions_updated_at();

RAISE NOTICE '✅ Created trigger for referral_transactions updated_at';

-- Summary
SELECT 
  'Migration 007 completed successfully' as status,
  COUNT(*) FILTER (WHERE column_name = 'referral_code') as has_referral_code,
  COUNT(*) FILTER (WHERE column_name = 'referred_by') as has_referred_by,
  COUNT(*) FILTER (WHERE column_name = 'reward_balance') as has_reward_balance
FROM information_schema.columns 
WHERE table_name = 'users';

SELECT 
  'referral_transactions table' as table_name,
  COUNT(*) as column_count
FROM information_schema.columns 
WHERE table_name = 'referral_transactions';

SELECT 
  'app_settings table' as table_name,
  COUNT(*) as column_count
FROM information_schema.columns 
WHERE table_name = 'app_settings';



