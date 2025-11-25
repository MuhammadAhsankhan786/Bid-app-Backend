# Ready-to-Use Commands - Copy Paste Karo

## 🚀 Step 1: Database Fix (PostgreSQL/Neon)

### Option A: Run Migration (Recommended)
```bash
cd "Bid app Backend"
psql $DATABASE_URL -f migrations/008_seed_admin_users.sql
```

### Option B: Direct SQL (If Migration Fails)
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
  name = 'Super Admin',
  email = 'superadmin@bidmaster.com',
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
  name = 'Moderator',
  email = 'moderator@bidmaster.com',
  role = 'moderator',
  status = 'approved',
  updated_at = CURRENT_TIMESTAMP;

-- Flutter App User (Buyer/Seller)
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
  email = 'user@bidmaster.com',
  role = 'buyer',
  status = 'approved',
  updated_at = CURRENT_TIMESTAMP;
```

### Option C: Quick Fix Script
```bash
cd "Bid app Backend"
node src/scripts/create_admin_users_now.js
```

---

## ✅ Step 2: Verify Database (Copy-Paste SQL)

```sql
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
```

**Expected Output:**
```
 id |     name      |          email           |      phone       |    role     |  status  |         created_at          |         updated_at          
----+---------------+--------------------------+------------------+-------------+-----------+----------------------------+----------------------------
  X | Super Admin   | superadmin@bidmaster.com | +9647500914000   | superadmin  | approved | 2025-XX-XX XX:XX:XX.XXX    | 2025-XX-XX XX:XX:XX.XXX
  X | Moderator     | moderator@bidmaster.com  | +9647800914000   | moderator   | approved | 2025-XX-XX XX:XX:XX.XXX    | 2025-XX-XX XX:XX:XX.XXX
  X | Flutter User  | user@bidmaster.com      | +9647700914000   | buyer       | approved | 2025-XX-XX XX:XX:XX.XXX    | 2025-XX-XX XX:XX:XX.XXX
```

---

## 🔍 Step 3: Backend Health Check

```bash
curl http://localhost:5000/api/health
```

**Expected:**
```json
{
  "status": "healthy",
  "database": "connected",
  "timestamp": "...",
  "uptime": ...
}
```

---

## 🧪 Step 4: Test Admin Panel Login (Super Admin)

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

---

## 🧪 Step 5: Test Moderator Login

```bash
curl -X POST http://localhost:5000/api/auth/admin-login \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+9647800914000",
    "role": "moderator"
  }'
```

---

## 🧪 Step 6: Test Flutter App OTP Login

### Step 6.1: Send OTP
```bash
curl -X POST http://localhost:5000/api/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"phone": "+9647700914000"}'
```

**Expected:**
```json
{
  "success": true,
  "message": "OTP sent successfully"
}
```

### Step 6.2: Verify OTP (Use OTP from SMS)
```bash
curl -X POST http://localhost:5000/api/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+9647700914000",
    "otp": "123456"
  }'
```

**Expected:**
```json
{
  "success": true,
  "accessToken": "...",
  "refreshToken": "...",
  "role": "buyer",
  "user": {
    "id": "...",
    "name": "Flutter User",
    "phone": "+9647700914000",
    "role": "buyer",
    "status": "approved"
  }
}
```

**Note:** Token mein `scope: "mobile"` hona chahiye (Flutter app ke liye)

---

## 🧪 Step 7: Test Viewer Login (Any Iraq Number)

```bash
curl -X POST http://localhost:5000/api/auth/admin-login \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+9647501234567",
    "role": "viewer"
  }'
```

**Expected:**
```json
{
  "success": true,
  "message": "Login successful",
  "accessToken": "...",
  "role": "viewer",
  "user": {
    "id": "...",
    "name": "Viewer +9647501234567",
    "phone": "+9647501234567",
    "role": "viewer",
    "status": "approved"
  }
}
```

**Note:** User automatically database mein create ho jayega.

---

## ✅ Step 8: Complete Verification Queries

### 8.1: Check All Admin Users
```sql
SELECT phone, role, status, name 
FROM users 
WHERE role IN ('superadmin', 'moderator', 'viewer')
ORDER BY role, phone;
```

### 8.2: Check Flutter App Users
```sql
SELECT phone, role, status, name 
FROM users 
WHERE role IN ('buyer', 'seller')
ORDER BY role, phone;
```

### 8.3: Check Login Query (Same as Backend)
```sql
-- Test Super Admin Login Query
SELECT id, name, email, phone, role, status 
FROM users 
WHERE phone = '+9647500914000' AND role = 'superadmin';

