# CRITICAL FIX: 403 Error - Token Scope Issue

## 🔴 Problem (From Logs)

```
Role (from token): superadmin
Scope (from token): admin
⚠️ [verifyUser] Invalid scope for mobile route: admin
❌ Error: This token is not valid for mobile app. Please use mobile app login.
```

**Root Cause:**
- User `+9647700914000` has role `superadmin` in database (should be `buyer`)
- When login via `verifyOTP`, token gets `admin` scope (because role is `superadmin`)
- Flutter app middleware rejects `admin` scope tokens
- Result: 403 Forbidden error

## ✅ Solution Applied

### 1. Code Fix (Already Applied)

**File:** `src/controllers/authController.js`

**Change:** `verifyOTP` endpoint now **ALWAYS** gives `mobile` scope, regardless of user role.

```javascript
// CRITICAL FIX: Flutter app verifyOTP always gets 'mobile' scope
// Even if user has admin role, Flutter app login should give mobile scope
const scope = 'mobile';
```

**Why:** `verifyOTP` is specifically for Flutter app, so it should always give `mobile` scope.

### 2. Database Fix (REQUIRED)

**Run this script to fix user role:**

```bash
node src/scripts/fix_user_role_and_scope.js
```

**Or run SQL directly:**

```sql
UPDATE users 
SET role = 'buyer', 
    updated_at = CURRENT_TIMESTAMP 
WHERE phone = '+9647700914000';
```

**Or run migration:**

```bash
psql $DATABASE_URL -f migrations/008_seed_admin_users.sql
```

### 3. User Action Required

**User must:**
1. **Logout** from Flutter app
2. **Clear app storage** (or reinstall app)
3. **Login again** via OTP
4. New token will have:
   - Role: `buyer` (from database)
   - Scope: `mobile` (from verifyOTP endpoint)
5. Profile update will work ✅

## 🧪 Verification

### Check Database
```sql
SELECT phone, role, status 
FROM users 
WHERE phone = '+9647700914000';
```

**Expected:**
```
      phone       | role  |  status  
------------------+-------+----------
 +9647700914000   | buyer | approved
```

### Check Token After Login
After user logs in again, token should have:
- Role: `buyer` (not `superadmin`)
- Scope: `mobile` (not `admin`)

## 📋 Summary

| Issue | Fix |
|-------|-----|
| User role in DB | Update to `buyer` |
| Token scope | `verifyOTP` always gives `mobile` scope |
| User action | Logout and login again |

## ✅ After Fix

1. ✅ Database: User has role `buyer`
2. ✅ Code: `verifyOTP` always gives `mobile` scope
3. ✅ Token: New token has `mobile` scope
4. ✅ Flutter app: Accepts token, no 403 error

**Run the database fix script NOW!**

