# 🧪 Testing Guide: Admin Phone Number Protection

## ✅ Test 1: Normal User Phone Number Change (Should Work)

### Step 1: Login as Superadmin
```
POST /api/auth/admin-login
Body: {
  "email": "admin@bidmaster.com",
  "password": "your_password",
  "role": "superadmin"
}
```

### Step 2: Get User List
```
GET /api/admin/users
Headers: Authorization: Bearer <superadmin_token>
```

### Step 3: Find a Normal User (Viewer/Employee/Seller)
- Note down user ID (e.g., ID: 55)

### Step 4: Try to Update Normal User's Phone
```
PUT /api/admin/users/55
Headers: Authorization: Bearer <superadmin_token>
Body: {
  "phone": "+964 750 999 9999"
}
```

**Expected Result:** ✅ Success - Phone number updated

---

## ❌ Test 2: Superadmin Phone Number Change (Should Fail)

### Step 1: Find Superadmin User ID
```
GET /api/admin/users
Headers: Authorization: Bearer <superadmin_token>
```
- Find user with role = "superadmin" or "admin"
- Note down ID (e.g., ID: 1)

### Step 2: Try to Update Superadmin Phone via Normal Endpoint
```
PUT /api/admin/users/1
Headers: Authorization: Bearer <superadmin_token>
Body: {
  "phone": "+964 750 888 8888"
}
```

**Expected Result:** ❌ Error 403 - "Cannot update phone number for Super Admin or Moderator"

---

## ❌ Test 3: Moderator Phone Number Change (Should Fail)

### Step 1: Find Moderator User ID
```
GET /api/admin/users?role=moderator
Headers: Authorization: Bearer <superadmin_token>
```

### Step 2: Try to Update Moderator Phone
```
PUT /api/admin/users/2
Headers: Authorization: Bearer <superadmin_token>
Body: {
  "phone": "+964 750 777 7777"
}
```

**Expected Result:** ❌ Error 403 - "Cannot update phone number for Super Admin or Moderator"

---

## ✅ Test 4: Special Endpoint - Change Admin Phone (Should Work)

### Step 1: Use Special Endpoint
```
PUT /api/admin/users/1/change-admin-phone
Headers: Authorization: Bearer <superadmin_token>
Body: {
  "phone": "+964 750 123 4567",
  "confirmPassword": "your_admin_password"
}
```

**Expected Result:** ✅ Success - Phone number updated with password confirmation

---

## ❌ Test 5: Special Endpoint - Wrong Password (Should Fail)

```
PUT /api/admin/users/1/change-admin-phone
Headers: Authorization: Bearer <superadmin_token>
Body: {
  "phone": "+964 750 123 4567",
  "confirmPassword": "wrong_password"
}
```

**Expected Result:** ❌ Error 401 - "Invalid password confirmation"

---

## 🖥️ Frontend UI Testing

### Test 1: Edit Normal User
1. Login to Admin Panel as Superadmin
2. Go to "User Management"
3. Click 3 dots menu on any normal user (Viewer/Employee/Seller)
4. Click "Edit User"
5. Try to change phone number
6. Click "Save Changes"

**Expected:** ✅ Phone number changes successfully

### Test 2: Edit Superadmin
1. Go to "User Management"
2. Find Superadmin user
3. Click "Edit User"
4. Check phone number field

**Expected:** 
- ❌ Phone field is **disabled** (grayed out)
- ⚠️ Warning message: "Phone number is fixed for Super Admin/Moderator for login security"

### Test 3: Edit Moderator
1. Find Moderator user
2. Click "Edit User"
3. Check phone number field

**Expected:**
- ❌ Phone field is **disabled**
- ⚠️ Warning message visible

---

## 📋 Quick Test Checklist

- [ ] Normal user phone change works ✅
- [ ] Superadmin phone change blocked (normal endpoint) ❌
- [ ] Moderator phone change blocked (normal endpoint) ❌
- [ ] Special endpoint works with password ✅
- [ ] Special endpoint fails with wrong password ❌
- [ ] Frontend: Normal user phone editable ✅
- [ ] Frontend: Superadmin phone disabled ❌
- [ ] Frontend: Moderator phone disabled ❌
- [ ] Warning message shows in UI ⚠️

---

## 🔍 Database Verification

### Check Phone Numbers
```sql
SELECT id, name, email, phone, role, updated_at 
FROM users 
WHERE role IN ('superadmin', 'admin', 'moderator')
ORDER BY role;
```

### Check Audit Log
```sql
SELECT * FROM admin_activity_log 
WHERE action LIKE '%phone%' 
ORDER BY created_at DESC 
LIMIT 10;
```

---

## 🐛 Troubleshooting

### Issue: Phone number still changes for Superadmin
**Solution:** Check backend logs, verify the restriction code is running

### Issue: Frontend field not disabled
**Solution:** Clear browser cache, check React component state

### Issue: Special endpoint not found
**Solution:** Restart backend server, verify route is registered

---

## 📞 Test Results Template

```
Test Date: ___________
Tester: ___________

✅ Normal User Phone Change: PASS / FAIL
✅ Superadmin Protection: PASS / FAIL  
✅ Moderator Protection: PASS / FAIL
✅ Special Endpoint: PASS / FAIL
✅ Frontend UI: PASS / FAIL

Notes: 
_______________________________________
_______________________________________
```


