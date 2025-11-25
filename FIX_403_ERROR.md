# Fix 403 Forbidden Error - Token Scope Issue

## ❌ Problem

**Error:** `403 Forbidden - This token is not valid for mobile app. Please use mobile app login.`

**Root Cause:**
- User with phone `+9647700914000` has role `buyer` in database
- But if role was `admin`, it gets mapped to `superadmin` in `verifyOTP`
- Then scope becomes `admin` instead of `mobile`
- Flutter app middleware checks scope and rejects `admin` scope tokens

## ✅ Solution

### 1. Ensure User Role is Correct in Database

**Check current role:**
```sql
SELECT phone, role, status 
FROM users 
WHERE phone = '+9647700914000';
```

**Expected:** `role = 'buyer'`

**If role is 'admin', update it:**
```sql
UPDATE users 
SET role = 'buyer', updated_at = CURRENT_TIMESTAMP 
WHERE phone = '+9647700914000';
```

### 2. Code Fix Applied

**File:** `src/controllers/authController.js`

**Changes:**
- ✅ Removed automatic `admin` → `superadmin` mapping in `verifyOTP`
- ✅ Flutter app users always get `mobile` scope
- ✅ Admin roles can still use Flutter app (with warning)

### 3. Verify Database

**Run migration to ensure correct role:**
```bash
psql $DATABASE_URL -f migrations/008_seed_admin_users.sql
```

This will update the user to have role `buyer`.

## 🧪 Testing

### Test Flutter App Login
```bash
# Step 1: Send OTP
curl -X POST http://localhost:5000/api/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"phone": "+9647700914000"}'

# Step 2: Verify OTP
curl -X POST http://localhost:5000/api/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+9647700914000",
    "otp": "123456"
  }'
```

**Check token scope:**
The response should have `accessToken` with scope `mobile`.

### Verify Token Scope
Decode the JWT token and check the `scope` field. It should be `mobile`, not `admin`.

## 📋 Summary

| Issue | Solution |
|-------|----------|
| User role in DB | Ensure `role = 'buyer'` for `+9647700914000` |
| Scope mapping | Flutter app always gets `mobile` scope |
| Token validation | Middleware checks scope matches platform |

## ✅ After Fix

1. ✅ User with `+9647700914000` has role `buyer` in database
2. ✅ `verifyOTP` generates token with scope `mobile`
3. ✅ Flutter app middleware accepts `mobile` scope tokens
4. ✅ Profile update works without 403 error

**Run the migration to fix the database role!**

