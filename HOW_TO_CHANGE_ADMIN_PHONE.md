# 🔐 Superadmin/Moderator Phone Number Change - Complete Flow

## 📋 Overview

Superadmin/Moderator ka phone number change karne ke **3 methods** hain:

1. **✅ Special API Endpoint** (Recommended - UI se)
2. **✅ Direct Database Update** (Emergency - Direct SQL)
3. **✅ Postman/API Client** (Testing ke liye)

---

## 🎯 Method 1: Special API Endpoint (Recommended)

### Step 1: Superadmin Login
```
POST /api/auth/admin-login
Body: {
  "phone": "+9647500914000",
  "role": "superadmin"
}
```

### Step 2: Change Phone Number
```
PUT /api/admin/users/:id/change-admin-phone
Headers: {
  "Authorization": "Bearer <superadmin_token>"
}
Body: {
  "phone": "+9647501234567",  // New phone number
  "confirmPassword": "your_superadmin_password"
}
```

### Requirements:
- ✅ Only **Superadmin** can use this endpoint
- ✅ **Password confirmation** required (Superadmin ka apna password)
- ✅ Target user must be **Superadmin/Moderator**
- ✅ New phone number must be **unique** (duplicate nahi hona chahiye)
- ✅ Phone format: `+964XXXXXXXXXX` (Iraq format)

### Example Response:
```json
{
  "success": true,
  "message": "Phone number changed successfully",
  "user": {
    "id": 1,
    "name": "Super Admin",
    "phone": "+9647501234567",
    "role": "superadmin"
  }
}
```

---

## 🎯 Method 2: Direct Database Update (Emergency)

### Step 1: Connect to Database
```bash
# PostgreSQL
psql -U your_username -d your_database_name

# Or use pgAdmin / DBeaver
```

### Step 2: Find User
```sql
-- Find Superadmin/Moderator
SELECT id, name, phone, role 
FROM users 
WHERE role IN ('superadmin', 'admin', 'moderator');
```

### Step 3: Update Phone Number
```sql
-- Update Superadmin phone
UPDATE users 
SET phone = '+9647501234567',  -- New number
    updated_at = NOW()
WHERE id = 1  -- User ID
  AND role IN ('superadmin', 'admin', 'moderator');

-- Verify
SELECT id, name, phone, role, updated_at 
FROM users 
WHERE id = 1;
```

### Step 4: Log the Change (Optional but Recommended)
```sql
-- Log in admin_activity_log
INSERT INTO admin_activity_log (admin_id, action, entity_type, entity_id, details, created_at)
VALUES (
  1,  -- Admin ID who made the change
  'Changed admin phone number via database',
  'user',
  1,  -- Target user ID
  'Old: +9647500914000, New: +9647501234567',
  NOW()
);
```

---

## 🎯 Method 3: Postman/API Client (Testing)

### Step 1: Get Superadmin Token
```
POST http://localhost:5000/api/auth/admin-login
Content-Type: application/json

{
  "phone": "+9647500914000",
  "role": "superadmin"
}
```

**Response:**
```json
{
  "success": true,
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "phone": "+9647500914000",
    "role": "superadmin"
  }
}
```

### Step 2: Change Phone Number
```
PUT http://localhost:5000/api/admin/users/1/change-admin-phone
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "phone": "+9647501234567",
  "confirmPassword": "your_superadmin_password"
}
```

---

## 🔒 Security Features

### ✅ Protection Layers:
1. **Role Check**: Only Superadmin can change
2. **Password Verification**: Superadmin ka password confirm karna padta hai
3. **Target Validation**: Sirf Superadmin/Moderator ka number change ho sakta hai
4. **Duplicate Check**: New number already exist nahi karna chahiye
5. **Audit Logging**: Har change log hota hai
6. **Phone Format Validation**: Iraq format check (+964XXXXXXXXXX)