-- Test Moderator Login Query
SELECT id, name, email, phone, role, status 
FROM users 
WHERE phone = '+9647800914000' AND role = 'moderator';

-- Test Flutter User Query
SELECT id, name, email, phone, role, status 
FROM users 
WHERE phone = '+9647700914000';
```

### 8.4: Check Viewer Users (Auto-created)
```sql
SELECT id, name, phone, role, status, created_at 
FROM users 
WHERE role = 'viewer'
ORDER BY created_at DESC;
```

---

## 🔧 Step 9: Quick Fix Script (All-in-One)

```bash
cd "Bid app Backend"

# Create all users
node src/scripts/create_admin_users_now.js

# Verify login mapping
node src/scripts/checkLoginMapping.js

# Verify admin login
node src/scripts/verify_admin_login.js
```

---

## 📋 Complete Test Sequence (Copy All)

```bash
# 1. Database Fix
cd "Bid app Backend"
node src/scripts/create_admin_users_now.js

# 2. Backend Health
curl http://localhost:5000/api/health

# 3. Test Super Admin Login
curl -X POST http://localhost:5000/api/auth/admin-login \
  -H "Content-Type: application/json" \
  -d '{"phone": "+9647500914000", "role": "superadmin"}'

# 4. Test Moderator Login
curl -X POST http://localhost:5000/api/auth/admin-login \
  -H "Content-Type: application/json" \
  -d '{"phone": "+9647800914000", "role": "moderator"}'

# 5. Test Flutter OTP Send
curl -X POST http://localhost:5000/api/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"phone": "+9647700914000"}'

# 6. Test Viewer Login (Auto-create)
curl -X POST http://localhost:5000/api/auth/admin-login \
  -H "Content-Type: application/json" \
  -d '{"phone": "+9647501234567", "role": "viewer"}'
```

---

## 🎯 Verification Checklist

After running all commands, verify:

- [ ] Super Admin exists: `+9647500914000` with role `superadmin`
- [ ] Moderator exists: `+9647800914000` with role `moderator`
- [ ] Flutter User exists: `+9647700914000` with role `buyer`
- [ ] All users have status `approved`
- [ ] Admin login API works (no OTP)
- [ ] Flutter OTP login works (OTP required)
- [ ] Viewer login auto-creates user
- [ ] Tokens have correct scope (`admin` for admin panel, `mobile` for Flutter)

---

## 🚨 If Something Fails

### Database Connection Issue
```bash
# Check DATABASE_URL
echo $DATABASE_URL

# Test connection
psql $DATABASE_URL -c "SELECT NOW();"
```

### Backend Not Running
```bash
cd "Bid app Backend"
npm start
```

### Frontend Can't Connect
```bash
# Check if backend is accessible
curl http://localhost:5000/api/health

# Check frontend .env
# Should have: VITE_BASE_URL=http://localhost:5000/api
```

---

## ✅ Final Verification SQL

```sql
-- Complete Status Check
SELECT 
  phone,
  role,
  status,
  name,
  CASE 
    WHEN role IN ('superadmin', 'moderator', 'viewer') THEN 'Admin Panel'
    WHEN role IN ('buyer', 'seller') THEN 'Flutter App'
    ELSE 'Other'
  END as login_method
FROM users 
WHERE phone IN ('+9647500914000', '+9647800914000', '+9647700914000')
   OR role = 'viewer'
ORDER BY 
  CASE role
    WHEN 'superadmin' THEN 1
    WHEN 'moderator' THEN 2
    WHEN 'viewer' THEN 3
    WHEN 'buyer' THEN 4
    WHEN 'seller' THEN 5
    ELSE 6
  END,
  phone;
```

**Sab kuch ready hai - copy-paste karke test karo!** ✅

