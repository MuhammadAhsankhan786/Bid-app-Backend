# Step-by-Step Guide - Copy Paste Commands

## 🎯 Complete End-to-End Fix

### 📋 Prerequisites
- PostgreSQL (Neon) database connected
- Backend server running on port 5000
- Node.js installed

---

## 🚀 STEP 1: Database Fix

### Option A: Run Quick Fix Script (Easiest)
```bash
cd "Bid app Backend"
node src/scripts/create_admin_users_now.js
```

### Option B: Run SQL Directly
```bash
psql $DATABASE_URL -f COPY_PASTE_SQL_FIX.sql
```

### Option C: Copy-Paste SQL in Database Tool
Open `COPY_PASTE_SQL_FIX.sql` and run all SQL commands.

---

## ✅ STEP 2: Verify Database

### Run Verification SQL
```bash
psql $DATABASE_URL -f COMPLETE_VERIFICATION.sql
```

**Or copy-paste this SQL:**
```sql
SELECT phone, role, status, name 
FROM users 
WHERE phone IN ('+9647500914000', '+9647800914000', '+9647700914000')
ORDER BY role;
```

**Expected:** 3 users with correct roles and `approved` status.

---

## 🏥 STEP 3: Backend Health Check

```bash
curl http://localhost:5000/api/health
```

**Expected:**
```json
{"status":"healthy","database":"connected"}
```

**If fails:** Start backend server:
```bash
cd "Bid app Backend"
npm start
```

---

## 🔐 STEP 4: Test Super Admin Login (Admin Panel)

```bash
curl -X POST http://localhost:5000/api/auth/admin-login \
  -H "Content-Type: application/json" \
  -d '{"phone": "+9647500914000", "role": "superadmin"}'
```

**Expected:** `"success": true` with `accessToken` and `role: "superadmin"`

---

## 👥 STEP 5: Test Moderator Login (Admin Panel)

```bash
curl -X POST http://localhost:5000/api/auth/admin-login \
  -H "Content-Type: application/json" \
  -d '{"phone": "+9647800914000", "role": "moderator"}'
```

**Expected:** `"success": true` with `accessToken` and `role: "moderator"`

---

## 📱 STEP 6: Test Flutter App OTP Login

### 6.1: Send OTP
```bash
curl -X POST http://localhost:5000/api/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"phone": "+9647700914000"}'
```

**Expected:** `"success": true, "message": "OTP sent successfully"`

**Note:** Check SMS for OTP code.

### 6.2: Verify OTP (Replace 123456 with actual OTP)
```bash
curl -X POST http://localhost:5000/api/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"phone": "+9647700914000", "otp": "123456"}'
```

**Expected:** 
- `"success": true`
- `"role": "buyer"`
- Token with `scope: "mobile"` (check token payload)

---

## 👁️ STEP 7: Test Viewer Login (Auto-Create)

```bash
curl -X POST http://localhost:5000/api/auth/admin-login \
  -H "Content-Type: application/json" \
  -d '{"phone": "+9647501234567", "role": "viewer"}'
```

**Expected:**
- `"success": true`
- `"role": "viewer"`
- User automatically created in database

**Verify in database:**
```sql
SELECT phone, role, status, created_at 
FROM users 
WHERE phone = '+9647501234567';
```

---

## 🔍 STEP 8: Complete Verification

### 8.1: Run All Verification Queries
```bash
psql $DATABASE_URL -f COMPLETE_VERIFICATION.sql
```

### 8.2: Check Login Mapping
```bash
cd "Bid app Backend"
node src/scripts/checkLoginMapping.js
```

### 8.3: Verify Admin Login
```bash
node src/scripts/verify_admin_login.js
```

---

## 🎯 All-in-One Test Script

### Windows:
```bash
COPY_PASTE_TEST_COMMANDS.bat
```

### Linux/Mac:
```bash
chmod +x COPY_PASTE_TEST_COMMANDS.sh
./COPY_PASTE_TEST_COMMANDS.sh
```

---

## 📊 Expected Results Summary

| Test | Phone | Role | Method | Expected |
|------|-------|------|--------|----------|
| Super Admin | +9647500914000 | superadmin | Admin Panel | ✅ Success |
| Moderator | +9647800914000 | moderator | Admin Panel | ✅ Success |
| Flutter User | +9647700914000 | buyer | OTP | ✅ Success |
| Viewer | Any +964 | viewer | Admin Panel | ✅ Auto-create |

---

## ✅ Final Checklist

After running all commands, verify:

- [x] Database has 3 users (Super Admin, Moderator, Flutter User)
- [x] All users have status `approved`
- [x] Super Admin login works (no OTP)
- [x] Moderator login works (no OTP)
- [x] Flutter OTP send works
- [x] Flutter OTP verify works (with correct OTP)
- [x] Viewer login auto-creates user
- [x] All tokens have correct scope

---

## 🚨 Troubleshooting

### Database Connection Failed
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

### 404 Error
- Check backend is running
- Check URL: `http://localhost:5000/api/auth/admin-login`
- Check CORS settings

### 403 Error (Flutter App)
- User role should be `buyer` (not `admin` or `superadmin`)
- Token scope should be `mobile`
- Run: `node src/scripts/fix_user_role_and_scope.js`

---

## 📝 Quick Reference

**Database Fix:**
```bash
node src/scripts/create_admin_users_now.js
```

**Verify Database:**
```sql
SELECT phone, role, status FROM users WHERE phone IN ('+9647500914000', '+9647800914000', '+9647700914000');
```

**Test Admin Login:**
```bash
curl -X POST http://localhost:5000/api/auth/admin-login -H "Content-Type: application/json" -d '{"phone": "+9647500914000", "role": "superadmin"}'
```

**Test Flutter OTP:**
```bash
curl -X POST http://localhost:5000/api/auth/send-otp -H "Content-Type: application/json" -d '{"phone": "+9647700914000"}'
```

**Sab kuch ready hai - copy-paste karke test karo!** ✅

