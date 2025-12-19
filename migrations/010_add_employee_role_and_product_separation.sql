-- Migration 010: Add employee role and product separation
-- This migration:
-- 1. Adds 'employee' role to users table
-- 2. Adds product_type field to products table (company_product vs seller_product)
-- 3. Adds approved_at field to products table
-- 4. Migrates existing products to appropriate types based on seller role

-- Step 1: Add 'employee' role to users table constraint
DO $$
BEGIN
  -- Drop existing constraint
  ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
  
  -- Add new constraint with employee role
  ALTER TABLE users 
  ADD CONSTRAINT users_role_check 
  CHECK (role IN ('admin', 'moderator', 'viewer', 'superadmin', 'company_products', 'seller_products', 'employee'));
  
  RAISE NOTICE '✅ Added employee role to users table constraint';
END $$;

-- Step 2: Add product_type column to products table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'product_type'
  ) THEN
    ALTER TABLE products ADD COLUMN product_type VARCHAR(20) DEFAULT 'seller_product';
    
    -- Add constraint for product_type
    ALTER TABLE products 
    ADD CONSTRAINT products_product_type_check 
    CHECK (product_type IN ('company_product', 'seller_product'));
    
    RAISE NOTICE '✅ Added product_type column to products table';
  ELSE
    RAISE NOTICE '⚠️  product_type column already exists';
  END IF;
END $$;

-- Step 3: Migrate existing products based on seller role
-- Products from users with role 'seller_products' → seller_product
-- Products from users with role 'company_products' or admin roles → company_product
UPDATE products p
SET product_type = CASE
  WHEN EXISTS (
    SELECT 1 FROM users u 
    WHERE u.id = p.seller_id 
    AND u.role = 'seller_products'
  ) THEN 'seller_product'
  ELSE 'company_product'
END
WHERE product_type IS NULL OR product_type = 'seller_product';

-- Step 4: Add approved_at column to products table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'approved_at'
  ) THEN
    ALTER TABLE products ADD COLUMN approved_at TIMESTAMP;
    
    -- Set approved_at for existing approved products (use updated_at or created_at as fallback)
    UPDATE products 
    SET approved_at = COALESCE(updated_at, created_at)
    WHERE status = 'approved' AND approved_at IS NULL;
    
    RAISE NOTICE '✅ Added approved_at column to products table';
  ELSE
    RAISE NOTICE '⚠️  approved_at column already exists';
  END IF;
END $$;

-- Step 4b: Add duration column to products table (1, 2, or 3 days only)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'duration'
  ) THEN
    ALTER TABLE products ADD COLUMN duration INTEGER DEFAULT 1;
    
    -- Add constraint: duration must be 1, 2, or 3
    ALTER TABLE products 
    ADD CONSTRAINT products_duration_check 
    CHECK (duration IN (1, 2, 3));
    
    -- Calculate duration from existing auction_end_time for approved products
    UPDATE products 
    SET duration = CASE
      WHEN approved_at IS NOT NULL AND auction_end_time IS NOT NULL THEN
        GREATEST(1, LEAST(3, EXTRACT(EPOCH FROM (auction_end_time - approved_at)) / 86400)::INTEGER)
      ELSE 1
    END
    WHERE duration IS NULL;
    
    RAISE NOTICE '✅ Added duration column to products table';
  ELSE
    RAISE NOTICE '⚠️  duration column already exists';
  END IF;
END $$;

-- Step 5: Update auction_end_time logic
-- For approved products, ensure auction_end_time is calculated from approved_at + duration
-- This will be handled in application logic, but we ensure approved_at exists

-- Step 6: Verify changes
DO $$
DECLARE
  role_count INTEGER;
  product_type_count INTEGER;
  approved_at_count INTEGER;
BEGIN
  -- Check role constraint
  SELECT COUNT(*) INTO role_count
  FROM information_schema.check_constraints
  WHERE constraint_name = 'users_role_check'
  AND check_clause LIKE '%employee%';
  
  IF role_count > 0 THEN
    RAISE NOTICE '✅ Role constraint includes employee';
  ELSE
    RAISE WARNING '❌ Role constraint does not include employee';
  END IF;
  
  -- Check product_type column
  SELECT COUNT(*) INTO product_type_count
  FROM information_schema.columns
  WHERE table_name = 'products' AND column_name = 'product_type';
  
  IF product_type_count > 0 THEN
    RAISE NOTICE '✅ product_type column exists';
  ELSE
    RAISE WARNING '❌ product_type column missing';
  END IF;
  
  -- Check approved_at column
  SELECT COUNT(*) INTO approved_at_count
  FROM information_schema.columns
  WHERE table_name = 'products' AND column_name = 'approved_at';
  
  IF approved_at_count > 0 THEN
    RAISE NOTICE '✅ approved_at column exists';
  ELSE
    RAISE WARNING '❌ approved_at column missing';
  END IF;
END $$;

-- Summary
SELECT 
  'Migration 010 Summary' as info,
  (SELECT COUNT(*) FROM users WHERE role = 'employee') as employee_users,
  (SELECT COUNT(*) FROM products WHERE product_type = 'company_product') as company_products,
  (SELECT COUNT(*) FROM products WHERE product_type = 'seller_product') as seller_products,
  (SELECT COUNT(*) FROM products WHERE approved_at IS NOT NULL) as products_with_approved_at,
  (SELECT COUNT(*) FROM products WHERE duration IS NOT NULL) as products_with_duration;

