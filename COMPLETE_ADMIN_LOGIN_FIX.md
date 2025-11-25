# Complete Admin Panel Login Fix

## 🔴 Errors Found

1. **404 Error:** `:5000/api/auth/admin-login:1` - Endpoint not found
2. **Login Error:** "Phone number not found or role mismatch"

## ✅ Complete Fix Steps

### Step 1: Verify Backend Server is Running

**Check if server is running:**
```bash
# In backend directory
cd "Bid app Backend"
npm start
# or
node src/server.js
```

**Test server:**
```bash
curl http://localhost:5000/api/health
```

**Expected response:**
```json
{
  "status": "healthy",
  "database": "connected"
}
```

### Step 2: Fix Database - Ensure User Exists

**Run this SQL to create/update Super Admin:**

```sql
-- Fix Super Admin user
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
SELECT id, name, phone, role, status 
FROM users 
WHERE phone = '+9647500914000';
```

**Expected result:**
```
 id |     name      |      phone       |    role     |  status  
----+---------------+------------------+-------------+-----------
  X | Super Admin   | +9647500914000   | superadmin  | approved
```

### Step 3: Run Migration (Alternative)

**If you prefer migration:**
```bash
psql $DATABASE_URL -f migrations/008_seed_admin_users.sql
```

### Step 4: Verify Endpoint Works

**Test via API:**
```bash
curl -X POST http://localhost:5000/api/auth/admin-login \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+9647500914000",
    "role": "superadmin"
  }'
```

**Expected response:**
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

### Step 5: Check Frontend Configuration

**Verify frontend .env file:**
```env
VITE_BASE_URL=http://localhost:5000/api
```

**Or check if BASE_URL is correct in:**
- `Bid app admin Frontend/src/pages/LoginPage.jsx` (line 11)
- Should be: `http://localhost:5000/api`

### Step 6: Test in Admin Panel

1. **Refresh the page** (Ctrl+F5 or Cmd+Shift+R)
2. **Select "Super Admin"** role
3. **Enter phone:** `+9647500914000`
4. **Click Login**

## 🔧 Quick Fix Script

**Run this Node.js script to fix everything:**
```bash
node src/scripts/verify_admin_login.js
```

This will:
- Check if users exist
- Show what's wrong
- Guide you to fix it

## 📋 Common Issues & Solutions

### Issue 1: 404 Error
**Cause:** Backend server not running or wrong port
**Solution:** 
```bash
cd "Bid app Backend"
npm start
```

### Issue 2: Phone Not Found
**Cause:** User doesn't exist in database
**Solution:** Run SQL or migration above

### Issue 3: Role Mismatch
**Cause:** User exists but with wrong role
**Solution:** 
```sql
UPDATE users 
SET role = 'superadmin' 
WHERE phone = '+9647500914000';
```

### Issue 4: Wrong URL
**Cause:** Frontend using wrong BASE_URL
**Solution:** Check `.env` file or `LoginPage.jsx` line 11

## ✅ Verification Checklist

- [ ] Backend server running on port 5000
- [ ] Database has user with phone `+9647500914000`
- [ ] User has role `superadmin`
- [ ] User has status `approved`
- [ ] Frontend BASE_URL is `http://localhost:5000/api`
- [ ] API endpoint `/api/auth/admin-login` works via curl
- [ ] Admin panel can reach the endpoint

## 🚀 After Fix

1. ✅ Backend server running
2. ✅ Database has correct user
3. ✅ API endpoint works
4. ✅ Admin panel login successful

**Try login again after completing these steps!**

