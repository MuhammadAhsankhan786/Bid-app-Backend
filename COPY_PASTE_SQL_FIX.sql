-- =====================================================
-- COPY-PASTE SQL FIX - PostgreSQL/Neon Database
-- =====================================================
-- Ye complete SQL file hai - directly run karo
-- =====================================================

-- Step 1: Ensure Super Admin exists
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

-- Step 2: Ensure Moderator exists
INSERT INTO users (name, email, phone, role, status, created_at, updated_at)
VALUES (
  'Moderator',
  'moderator@bidmaster.com',
  '+9647800914000',
  'moderator',
  'approved',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)
ON CONFLICT (phone) DO UPDATE SET
  name = 'Moderator',
  email = COALESCE(email, 'moderator@bidmaster.com'),
  role = 'moderator',
  status = 'approved',
  updated_at = CURRENT_TIMESTAMP;

-- Step 3: Ensure Flutter App User exists (Buyer/Seller)
INSERT INTO users (name, email, phone, role, status, created_at, updated_at)
VALUES (
  'Flutter User',
  'user@bidmaster.com',
  '+9647700914000',
  'buyer',
  'approved',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)
ON CONFLICT (phone) DO UPDATE SET
  name = 'Flutter User',
  email = COALESCE(email, 'user@bidmaster.com'),
  role = 'buyer',
  status = 'approved',
  updated_at = CURRENT_TIMESTAMP;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Verify All Users
SELECT 
  id,
  name,
  email,
  phone,
  role,
  status,
  created_at,
  updated_at
FROM users 
WHERE phone IN ('+9647500914000', '+9647800914000', '+9647700914000')
ORDER BY 
  CASE role
    WHEN 'superadmin' THEN 1
    WHEN 'moderator' THEN 2
    WHEN 'buyer' THEN 3
    WHEN 'seller' THEN 4
    ELSE 5
  END;

-- Test Login Queries (Same as Backend)
-- Super Admin Login Query
SELECT id, name, email, phone, role, status 
FROM users 
WHERE phone = '+9647500914000' AND role = 'superadmin';

-- Moderator Login Query
SELECT id, name, email, phone, role, status 
FROM users 
WHERE phone = '+9647800914000' AND role = 'moderator';

-- Flutter User Query
SELECT id, name, email, phone, role, status 
FROM users 
WHERE phone = '+9647700914000';

-- Check Viewer Users (Auto-created)
SELECT id, name, phone, role, status, created_at 
FROM users 
WHERE role = 'viewer'
ORDER BY created_at DESC;

