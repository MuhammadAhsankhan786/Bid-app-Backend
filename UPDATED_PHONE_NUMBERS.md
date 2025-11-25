# Updated Phone Numbers - Database Configuration

## 📱 Phone Numbers & Roles

### 1. Super Admin
- **Phone:** `+9647500914000`
- **Role:** `superadmin`
- **Login Method:** Admin Panel (No OTP)
- **Endpoint:** `POST /api/auth/admin-login`

### 2. Moderator
- **Phone:** `+9647800914000`
- **Role:** `moderator`
- **Login Method:** Admin Panel (No OTP)
- **Endpoint:** `POST /api/auth/admin-login`

### 3. Buyer/Seller (Flutter App)
- **Phone:** `+9647700914000`
- **Role:** `buyer` (can be changed to `seller`)
- **Login Method:** Flutter App (OTP Required)
- **Endpoints:** 
  - `POST /api/auth/send-otp`
  - `POST /api/auth/verify-otp`

### 4. Viewer Role
- **Phone:** Any Iraq phone number (`+964XXXXXXXXXX`)
- **Role:** `viewer`
- **Login Method:** Admin Panel (No OTP)
- **Endpoint:** `POST /api/auth/admin-login`
- **Note:** Auto-created in database on first login

## 🔄 Changes Made

### Migration File Updated
**File:** `migrations/008_seed_admin_users.sql`

**Updated:**
- ✅ Super Admin: `+9647500914000` (unchanged)
- ✅ Moderator: `+9647800914000` (changed from `+9648000914000`)
- ✅ Flutter User: `+9647700914000` (role changed to `buyer`)

### Backend Code Updated
**File:** `src/controllers/authController.js`

**Added:**
- ✅ Viewer role auto-creation on login
- ✅ Any Iraq phone number can login as viewer
- ✅ Auto-creates user in database if doesn't exist

### Script Updated
**File:** `src/scripts/checkLoginMapping.js`

**Updated:**
- ✅ New phone numbers verification
- ✅ Viewer role information added

## 🚀 How to Apply

### Step 1: Run Migration
```bash
psql $DATABASE_URL -f migrations/008_seed_admin_users.sql
```

### Step 2: Verify
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
# Send OTP
curl -X POST http://localhost:5000/api/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"phone": "+9647700914000"}'

# Verify OTP
curl -X POST http://localhost:5000/api/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+9647700914000",
    "otp": "123456"
  }'
```

**Viewer (Any Iraq Number):**
```bash
curl -X POST http://localhost:5000/api/auth/admin-login \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+9647501234567",
    "role": "viewer"
  }'
```

## 📋 Database Verification

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

**Expected Output:**
```
 id |     name      |          email           |      phone       |    role     |  status  |         created_at          |         updated_at          
----+---------------+--------------------------+------------------+-------------+-----------+----------------------------+----------------------------
  1 | Super Admin   | superadmin@bidmaster.com | +9647500914000   | superadmin  | approved | 2025-01-XX XX:XX:XX.XXX    | 2025-01-XX XX:XX:XX.XXX
  2 | Moderator     | moderator@bidmaster.com  | +9647800914000   | moderator   | approved | 2025-01-XX XX:XX:XX.XXX    | 2025-01-XX XX:XX:XX.XXX
  3 | Flutter User  | user@bidmaster.com      | +9647700914000   | buyer       | approved | 2025-01-XX XX:XX:XX.XXX    | 2025-01-XX XX:XX:XX.XXX
```

## ✅ Summary

- ✅ Super Admin: `+9647500914000` (Admin Panel)
- ✅ Moderator: `+9647800914000` (Admin Panel)
- ✅ Flutter User: `+9647700914000` (Flutter App - OTP)
- ✅ Viewer: Any Iraq number (Admin Panel - Auto-created)

All phone numbers are now configured in the database!

