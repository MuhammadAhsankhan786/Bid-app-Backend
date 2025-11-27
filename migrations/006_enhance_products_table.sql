-- Migration: Enhance Products Table for Complete Product Upload Module
-- Date: 2024
-- Description: Adds missing columns, converts image_url to images JSONB, adds category_id FK, and indexes

-- Step 1: Add images JSONB column (for multiple images)
DO $$
BEGIN
  -- Check if images column exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'images'
  ) THEN
    -- Add images column as JSONB
    ALTER TABLE products ADD COLUMN images JSONB DEFAULT '[]'::jsonb;
    
    -- Migrate existing image_url data to images array
    UPDATE products 
    SET images = CASE 
      WHEN image_url IS NOT NULL AND image_url != '' 
      THEN jsonb_build_array(image_url)
      ELSE '[]'::jsonb
    END
    WHERE images IS NULL OR images = '[]'::jsonb;
    
    RAISE NOTICE '✅ Added images JSONB column and migrated existing data';
  ELSE
    RAISE NOTICE '✅ images column already exists';
  END IF;
END $$;

-- Step 2: Ensure category_id exists and has FK constraint
DO $$
BEGIN
  -- Add category_id if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'category_id'
  ) THEN
    ALTER TABLE products ADD COLUMN category_id INTEGER;
    RAISE NOTICE '✅ Added category_id column';
  ELSE
    RAISE NOTICE '✅ category_id column already exists';
  END IF;
  
  -- Add foreign key constraint if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'products_category_id_fkey' 
    AND table_name = 'products'
  ) THEN
    ALTER TABLE products 
    ADD CONSTRAINT products_category_id_fkey 
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL;
    RAISE NOTICE '✅ Added category_id foreign key constraint';
  ELSE
    RAISE NOTICE '✅ category_id foreign key constraint already exists';
  END IF;
END $$;

-- Step 3: Add updated_at timestamp
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE products ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
    RAISE NOTICE '✅ Added updated_at column';
  ELSE
    RAISE NOTICE '✅ updated_at column already exists';
  END IF;
END $$;

-- Step 4: Add rejection_reason column (for admin feedback)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'rejection_reason'
  ) THEN
    ALTER TABLE products ADD COLUMN rejection_reason TEXT;
    RAISE NOTICE '✅ Added rejection_reason column';
  ELSE
    RAISE NOTICE '✅ rejection_reason column already exists';
  END IF;
END $$;

-- Step 5: Ensure status constraint includes all required values
DO $$
BEGIN
  -- Update status constraint if needed
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'products_status_check' 
    AND table_name = 'products'
  ) THEN
    -- Drop old constraint
    ALTER TABLE products DROP CONSTRAINT products_status_check;
  END IF;
  
  -- Add new constraint with all required values
  ALTER TABLE products 
  ADD CONSTRAINT products_status_check 
  CHECK (status IN ('pending', 'approved', 'rejected', 'sold'));
  
  RAISE NOTICE '✅ Updated status constraint';
END $$;

-- Step 6: Add NOT NULL constraints on required fields
DO $$
BEGIN
  -- Ensure seller_id is NOT NULL
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' 
    AND column_name = 'seller_id' 
    AND is_nullable = 'YES'
  ) THEN
    -- First, set NULL seller_id to a default (or handle existing NULLs)
    UPDATE products SET seller_id = 1 WHERE seller_id IS NULL;
    ALTER TABLE products ALTER COLUMN seller_id SET NOT NULL;
    RAISE NOTICE '✅ Set seller_id to NOT NULL';
  END IF;
  
  -- Ensure title is NOT NULL
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' 
    AND column_name = 'title' 
    AND is_nullable = 'YES'
  ) THEN
    UPDATE products SET title = 'Untitled Product' WHERE title IS NULL;
    ALTER TABLE products ALTER COLUMN title SET NOT NULL;
    RAISE NOTICE '✅ Set title to NOT NULL';
  END IF;
  
  -- Ensure starting_price is NOT NULL
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' 
    AND column_name = 'starting_price' 
    AND is_nullable = 'YES'
  ) THEN
    UPDATE products SET starting_price = 0 WHERE starting_price IS NULL;
    ALTER TABLE products ALTER COLUMN starting_price SET NOT NULL;
    RAISE NOTICE '✅ Set starting_price to NOT NULL';
  END IF;
  
  -- Ensure status is NOT NULL
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' 
    AND column_name = 'status' 
    AND is_nullable = 'YES'
  ) THEN
    UPDATE products SET status = 'pending' WHERE status IS NULL;
    ALTER TABLE products ALTER COLUMN status SET NOT NULL;
    RAISE NOTICE '✅ Set status to NOT NULL';
  END IF;
END $$;

-- Step 7: Create indexes for performance
CREATE INDEX IF NOT EXISTS products_seller_idx ON products(seller_id);
CREATE INDEX IF NOT EXISTS products_category_idx ON products(category_id);
CREATE INDEX IF NOT EXISTS products_status_idx ON products(status);
CREATE INDEX IF NOT EXISTS products_created_at_idx ON products(created_at DESC);

RAISE NOTICE '✅ Created indexes on products table';

-- Step 8: Ensure categories table has active column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'categories' AND column_name = 'active'
  ) THEN
    ALTER TABLE categories ADD COLUMN active BOOLEAN DEFAULT true;
    UPDATE categories SET active = true WHERE active IS NULL;
    RAISE NOTICE '✅ Added active column to categories table';
  ELSE
    RAISE NOTICE '✅ active column already exists in categories table';
  END IF;
END $$;

-- Summary
SELECT 
  'Migration 006 completed successfully' as status,
  COUNT(*) FILTER (WHERE column_name = 'images') as has_images,
  COUNT(*) FILTER (WHERE column_name = 'category_id') as has_category_id,
  COUNT(*) FILTER (WHERE column_name = 'updated_at') as has_updated_at,
  COUNT(*) FILTER (WHERE column_name = 'rejection_reason') as has_rejection_reason
FROM information_schema.columns 
WHERE table_name = 'products';



