# Final Phone Numbers Configuration - Database

## ✅ Updated Phone Numbers

### 1. Super Admin
- **Phone:** `+9647500914000`
- **Role:** `superadmin`
- **Login Method:** Admin Panel (No OTP)
- **Status:** `approved`

### 2. Moderator
- **Phone:** `+9647800914000` (Updated from +9648000914000)
- **Role:** `moderator`
- **Login Method:** Admin Panel (No OTP)
- **Status:** `approved`

### 3. Buyer/Seller (Flutter App)
- **Phone:** `+9647700914000`
- **Role:** `buyer` (can be changed to `seller`)
- **Login Method:** Flutter App (OTP Required via Twilio Verify)
- **Status:** `approved`

### 4. Viewer Role
- **Phone:** **Any Iraq phone number** (`+964XXXXXXXXXX`)
- **Role:** `viewer`
- **Login Method:** Admin Panel (No OTP)
- **Status:** `approved` (auto-created)
- **Note:** Auto-creates user in database on first login

## 🔄 Changes Made

### 1. Migration File Updated
**File:** `migrations/008_seed_admin_users.sql`

**Changes:**
- ✅ Super Admin: `+9647500914000` (unchanged)
- ✅ Moderator: `+9647800914000` (changed from `+9648000914000`)
- ✅ Flutter User: `+9647700914000` (role changed to `buyer`)

### 2. Backend Code Updated
**File:** `src/controllers/authController.js`

**Added:**
- ✅ Viewer role auto-creation logic
- ✅ Any Iraq phone number can login as viewer
- ✅ Auto-creates user in database if doesn't exist
- ✅ Updates existing user to viewer role if needed

### 3. Script Updated
**File:** `src/scripts/checkLoginMapping.js`

**Updated:**
- ✅ New phone numbers verification
- ✅ Viewer role information added

## 🚀 How to Apply

### Step 1: Run Migration
```bash
psql $DATABASE_URL -f migrations/008_seed_admin_users.sql
```

### Step 2: Verify Database
```bash
node src/scripts/checkLoginMapping.js
```

### Step 3: Test Logins

**Super Admin:**
```bash
curl -X POST http://localhost:5000/api/auth/admin-login \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+9647500914000",
    "role": "superadmin"
  }'
```

**Moderator:**
```bash
curl -X POST http://localhost:5000/api/auth/admin-login \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+9647800914000",
    "role": "moderator"
  }'
```

**Flutter App (Buyer/Seller):**
```bash
# Step 1: Send OTP
curl -X POST http://localhost:5000/api/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"phone": "+9647700914000"}'

# Step 2: Verify OTP (use OTP from SMS)
curl -X POST http://localhost:5000/api/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+9647700914000",
    "otp": "123456"
  }'
```

**Viewer (Any Iraq Number):**
```bash
# Any Iraq phone number can login as viewer
# User will be auto-created in database on first login
curl -X POST http://localhost:5000/api/auth/admin-login \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+9647501234567",
    "role": "viewer"
  }'
```

## 📋 Database Verification

### Check All Users
```sql
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

### Check Viewer Users
```sql
SELECT 
  id,
  name,
  email,
  phone,
  role,
  status,
  created_at
FROM users 
WHERE role = 'viewer'
ORDER BY created_at DESC;
```

## ✅ Summary

| Phone Number | Role | Login Method | Status |
|-------------|------|--------------|--------|
| +9647500914000 | superadmin | Admin Panel (No OTP) | approved |
| +9647800914000 | moderator | Admin Panel (No OTP) | approved |
| +9647700914000 | buyer | Flutter App (OTP) | approved |
| Any +964 number | viewer | Admin Panel (No OTP) | auto-created |

## 🎯 Key Features

1. **Super Admin & Moderator:** Fixed phone numbers, Admin Panel login
2. **Flutter User:** Fixed phone number, OTP login via Twilio Verify
3. **Viewer Role:** Any Iraq phone number can login, auto-created in database

All phone numbers are now configured in the database and backend!

