# Super Admin Login Fix - +9647500914000

## 🔴 Problem

**Phone:** `+9647500914000`  
**Role:** `superadmin`  
**Error:** Login nahi ho raha

## ✅ Quick Fix (Copy-Paste)

### Step 1: Check & Fix Database

```bash
cd "Bid app Backend"
node src/scripts/check_superadmin_now.js
```

Ye script:
- Check karega user exist karta hai ya nahi
- Agar nahi hai to create karega
- Role check karega (superadmin hona chahiye)
- Status check karega (approved hona chahiye)
- Login query test karega

### Step 2: Direct SQL Fix (Agar Script Fail Ho)

```sql
-- Create/Update Super Admin
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
  email = 'superadmin@bidmaster.com',
  role = 'superadmin',
  status = 'approved',
  updated_at = CURRENT_TIMESTAMP;
```

### Step 3: Verify

```sql
-- Check user exists with correct role
SELECT id, name, phone, role, status 
FROM users 
WHERE phone = '+9647500914000' AND role = 'superadmin';
```

**Expected:**
```
 id |     name      |      phone       |    role     |  status  
----+---------------+------------------+-------------+-----------
  X | Super Admin   | +9647500914000   | superadmin  | approved
```

### Step 4: Test Login

```bash
curl -X POST http://localhost:5000/api/auth/admin-login \
  -H "Content-Type: application/json" \
  -d '{"phone": "+9647500914000", "role": "superadmin"}'
```

**Expected:**
```json
{
  "success": true,
  "message": "Login successful",
  "accessToken": "...",
  "role": "superadmin"
}
```

## 🔍 Common Issues

### Issue 1: User Doesn't Exist
**Fix:** Run script or SQL above

### Issue 2: Wrong Role
**Fix:**
```sql
UPDATE users 
SET role = 'superadmin' 
WHERE phone = '+9647500914000';
```

### Issue 3: Status Not Approved
**Fix:**
```sql
UPDATE users 
SET status = 'approved' 
WHERE phone = '+9647500914000';
```

### Issue 4: Phone Format Mismatch
**Check:**
```sql
SELECT phone, role FROM users WHERE phone LIKE '%9647500914000%';
```

**Fix:** Ensure phone is exactly `+9647500914000` (with + sign)

## ✅ After Fix

1. ✅ User exists in database
2. ✅ Role is `superadmin`
3. ✅ Status is `approved`
4. ✅ Login query works
5. ✅ Admin panel login successful

**Pehle check script run karo, phir login try karo!**