### ❌ Normal Update Endpoint Blocked:
```
PUT /api/admin/users/:id
```
- Ye endpoint **Superadmin/Moderator** ka phone number **change nahi kar sakta**
- Error: `403 - Cannot update phone number for Super Admin or Moderator`

---

## 📝 Complete Flow Example

### Scenario: Change Moderator Phone Number

#### Step 1: Login as Superadmin
```bash
curl -X POST http://localhost:5000/api/auth/admin-login \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+9647500914000",
    "role": "superadmin"
  }'
```

#### Step 2: Get Moderator User ID
```bash
curl -X GET http://localhost:5000/api/admin/users \
  -H "Authorization: Bearer <superadmin_token>"
```

#### Step 3: Change Moderator Phone
```bash
curl -X PUT http://localhost:5000/api/admin/users/2/change-admin-phone \
  -H "Authorization: Bearer <superadmin_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+9647801234567",
    "confirmPassword": "superadmin_password_here"
  }'
```

#### Step 4: Test New Phone
```bash
curl -X POST http://localhost:5000/api/auth/admin-login \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+9647801234567",
    "role": "moderator"
  }'
```

---

## 🚨 Error Handling

### Error 1: Unauthorized (403)
```json
{
  "error": "Only Superadmin can change admin phone numbers"
}
```
**Solution**: Superadmin se login karein

### Error 2: Invalid Password (401)
```json
{
  "error": "Invalid password confirmation"
}
```
**Solution**: Sahi password enter karein

### Error 3: Duplicate Phone (400)
```json
{
  "error": "Phone number already exists for user: John Doe (seller)"
}
```
**Solution**: Different phone number use karein

### Error 4: Invalid Format (400)
```json
{
  "error": "Invalid phone number format. Use Iraq format: +964 XXX XXX XXXX"
}
```
**Solution**: Correct format use karein: `+9647501234567`

### Error 5: User Not Found (404)
```json
{
  "error": "User not found"
}
```
**Solution**: Sahi user ID use karein

---

## 📊 Current Phone Numbers

### Superadmin
- **Current**: `+9647500914000`
- **Status**: Protected ✅

### Moderator
- **Current**: `+9647800914000`
- **Status**: Protected ✅

---

## ✅ Checklist Before Changing

- [ ] Backup current phone number
- [ ] Verify new phone number is correct
- [ ] Ensure new number is unique (not used by any user)
- [ ] Have Superadmin password ready
- [ ] Test login with new number immediately after change
- [ ] Update documentation if needed
- [ ] Notify team members (if applicable)

---

## 🔄 After Changing Phone Number

1. **Test Login**: New number se login test karein
2. **Verify Old Number**: Purana number ab login nahi karega
3. **Check Audit Log**: `admin_activity_log` me entry verify karein
4. **Update Documentation**: Phone number list update karein

---

## 💡 UI Implementation (Future)

Agar aap UI se change karna chahte hain, to:

1. **Admin Settings Page** banayein
2. **Change Phone Modal** add karein
3. **Password Confirmation Field** add karein
4. **API Call**: `apiService.changeAdminPhone(userId, newPhone, password)`

**Example UI Code:**
```jsx
const handleChangeAdminPhone = async () => {
  try {
    await apiService.changeAdminPhone(
      userId,
      newPhone,
      confirmPassword
    );
    toast.success('Phone number changed successfully');
  } catch (error) {
    toast.error(error.response?.data?.error || 'Failed to change phone');
  }
};
```

---

## 📞 Support

Agar koi issue ho to:
1. Check backend logs
2. Verify database connection
3. Check user permissions
4. Verify phone format

---

## 🎯 Summary

**Superadmin/Moderator ka number change karne ke liye:**

1. ✅ **Superadmin** login karein
2. ✅ **Special endpoint** use karein: `/admin/users/:id/change-admin-phone`
3. ✅ **Password confirm** karein
4. ✅ **New phone** provide karein (unique + valid format)
5. ✅ **Test login** karein new number se

**Normal update endpoint se change nahi hoga** - Special endpoint hi use karna hoga! 🔒

