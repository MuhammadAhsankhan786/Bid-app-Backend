-- Rollback Migration: 006_enhance_products_table.sql
-- WARNING: This will remove the enhancements made in migration 006

-- Step 1: Drop indexes
DROP INDEX IF EXISTS products_seller_idx;
DROP INDEX IF EXISTS products_category_idx;
DROP INDEX IF EXISTS products_status_idx;
DROP INDEX IF EXISTS products_created_at_idx;

-- Step 2: Remove rejection_reason column
ALTER TABLE products DROP COLUMN IF EXISTS rejection_reason;

-- Step 3: Remove updated_at column
ALTER TABLE products DROP COLUMN IF EXISTS updated_at;

-- Step 4: Remove images column (keep image_url)
ALTER TABLE products DROP COLUMN IF EXISTS images;

-- Step 5: Remove category_id foreign key constraint
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_category_id_fkey;

-- Step 6: Remove category_id column (optional - comment out if you want to keep the column)
-- ALTER TABLE products DROP COLUMN IF EXISTS category_id;

-- Step 7: Remove active column from categories (optional)
-- ALTER TABLE categories DROP COLUMN IF EXISTS active;

SELECT 'Rollback completed' as status;



