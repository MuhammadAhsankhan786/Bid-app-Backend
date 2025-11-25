# Admin Panel Login Error - Fix Steps

## 🔴 Error

**"Phone number not found or role mismatch. Please check your credentials."**

**Login Details:**
- Phone: `+9647500914000`
- Role: `superadmin`

## ✅ Quick Fix

### Step 1: Verify Database

**Run this script to check:**
```bash
node src/scripts/verify_admin_login.js
```

### Step 2: Fix Database (Choose One)

**Option A: Run Migration (Recommended)**
```bash
psql $DATABASE_URL -f migrations/008_seed_admin_users.sql
```

**Option B: Run SQL Directly**
```sql
-- Fix Super Admin
UPDATE users 
SET role = 'superadmin', 
    status = 'approved',
    updated_at = CURRENT_TIMESTAMP 
WHERE phone = '+9647500914000';

-- If user doesn't exist, create it
INSERT INTO users (name, email, phone, role, status, created_at, updated_at)
SELECT 
  'Super Admin',
  'superadmin@bidmaster.com',
  '+9647500914000',
  'superadmin',
  'approved',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
WHERE NOT EXISTS (
  SELECT 1 FROM users WHERE phone = '+9647500914000'
);
```

**Option C: Run Fix Script**
```bash
node src/scripts/fix_user_role_and_scope.js
```

### Step 3: Verify

**Check if user exists:**
```sql
SELECT id, name, phone, role, status 
FROM users 
WHERE phone = '+9647500914000' AND role = 'superadmin';
```

**Expected Result:**
```
 id |     name      |      phone       |    role     |  status  
----+---------------+------------------+-------------+-----------
  X | Super Admin   | +9647500914000   | superadmin  | approved
```

### Step 4: Test Login

**Via API:**
```bash
curl -X POST http://localhost:5000/api/auth/admin-login \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+9647500914000",
    "role": "superadmin"
  }'
```

**Via Admin Panel:**
- Refresh the page
- Select "Super Admin" role
- Enter phone: `+9647500914000`
- Click Login

## 📋 Common Issues

### Issue 1: User Doesn't Exist
**Solution:** Run migration or insert SQL

### Issue 2: Wrong Role
**Solution:** Update role to `superadmin`

### Issue 3: Phone Format Mismatch
**Solution:** Ensure phone is exactly `+9647500914000` (with + sign)

### Issue 4: Status Not Approved
**Solution:** Update status to `approved`

## 🔧 Complete Fix SQL

```sql
-- Ensure Super Admin exists with correct role
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

-- Verify
SELECT phone, role, status 
FROM users 
WHERE phone = '+9647500914000';
```

**After running this SQL, try login again!**

