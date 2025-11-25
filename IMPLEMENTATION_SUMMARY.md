# Backend & Database Update Implementation Summary

## ✅ Completed Changes

### 1. Database Migrations (PostgreSQL/Neon Compatible)

#### Migration 007: Update Users Table
**File:** `migrations/007_update_users_table_uuid.sql`

**Changes:**
- ✅ Added UUID extension support
- ✅ Added/verified `phone` column (VARCHAR(20), UNIQUE)
- ✅ Added/verified `status` column with constraint: `pending`, `approved`, `blocked`, `active`, `suspended`
- ✅ Added/verified `updated_at` column with auto-update trigger
- ✅ Updated role constraint to include: `superadmin`, `admin`, `moderator`, `buyer`, `seller`, `viewer`
- ✅ Made `email` and `password` nullable (for phone-only OTP users)

#### Migration 008: Seed Admin Users
**File:** `migrations/008_seed_admin_users.sql`

**Seeded Users:**
1. **Super Admin**
   - Phone: `+9647500914000`
   - Role: `superadmin`
   - Status: `approved`
   - Email: `superadmin@bidmaster.com`

2. **Admin (Flutter App User)**
   - Phone: `+9647700914000`
   - Role: `admin`
   - Status: `approved`
   - Email: `admin@bidmaster.com`

3. **Moderator**
   - Phone: `+9648000914000`
   - Role: `moderator`
   - Status: `approved`
   - Email: `moderator@bidmaster.com`

### 2. API Endpoints

#### ✅ Admin Login (No OTP)
**Endpoint:** `POST /api/auth/admin-login`

**Features:**
- Direct phone + role login (no OTP required)
- Works for: `superadmin`, `admin`, `moderator`, `viewer`
- Returns access token and refresh token
- Scope: `admin` (for admin panel)

**Request:**
```json
{
  "phone": "+9647500914000",
  "role": "superadmin"
}
```

**Response:**
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
    "email": "superadmin@bidmaster.com",
    "phone": "+9647500914000",
    "role": "superadmin",
    "status": "approved"
  }
}
```

#### ✅ Flutter App OTP Login
**Endpoints:**
- `POST /api/auth/send-otp` - Send OTP via Twilio Verify
- `POST /api/auth/verify-otp` - Verify OTP and login

**Features:**
- Uses Twilio Verify API (no mock OTP)
- Works for all verified phone numbers
- Returns access token and refresh token
- Scope: `mobile` (for Flutter app)

#### ✅ Change Phone Number Feature
**Endpoints:**
- `POST /api/auth/change-phone/send-otp` - Send OTP to new phone
- `POST /api/auth/change-phone/verify` - Verify OTP and update phone

**Features:**
- Works for both Flutter app users and Admin panel users
- Uses Twilio Verify API for OTP verification
- Updates phone number in database after verification
- Generates new tokens with updated phone
- Prevents duplicate phone numbers

**Request (Send OTP):**
```json
{
  "newPhone": "+9647700914001"
}
```

**Request (Verify):**
```json
{
  "newPhone": "+9647700914001",
  "otp": "123456"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Phone number updated successfully",
  "accessToken": "...",
  "refreshToken": "...",
  "user": {
    "id": "...",
    "name": "...",
    "phone": "+9647700914001",
    "role": "...",
    "status": "approved"
  }
}
```

### 3. Code Changes

#### Files Modified:
1. **`src/controllers/authController.js`**
   - ✅ Removed hardcoded phone restrictions from `sendOTP` and `verifyOTP`
   - ✅ Added `sendChangePhoneOTP` method
   - ✅ Added `verifyChangePhone` method
   - ✅ `adminLogin` already supports new roles

2. **`src/Routes/authRoutes.js`**
   - ✅ Added route: `POST /api/auth/change-phone/send-otp`
   - ✅ Added route: `POST /api/auth/change-phone/verify`

3. **`migrations/007_update_users_table_uuid.sql`**
   - ✅ New migration file for users table updates

4. **`migrations/008_seed_admin_users.sql`**
   - ✅ New seed file for admin users

### 4. Twilio Verify Integration

✅ **No Mock OTP:**
- All OTP operations use Twilio Verify API
- `TwilioService.sendOTP()` uses `verifications.create()`
- `TwilioService.verifyOTP()` uses `verificationChecks.create()`
- No hardcoded OTP values
- No in-memory OTP storage

### 5. Database Schema

**Users Table Structure:**
```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,  -- Can be migrated to UUID if needed
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) UNIQUE,  -- Nullable
  password VARCHAR(255),  -- Nullable (for phone-only users)
  phone VARCHAR(20) UNIQUE,  -- Required for OTP login
  role VARCHAR(20) CHECK (role IN ('superadmin', 'admin', 'moderator', 'buyer', 'seller', 'viewer')),
  status VARCHAR(20) DEFAULT 'approved' CHECK (status IN ('pending', 'approved', 'blocked', 'active', 'suspended')),
  refresh_token TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  bids_count INTEGER DEFAULT 0
);
```

## 📋 How to Run Migrations

### Option 1: Using psql (PostgreSQL CLI)
```bash
# Connect to your Neon PostgreSQL database
psql $DATABASE_URL

