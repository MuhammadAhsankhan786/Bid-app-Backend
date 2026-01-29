-- Fix Moderator Phone Number
-- Remove old number (+9647800914000) and add new number (+964780091400)

-- Step 1: Delete old moderator with old phone number
DELETE FROM users 
WHERE phone = '+9647800914000' AND role = 'moderator';

-- Step 2: Add new moderator with new phone number
INSERT INTO users (name, email, phone, role, status, created_at, updated_at)
VALUES (
  'Moderator',
  'moderator@bidmaster.com',
  '+964780091400',
  'moderator',
  'approved',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)
ON CONFLICT (phone) DO UPDATE SET
  name = EXCLUDED.name,
  email = EXCLUDED.email,
  role = 'moderator',
  status = 'approved',
  updated_at = CURRENT_TIMESTAMP;

-- Step 3: Verify - Check old number is removed
SELECT 'Old moderator (should be empty):' as check_type;
SELECT id, name, email, phone, role, status
FROM users 
WHERE phone = '+9647800914000' AND role = 'moderator';

-- Step 4: Verify - Check new number is added
SELECT 'New moderator (should exist):' as check_type;
SELECT id, name, email, phone, role, status, created_at, updated_at
FROM users 
WHERE phone = '+964780091400' AND role = 'moderator';

