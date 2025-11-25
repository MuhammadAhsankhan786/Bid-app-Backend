-- =====================================================
-- QUICK FIX: Super Admin Login - +9647500914000
-- Copy-paste karke directly run karo
-- =====================================================

-- Step 1: Create/Update Super Admin User
INSERT INTO users (name, email, phone, role, status, created_at, updated_at)
VALUES (
  'Super Admin',
  'superadmin@bidmaster.com',
  '+9647500914000',
  'superadmin',
  'approved',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)
ON CONFLICT (phone) DO UPDATE SET
  name = 'Super Admin',
  email = COALESCE(email, 'superadmin@bidmaster.com'),
  role = 'superadmin',
  status = 'approved',
  updated_at = CURRENT_TIMESTAMP;

-- Step 2: Verify User Created
SELECT id, name, phone, role, status 
FROM users 
WHERE phone = '+9647500914000';

-- Step 3: Test Login Query (Same as Backend)
SELECT id, name, email, phone, role, status 
FROM users 
WHERE phone = '+9647500914000' AND role = 'superadmin';

-- Expected Result: 1 row with role='superadmin' and status='approved'

