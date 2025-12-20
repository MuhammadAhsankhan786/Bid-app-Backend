-- Migration to add missing tables and columns

-- OTP Store table
CREATE TABLE IF NOT EXISTS otp_store (
  id SERIAL PRIMARY KEY,
  phone VARCHAR(20) NOT NULL UNIQUE,
  otp VARCHAR(10) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Referrals table
CREATE TABLE IF NOT EXISTS referrals (
  id SERIAL PRIMARY KEY,
  referrer_id INTEGER REFERENCES users(id),
  referred_id INTEGER REFERENCES users(id),
  reward_amount DECIMAL(10,2) DEFAULT 0,
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Wallet table
CREATE TABLE IF NOT EXISTS wallet (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  balance DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Referral Settings table
CREATE TABLE IF NOT EXISTS referral_settings (
  id SERIAL PRIMARY KEY,
  enabled BOOLEAN DEFAULT true,
  reward_amount DECIMAL(10,2) DEFAULT 0,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add missing columns
DO $$
BEGIN
  -- Products table columns
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='approved_at') THEN
    ALTER TABLE products ADD COLUMN approved_at TIMESTAMP;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='duration') THEN
    ALTER TABLE products ADD COLUMN duration INTEGER DEFAULT 1;
  END IF;
  
  -- Orders table columns
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='payment_status') THEN
    ALTER TABLE orders ADD COLUMN payment_status VARCHAR(20) DEFAULT 'pending';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='delivery_status') THEN
    ALTER TABLE orders ADD COLUMN delivery_status VARCHAR(20) DEFAULT 'pending';
  END IF;
  
  -- Documents table columns
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='documents' AND column_name='product_id') THEN
    ALTER TABLE documents ADD COLUMN product_id INTEGER REFERENCES products(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='documents' AND column_name='uploaded_at') THEN
    ALTER TABLE documents ADD COLUMN uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='documents' AND column_name='file_name') THEN
    ALTER TABLE documents ADD COLUMN file_name VARCHAR(255);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='documents' AND column_name='file_type') THEN
    ALTER TABLE documents ADD COLUMN file_type VARCHAR(50);
  END IF;
  
  -- Admin Activity Log table columns
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='admin_activity_log' AND column_name='entity_type') THEN
    ALTER TABLE admin_activity_log ADD COLUMN entity_type VARCHAR(50);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='admin_activity_log' AND column_name='entity_id') THEN
    ALTER TABLE admin_activity_log ADD COLUMN entity_id INTEGER;
  END IF;
END $$;
