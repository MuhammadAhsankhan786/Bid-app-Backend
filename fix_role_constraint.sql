-- Fix Role Constraint - Remove old 'buyer'/'seller' and ensure 'company_products'/'seller_products'
-- SAFE VERSION: No duplicates, idempotent (can run multiple times safely)
-- Run this SQL script to fix the database constraint

-- Step 0: Check current state (for verification)
SELECT 
    'Current Constraint Check' as step,
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'users'::regclass
AND conname = 'users_role_check';

SELECT 
    'Current User Roles' as step,
    role, 
    COUNT(*) as count 
FROM users 
GROUP BY role
ORDER BY role;

-- Step 1: Drop the old constraint (IF EXISTS ensures no error if already dropped)
ALTER TABLE users 
DROP CONSTRAINT IF EXISTS users_role_check;

-- Step 2: Add new constraint with correct role names
-- Only add if it doesn't already exist (PostgreSQL will error if duplicate, so we drop first)
ALTER TABLE users 
ADD CONSTRAINT users_role_check 
CHECK (role IN ('admin', 'moderator', 'viewer', 'superadmin', 'company_products', 'seller_products'));

-- Step 3: Update any remaining old role names in the database
-- WHERE clause ensures we only update what needs updating (no unnecessary updates)
UPDATE users 
SET role = 'company_products' 
WHERE role = 'buyer' AND role != 'company_products';

UPDATE users 
SET role = 'seller_products' 
WHERE role = 'seller' AND role != 'seller_products';

-- Step 4: Verify the constraint was added correctly
SELECT 
    'Final Constraint Check' as step,
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'users'::regclass
AND conname = 'users_role_check';

-- Step 5: Verify all user roles (should show no 'buyer' or 'seller')
SELECT 
    'Final User Roles' as step,
    role, 
    COUNT(*) as count 
FROM users 
GROUP BY role
ORDER BY role;

