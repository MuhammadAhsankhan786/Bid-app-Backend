-- Migration 008: Seed Admin Users for PostgreSQL (Neon)
-- This migration creates/updates the required phone numbers with proper roles

-- Seed data for admin users
DO $$
DECLARE
  user_count INTEGER;
BEGIN
  -- 1. Super Admin: +9647500914000 (Admin Panel - No OTP)
  SELECT COUNT(*) INTO user_count FROM users WHERE phone = '+9647500914000';
  
  IF user_count = 0 THEN
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
      name = EXCLUDED.name,
      email = EXCLUDED.email,
      role = EXCLUDED.role,
      status = EXCLUDED.status,
      updated_at = CURRENT_TIMESTAMP;
    
    RAISE NOTICE '✅ Super Admin user created/updated: +9647500914000';
  ELSE
    UPDATE users 
    SET 
      name = 'Super Admin',
      email = COALESCE(email, 'superadmin@bidmaster.com'),
      role = 'superadmin',
      status = 'approved',
      updated_at = CURRENT_TIMESTAMP
    WHERE phone = '+9647500914000';
    
    RAISE NOTICE '✅ Super Admin user updated: +9647500914000';
  END IF;

  -- 2. Moderator: +9647800914000 (Admin Panel - No OTP)
  SELECT COUNT(*) INTO user_count FROM users WHERE phone = '+9647800914000';
  
  IF user_count = 0 THEN
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
      name = EXCLUDED.name,
      email = EXCLUDED.email,
      role = EXCLUDED.role,
      status = EXCLUDED.status,
      updated_at = CURRENT_TIMESTAMP;
    
    RAISE NOTICE '✅ Moderator user created/updated: +9647800914000';
  ELSE
    UPDATE users 
    SET 
      name = 'Moderator',
      email = COALESCE(email, 'moderator@bidmaster.com'),
      role = 'moderator',
      status = 'approved',
      updated_at = CURRENT_TIMESTAMP
    WHERE phone = '+9647800914000';
    
    RAISE NOTICE '✅ Moderator user updated: +9647800914000';
  END IF;

  -- 3. Buyer/Seller (Flutter App): +9647700914000 (Flutter App - OTP Required)
  SELECT COUNT(*) INTO user_count FROM users WHERE phone = '+9647700914000';
  
  IF user_count = 0 THEN
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
      name = EXCLUDED.name,
      email = EXCLUDED.email,
      role = EXCLUDED.role,
      status = EXCLUDED.status,
      updated_at = CURRENT_TIMESTAMP;
    
    RAISE NOTICE '✅ Flutter App user created/updated: +9647700914000';
  ELSE
    UPDATE users 
    SET 
      name = 'Flutter User',
      email = COALESCE(email, 'user@bidmaster.com'),
      role = 'buyer',
      status = 'approved',
      updated_at = CURRENT_TIMESTAMP
    WHERE phone = '+9647700914000';
    
    RAISE NOTICE '✅ Flutter App user updated: +9647700914000';
  END IF;

  RAISE NOTICE '✅ Migration 008 completed: All users seeded successfully';
END $$;

-- Verification query
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

