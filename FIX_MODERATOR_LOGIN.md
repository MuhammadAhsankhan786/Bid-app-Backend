# Fix Moderator Login Issue

## Problem
1. **Port Mismatch**: Backend runs on port 10000, but frontend calls port 5000
2. **Phone Number Mismatch**: Database has `+9647800914000` but user wants `+964780091400`

## Solutions

### Option 1: Update Database Phone Number (Recommended)
Run this SQL to update the moderator phone number:

```sql
-- Update moderator phone from +9647800914000 to +964780091400
UPDATE users 
SET phone = '+964780091400',
    updated_at = CURRENT_TIMESTAMP
WHERE phone = '+9647800914000' AND role = 'moderator';

-- Or create new moderator if doesn't exist
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

-- Verify
SELECT id, name, email, phone, role, status
FROM users 
WHERE phone = '+964780091400' AND role = 'moderator';
```

### Option 2: Update Backend Port to 5000
Create `.env` file in `Bid app Backend` folder:
```
PORT=5000
```

### Option 3: Update Frontend to Use Port 10000
Create `.env` file in `Bid app admin Frontend` folder:
```
VITE_BASE_URL=http://localhost:10000/api
```

## Quick Fix Commands

### For Database (PostgreSQL):
```bash
# Connect to your database and run:
psql -U your_username -d your_database -f src/scripts/fix_moderator_phone.sql
```

### For Backend Port:
```bash
# In Bid app Backend folder, create .env:
echo PORT=5000 > .env
```

### For Frontend:
```bash
# In Bid app admin Frontend folder, create .env:
echo VITE_BASE_URL=http://localhost:5000/api > .env
```

