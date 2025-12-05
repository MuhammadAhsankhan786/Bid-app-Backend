-- Migration: Update role names from 'buyer'/'seller' to 'company_products'/'seller_products'
-- IMPORTANT: Run this migration AFTER updating all backend code references
-- This migration updates existing database records

-- Step 1: Update existing data
UPDATE users 
SET role = 'company_products' 
WHERE role = 'buyer';

UPDATE users 
SET role = 'seller_products' 
WHERE role = 'seller';

-- Step 2: Update CHECK constraint (drop old, add new)
ALTER TABLE users 
DROP CONSTRAINT IF EXISTS users_role_check;

ALTER TABLE users 
ADD CONSTRAINT users_role_check 
CHECK (role IN ('admin', 'moderator', 'viewer', 'superadmin', 'company_products', 'seller_products'));

-- Step 3: Update default value
ALTER TABLE users 
ALTER COLUMN role SET DEFAULT 'company_products';

-- Step 4: Verify changes
SELECT role, COUNT(*) as count 
FROM users 
GROUP BY role
ORDER BY role;

-- Expected output:
-- company_products | X (count of former buyers)
-- seller_products  | Y (count of former sellers)

