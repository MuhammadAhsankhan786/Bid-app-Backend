# 📱 Admin Phone Numbers - Fixed

## ✅ Fixed Phone Numbers

### Superadmin
- **Phone**: `+9647500914000`
- **Status**: Protected (cannot change via normal endpoint)
- **Login**: Use this exact phone with role "superadmin"

### Moderator
- **Phone**: `+9647800914000`
- **Status**: Protected (cannot change via normal endpoint)
- **Login**: Use this exact phone with role "moderator"

---

## 🔧 Update Database

Run this script to update phone numbers in database:

```bash
cd "Bid app Backend"
node update-admin-phones.js
```

**This will:**
1. ✅ Update Superadmin phone to `+9647500914000`
2. ✅ Update Moderator phone to `+9647800914000`
3. ✅ Normalize phone numbers (remove spaces if any)
4. ✅ Update `.env` file automatically
5. ✅ Verify updates

---

## 📝 .env File

After running the script, `.env` will have:

```env
ADMIN_PHONE=+9647500914000
MODERATOR_PHONE=+9647800914000
ADMIN_PASSWORD=admin123
BASE_URL=http://localhost:5000/api
```

---

## 🧪 Test Login

### Superadmin Login
```bash
POST /api/auth/admin-login
{
  "phone": "+9647500914000",
  "role": "superadmin"
}
```

### Moderator Login
```bash
POST /api/auth/admin-login
{
  "phone": "+9647800914000",
  "role": "moderator"
}
```

---

## ✅ Verification

After updating, verify:

```bash
# Run test script
node test-admin-phone-protection.js

# Should show:
# ✅ Login successful!
# ✅ Found superadmin: ... (Phone: +9647500914000)
# ✅ Found moderator: ... (Phone: +9647800914000)
```

---

## 🔒 Security

These phone numbers are **protected**:
- ❌ Cannot change via normal `/admin/users/:id` endpoint
- ✅ Can only change via special `/admin/users/:id/change-admin-phone` endpoint
- ✅ Requires Superadmin role + password confirmation

---

## 📋 Summary

| Role | Phone Number | Status |
|------|-------------|--------|
| Superadmin | `+9647500914000` | ✅ Fixed & Protected |
| Moderator | `+9647800914000` | ✅ Fixed & Protected |

**Run**: `node update-admin-phones.js` to apply changes! 🚀

