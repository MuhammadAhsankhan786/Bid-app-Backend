-- Fix Employee Role Constraint
-- This migration ensures employee role is allowed in database

DO $$
BEGIN
  -- Drop existing constraint if it exists
  ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
  
  -- Add new constraint with employee role included
  ALTER TABLE users 
  ADD CONSTRAINT users_role_check 
  CHECK (role IN (
    'admin', 
    'moderator', 
    'viewer', 
    'superadmin', 
    'company_products', 
    'seller_products', 
    'employee'  -- ✅ Employee role added
  ));
  
  RAISE NOTICE '✅ Employee role added to users table constraint';
END $$;

-- Verify constraint
DO $$
DECLARE
  role_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO role_count
  FROM information_schema.check_constraints
  WHERE constraint_name = 'users_role_check'
  AND check_clause LIKE '%employee%';
  
  IF role_count > 0 THEN
    RAISE NOTICE '✅ Verification: Role constraint includes employee';
  ELSE
    RAISE WARNING '⚠️  Verification: Role constraint does NOT include employee';
  END IF;
END $$;

