# Fix Admin Panel Login Error

## 🔴 Error Message

**"Phone number not found or role mismatch. Please check your credentials."**

**Login Attempt:**
- Phone: `+9647500914000`
- Role: `superadmin`

## 🔍 Root Cause

The error occurs when:
1. User doesn't exist in database with that phone number
2. User exists but role doesn't match
3. Phone number format mismatch

## ✅ Solution

### Step 1: Verify Database

**Run verification script:**
```bash
node src/scripts/verify_admin_login.js
```

This will show:
- If users exist in database
- If roles match
- If login query will work

### Step 2: Fix Database

**If users are missing or roles are wrong, run migration:**

```bash
psql $DATABASE_URL -f migrations/008_seed_admin_users.sql
```

**Or run SQL directly:**

```sql
-- Super Admin
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
  role = 'superadmin',
  status = 'approved',
  updated_at = CURRENT_TIMESTAMP;

-- Moderator
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
  role = 'moderator',
  status = 'approved',
  updated_at = CURRENT_TIMESTAMP;
```

### Step 3: Verify Login Query

**Test the exact query used by admin-login endpoint:**

```sql
SELECT id, name, email, phone, role, status 
FROM users 
WHERE phone = '+9647500914000' AND role = 'superadmin';
```

**Expected Result:**
```
 id |     name      |          email           |      phone       |    role     |  status  
----+---------------+--------------------------+------------------+-------------+-----------
  X | Super Admin   | superadmin@bidmaster.com | +9647500914000   | superadmin  | approved
```

## 📋 Required Admin Users

| Phone Number | Role | Name | Status |
|-------------|------|------|--------|
| +9647500914000 | superadmin | Super Admin | approved |
| +9647800914000 | moderator | Moderator | approved |

## 🧪 Testing

### Test Super Admin Login

```bash
curl -X POST http://localhost:5000/api/auth/admin-login \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+9647500914000",
    "role": "superadmin"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "accessToken": "...",
  "refreshToken": "...",
  "role": "superadmin",
  "user": {
    "id": "...",
    "name": "Super Admin",
    "phone": "+9647500914000",
    "role": "superadmin",
    "status": "approved"
  }
}
```

### Test Moderator Login

```bash
curl -X POST http://localhost:5000/api/auth/admin-login \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+9647800914000",
    "role": "moderator"
  }'
```

## ✅ Checklist

- [ ] Run verification script
- [ ] Check if users exist in database
- [ ] Verify roles match (superadmin, moderator)
- [ ] Verify status is 'approved'
- [ ] Run migration if needed
- [ ] Test login via API
- [ ] Test login in admin panel

## 🔧 Quick Fix

**If user exists but role is wrong:**

```sql
UPDATE users 
SET role = 'superadmin', 
    updated_at = CURRENT_TIMESTAMP 
WHERE phone = '+9647500914000';
```

**If user doesn't exist:**

```sql
INSERT INTO users (name, email, phone, role, status, created_at, updated_at)
VALUES (
  'Super Admin',
  'superadmin@bidmaster.com',
  '+9647500914000',
  'superadmin',
  'approved',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
);
```

**After fix, try login again in admin panel!**

