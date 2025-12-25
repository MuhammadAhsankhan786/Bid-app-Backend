-- Check Employee Users in Database
-- Run this query to check if employee users exist

-- 1. Check all employee users
SELECT 
  id, 
  name, 
  email, 
  phone, 
  role, 
  status,
  created_at
FROM users 
WHERE role = 'employee'
ORDER BY created_at DESC;

-- 2. Check specific phone number (from screenshot: +9647700923000)
SELECT 
  id, 
  name, 
  email, 
  phone, 
  role, 
  status,
  created_at
FROM users 
WHERE phone = '+9647700923000' OR phone = '9647700923000' OR phone = '07700923000';

-- 3. Check if phone column has UNIQUE constraint
SELECT 
  constraint_name,
  constraint_type
FROM information_schema.table_constraints 
WHERE table_name = 'users' 
  AND constraint_type = 'UNIQUE';

-- 4. Count total employee users
SELECT COUNT(*) as total_employees
FROM users 
WHERE role = 'employee';

-- 5. Check employee users by status
SELECT 
  status,
  COUNT(*) as count
FROM users 
WHERE role = 'employee'
GROUP BY status;

