-- Complete database schema for BidMaster Admin Panel

-- Categories table
CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  slug VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Enhanced Users table (if not exists, add missing columns)
DO $$ 
BEGIN
  -- Add phone column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='phone') THEN
    ALTER TABLE users ADD COLUMN phone VARCHAR(20) UNIQUE;
  END IF;
  
  -- Update status constraint if needed
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='status') THEN
    -- Update existing status values if they don't match new constraint
    UPDATE users SET status = 'active' WHERE status NOT IN ('active', 'pending', 'suspended', 'blocked', 'approved');
  ELSE
    ALTER TABLE users ADD COLUMN status VARCHAR(20) DEFAULT 'active';
  END IF;
  
  -- Add constraint for status if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'users_status_check' AND table_name = 'users'
  ) THEN
    ALTER TABLE users ADD CONSTRAINT users_status_check 
    CHECK (status IN ('active', 'pending', 'suspended', 'blocked', 'approved'));
  END IF;
  
  -- Add bids_count column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='bids_count') THEN
    ALTER TABLE users ADD COLUMN bids_count INTEGER DEFAULT 0;
  END IF;
END $$;

-- Enhanced Products table (if not exists, add missing columns)
DO $$ 
BEGIN
  -- Add category_id if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='category_id') THEN
    ALTER TABLE products ADD COLUMN category_id INTEGER REFERENCES categories(id);
  END IF;
  
  -- Add seller_id if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='seller_id') THEN
    ALTER TABLE products ADD COLUMN seller_id INTEGER REFERENCES users(id);
  END IF;
  
  -- Add starting_bid if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='starting_bid') THEN
    ALTER TABLE products ADD COLUMN starting_bid DECIMAL(10,2);
  END IF;
  
  -- Add current_bid if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='current_bid') THEN
    ALTER TABLE products ADD COLUMN current_bid DECIMAL(10,2);
  END IF;
  
  -- Add image_url if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='image_url') THEN
    ALTER TABLE products ADD COLUMN image_url TEXT;
  END IF;
  
  -- Add auction_end_time if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='auction_end_time') THEN
    ALTER TABLE products ADD COLUMN auction_end_time TIMESTAMP;
  END IF;
  
  -- Add total_bids if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='total_bids') THEN
    ALTER TABLE products ADD COLUMN total_bids INTEGER DEFAULT 0;
  END IF;
  
  -- Add highest_bidder_id if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='highest_bidder_id') THEN
    ALTER TABLE products ADD COLUMN highest_bidder_id INTEGER REFERENCES users(id);
  END IF;
END $$;

-- Bids table
CREATE TABLE IF NOT EXISTS bids (
  id SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_bid UNIQUE (product_id, user_id, amount)
);

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
  id SERIAL PRIMARY KEY,
  order_number VARCHAR(50) NOT NULL UNIQUE,
  product_id INTEGER NOT NULL REFERENCES products(id),
  buyer_id INTEGER NOT NULL REFERENCES users(id),
  seller_id INTEGER NOT NULL REFERENCES users(id),
  amount DECIMAL(10,2) NOT NULL,
  payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'completed', 'failed', 'refunded')),
  delivery_status VARCHAR(20) DEFAULT 'pending' CHECK (delivery_status IN ('pending', 'shipped', 'in_transit', 'delivered', 'cancelled')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(200) NOT NULL,
  message TEXT,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Admin Activity Log table
CREATE TABLE IF NOT EXISTS admin_activity_log (
  id SERIAL PRIMARY KEY,
  admin_id INTEGER REFERENCES users(id),
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50),
  entity_id INTEGER,
  details JSONB,
  ip_address VARCHAR(45),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- OTP Store table (for production use instead of in-memory)
CREATE TABLE IF NOT EXISTS otp_store (
  id SERIAL PRIMARY KEY,
  phone VARCHAR(20) NOT NULL UNIQUE,
  otp VARCHAR(10) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_seller ON products(seller_id);
CREATE INDEX IF NOT EXISTS idx_bids_product ON bids(product_id);
CREATE INDEX IF NOT EXISTS idx_bids_user ON bids(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_buyer ON orders(buyer_id);
CREATE INDEX IF NOT EXISTS idx_orders_seller ON orders(seller_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(payment_status, delivery_status);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_otp_phone ON otp_store(phone);
CREATE INDEX IF NOT EXISTS idx_otp_expires ON otp_store(expires_at);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for orders table
DROP TRIGGER IF EXISTS update_orders_updated_at ON orders;
CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

