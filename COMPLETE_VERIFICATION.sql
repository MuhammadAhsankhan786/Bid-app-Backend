-- =====================================================
-- COMPLETE VERIFICATION QUERIES
-- Copy-paste karke run karo
-- =====================================================

-- 1. Check All Required Users
SELECT 
  phone,
  role,
  status,
  name,
  CASE 
    WHEN role IN ('superadmin', 'moderator', 'viewer') THEN 'Admin Panel (No OTP)'
    WHEN role IN ('buyer', 'seller') THEN 'Flutter App (OTP Required)'
    ELSE 'Other'
  END as login_method
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

-- 2. Test Super Admin Login Query (Exact Backend Query)
SELECT id, name, email, phone, role, status 
FROM users 
WHERE phone = '+9647500914000' AND role = 'superadmin';

-- 3. Test Moderator Login Query (Exact Backend Query)
SELECT id, name, email, phone, role, status 
FROM users 
WHERE phone = '+9647800914000' AND role = 'moderator';

-- 4. Test Flutter User Query
SELECT id, name, email, phone, role, status 
FROM users 
WHERE phone = '+9647700914000';

-- 5. Check Viewer Users (Auto-created on first login)
SELECT id, name, phone, role, status, created_at 
FROM users 
WHERE role = 'viewer'
ORDER BY created_at DESC
LIMIT 10;

-- 6. Check All Users Summary
SELECT 
  role,
  COUNT(*) as user_count,
  STRING_AGG(phone, ', ') as phone_numbers
FROM users 
WHERE role IN ('superadmin', 'moderator', 'buyer', 'seller', 'viewer')
GROUP BY role
ORDER BY 
  CASE role
    WHEN 'superadmin' THEN 1
    WHEN 'moderator' THEN 2
    WHEN 'buyer' THEN 3
    WHEN 'seller' THEN 4
    WHEN 'viewer' THEN 5
    ELSE 6
  END;

-- 7. Verify Phone Number Format
SELECT 
  phone,
  role,
  CASE 
    WHEN phone LIKE '+964%' THEN '✅ Valid Format'
    ELSE '❌ Invalid Format'
  END as format_check
FROM users 
WHERE phone IN ('+9647500914000', '+9647800914000', '+9647700914000');

-- 8. Verify Status
SELECT 
  phone,
  role,
  status,
  CASE 
    WHEN status = 'approved' THEN '✅ Approved'
    ELSE '⚠️ Not Approved'
  END as status_check
FROM users 
WHERE phone IN ('+9647500914000', '+9647800914000', '+9647700914000');

