# Super Admin Login Fix - +9647500914000

## 🔴 Problem

**Phone:** `+9647500914000`  
**Role:** `superadmin`  
**Error:** Login nahi ho raha (foundUsers: 0)

## ✅ Quick Fix (3 Options)

### Option 1: Run Check Script (Recommended)
```bash
cd "Bid app Backend"
node src/scripts/check_superadmin_now.js
```

Ye script automatically:
- Check karega user exist karta hai ya nahi
- Agar nahi hai to create karega
- Role aur status fix karega
- Login query test karega

### Option 2: Run SQL Directly
```bash
psql $DATABASE_URL -f QUICK_FIX_SUPERADMIN.sql
```

### Option 3: Copy-Paste SQL in Database Tool
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
)
ON CONFLICT (phone) DO UPDATE SET
  role = 'superadmin',
  status = 'approved',
  updated_at = CURRENT_TIMESTAMP;
```

## ✅ Verify (Copy-Paste)

```sql
-- Check user exists
SELECT id, name, phone, role, status 
FROM users 
WHERE phone = '+9647500914000' AND role = 'superadmin';
```

**Expected:** 1 row with `role='superadmin'` and `status='approved'`

## 🧪 Test Login

```bash
curl -X POST http://localhost:5000/api/auth/admin-login \
  -H "Content-Type: application/json" \
  -d '{"phone": "+9647500914000", "role": "superadmin"}'
```

**Expected:** `"success": true` with accessToken

## 🔍 Debug Steps

### Check What Exists
```sql
-- Check if user exists with any role
SELECT phone, role, status 
FROM users 
WHERE phone = '+9647500914000';
```

### Check Phone Format
```sql
-- Check all variations
SELECT phone, role 
FROM users 
WHERE phone LIKE '%9647500914000%' 
   OR phone LIKE '%7500914000%';
```

## ✅ After Fix

1. ✅ User exists: `+9647500914000`
2. ✅ Role: `superadmin`
3. ✅ Status: `approved`
4. ✅ Login query works
5. ✅ Admin panel login successful

**Pehle check script run karo, phir login try karo!**

