# Login Mapping Report - Database ke hisaab se

## 🔐 Login Methods

### 1. Admin Panel Login (No OTP)

**Endpoint:** `POST /api/auth/admin-login`

**Method:** Direct phone + role login (no OTP required)

**Who can login:**
- Super Admin → Phone: `+9647500914000`, Role: `superadmin`
- Admin → Phone: `+9647700914000`, Role: `admin`
- Moderator → Phone: `+9648000914000`, Role: `moderator`
- Viewer → Any phone with role: `viewer`

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
  "accessToken": "...",  // Valid for 7 days
  "refreshToken": "...", // Valid for 7 days
  "role": "superadmin",
  "user": { ... }
}
```

### 2. Flutter App Login (OTP Required)

**Endpoints:**
- `POST /api/auth/send-otp` - Send OTP via Twilio Verify
- `POST /api/auth/verify-otp` - Verify OTP and login

**Method:** Phone + OTP (Twilio Verify API)

**Who can login:**
- Any user with phone number in database
- Roles: `buyer`, `seller`, or any other non-admin role

**Step 1 - Send OTP:**
```json
{
  "phone": "+9647700914000"
}
```

**Step 2 - Verify OTP:**
```json
{
  "phone": "+9647700914000",
  "otp": "123456"  // OTP from SMS
}
```

**Response:**
```json
{
  "success": true,
  "accessToken": "...",  // Valid for 7 days
  "refreshToken": "...", // Valid for 7 days
  "role": "buyer",
  "user": { ... }
}
```

## ⏰ Token Expiration - 7 Days

**Updated:** Access tokens now expire in **7 days** (previously 15 minutes)

**Benefits:**
- ✅ User stays logged in for 7 days
- ✅ No need to login again unless user manually logs out
- ✅ Refresh token also valid for 7 days
- ✅ Auto-refresh mechanism handles token renewal

**Token Configuration:**
- Access Token: `7 days` (updated)
- Refresh Token: `7 days` (unchanged)

## 🔍 How to Check Database Login Mapping

Run the script to see all login mappings:

```bash
node src/scripts/checkLoginMapping.js
```

This will show:
- All admin panel users (phone + role)
- All Flutter app users (phone + role)
- Required phone numbers verification
- Login request examples for each user

## 📋 Required Phone Numbers

| Phone Number | Role | Login Method | Status |
|-------------|------|--------------|--------|
| +9647500914000 | superadmin | Admin Panel (No OTP) | approved |
| +9647700914000 | admin | Admin Panel (No OTP) | approved |
| +9648000914000 | moderator | Admin Panel (No OTP) | approved |

## 🚀 Testing

### Test Admin Login (No OTP)
```bash
curl -X POST http://localhost:5000/api/auth/admin-login \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+9647500914000",
    "role": "superadmin"
  }'
```

### Test Flutter App Login (OTP)
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

## ✅ Changes Made

1. **Token Expiration Updated:**
   - Access token: `15m` → `7d`
   - Refresh token: `7d` (unchanged)

2. **Login Mapping Script:**
   - Created `src/scripts/checkLoginMapping.js`
   - Shows all users and their login methods
   - Verifies required phone numbers

3. **Documentation:**
   - Created this report
   - Includes login examples
   - Database verification steps