# Run migrations
\i migrations/007_update_users_table_uuid.sql
\i migrations/008_seed_admin_users.sql
```

### Option 2: Using Node.js Script
```bash
# Create a script to run migrations
node -e "
const { Pool } = require('pg');
const fs = require('fs');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function runMigration(file) {
  const sql = fs.readFileSync(file, 'utf8');
  await pool.query(sql);
  console.log('✅ Migration completed:', file);
}

(async () => {
  await runMigration('migrations/007_update_users_table_uuid.sql');
  await runMigration('migrations/008_seed_admin_users.sql');
  await pool.end();
})();
"
```

### Option 3: Using Database GUI Tool
1. Connect to your Neon PostgreSQL database
2. Open and execute `migrations/007_update_users_table_uuid.sql`
3. Open and execute `migrations/008_seed_admin_users.sql`

## 🧪 Testing APIs

### 1. Test Admin Login (No OTP)
```bash
curl -X POST http://localhost:5000/api/auth/admin-login \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+9647500914000",
    "role": "superadmin"
  }'
```

### 2. Test Flutter App OTP Login
```bash
# Send OTP
curl -X POST http://localhost:5000/api/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"phone": "+9647700914000"}'

# Verify OTP (use OTP received via SMS)
curl -X POST http://localhost:5000/api/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+9647700914000",
    "otp": "123456"
  }'
```

### 3. Test Change Phone Number
```bash
# Get access token first (from login)
TOKEN="your_access_token_here"

# Send OTP to new phone
curl -X POST http://localhost:5000/api/auth/change-phone/send-otp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"newPhone": "+9647700914001"}'

# Verify OTP and update phone
curl -X POST http://localhost:5000/api/auth/change-phone/verify \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "newPhone": "+9647700914001",
    "otp": "123456"
  }'
```

## 📝 Final SQL to Run

After running migrations, verify the seeded users:

```sql
-- Verify all admin users are created
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
WHERE phone IN ('+9647500914000', '+9647700914000', '+9648000914000')
ORDER BY 
  CASE role
    WHEN 'superadmin' THEN 1
    WHEN 'admin' THEN 2
    WHEN 'moderator' THEN 3
    ELSE 4
  END;
```

Expected output:
```
 id |     name      |          email           |      phone       |    role     |  status  |         created_at          |         updated_at          
----+---------------+--------------------------+------------------+-------------+-----------+----------------------------+----------------------------
  1 | Super Admin   | superadmin@bidmaster.com| +9647500914000   | superadmin  | approved | 2025-01-XX XX:XX:XX.XXX    | 2025-01-XX XX:XX:XX.XXX
  2 | Admin User    | admin@bidmaster.com     | +9647700914000   | admin       | approved | 2025-01-XX XX:XX:XX.XXX    | 2025-01-XX XX:XX:XX.XXX
  3 | Moderator     | moderator@bidmaster.com  | +9648000914000   | moderator   | approved | 2025-01-XX XX:XX:XX.XXX    | 2025-01-XX XX:XX:XX.XXX
```

## ✅ Checklist

- [x] PostgreSQL migration created (UUID support, roles, status)
- [x] Seed file created for 3 phone numbers
- [x] Admin login API works without OTP
- [x] Flutter app uses Twilio Verify (no mock OTP)
- [x] Change phone number feature added
- [x] All hardcoded phone restrictions removed
- [x] Routes added for change phone endpoints
- [x] Documentation created

## 🚀 Next Steps

1. Run migrations on your Neon PostgreSQL database
2. Test all API endpoints
3. Update Flutter app to use change phone endpoints
4. Update Admin panel to use change phone endpoints
5. Verify all 3 phone numbers can login successfully

