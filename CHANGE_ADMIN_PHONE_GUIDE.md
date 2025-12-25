# 🔐 Guide: Change Superadmin/Moderator Phone Number

## ⚠️ Important Security Note
Superadmin/Moderator phone numbers are protected for login security. Only change if absolutely necessary.

---

## Method 1: Direct Database Update (Recommended for Emergency)

### Step 1: Connect to PostgreSQL Database
```bash
# Using psql
psql -U your_username -d your_database_name

# Or using pgAdmin / DBeaver
```

### Step 2: Find User ID
```sql
-- Find Superadmin/Moderator user
SELECT id, name, email, phone, role 
FROM users 
WHERE role IN ('superadmin', 'admin', 'moderator');
```

### Step 3: Update Phone Number
```sql
-- Update Superadmin phone number
UPDATE users 
SET phone = '+964 750 123 4567',  -- New phone number
    updated_at = NOW()
WHERE id = 1  -- Replace with actual user ID
  AND role IN ('superadmin', 'admin', 'moderator');

-- Verify update
SELECT id, name, phone, role FROM users WHERE id = 1;
```

### Step 4: Test Login
- Try logging in with new phone number
- Verify old phone number no longer works

---

## Method 2: Using Admin Panel API (If Backend Access)

### API Endpoint (Temporary - Add to adminController.js)
```javascript
// POST /api/admin/users/:id/change-admin-phone
// Requires: Superadmin role + Special permission
```

### Request Body:
```json
{
  "phone": "+964 750 123 4567",
  "confirmPassword": "your_admin_password"
}
```

---

## Method 3: Create Admin Settings Page (Future Enhancement)

### Features:
1. **Admin Settings Page** - Only accessible to Superadmin
2. **Change Phone Number** - With password confirmation
3. **Two-Factor Verification** - Email/SMS OTP
4. **Audit Log** - Track all phone number changes

---

## ⚠️ Security Checklist Before Changing:

- [ ] Backup current phone number
- [ ] Verify new phone number is correct
- [ ] Test login with new number immediately
- [ ] Update any documentation
- [ ] Notify team members (if applicable)
- [ ] Log the change in admin_activity_log

---

## 📝 Example SQL Script

```sql
-- Complete script to change Superadmin phone
BEGIN;

-- 1. Backup current phone
CREATE TEMP TABLE phone_backup AS
SELECT id, name, phone, role 
FROM users 
WHERE role = 'superadmin' AND id = 1;

-- 2. Update phone number
UPDATE users 
SET phone = '+964 750 123 4567',
    updated_at = NOW()
WHERE id = 1 AND role = 'superadmin';

-- 3. Log the change
INSERT INTO admin_activity_log (admin_id, action, entity_type, entity_id, created_at)
VALUES (1, 'Changed admin phone number', 'user', 1, NOW());

-- 4. Verify
SELECT id, name, phone, role, updated_at 
FROM users 
WHERE id = 1;

COMMIT;
```

---

## 🚨 Emergency Recovery

If you lose access after changing phone number:

1. **Database Access**: Use Method 1 to revert
2. **Contact Database Admin**: Request phone number reset
3. **Create New Superadmin**: If needed, create temporary admin account

---

## 📞 Support

For assistance, contact your database administrator or system administrator.


