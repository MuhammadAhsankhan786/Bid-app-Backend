# 📱 Phone Number Normalization - Database Storage

## ✅ Guarantee: All Phone Numbers Stored as `+9647507777777` (No Spaces)

**Input**: `+964 750 777 7777`  
**Database Storage**: `+9647507777777` ✅

---

## 🔍 All Functions Updated

### 1. ✅ `changeAdminPhone` (Special Endpoint)
**File**: `src/controllers/adminController.js` (Line 668-675)

```javascript
// STEP 1: Sanitize phone number
const normalizedPhone = normalizeIraqPhone(phone); // "+964 750 777 7777" → "+9647507777777"

// STEP 6: Update phone number (using normalized phone)
const result = await pool.query(
  `UPDATE users SET phone = $1, updated_at = NOW() ...`,
  [normalizedPhone, id]  // ✅ Normalized phone stored
);
```

**Result**: `+964 750 777 7777` → Database: `+9647507777777` ✅

---

### 2. ✅ `updateUser` (Normal Users)
**File**: `src/controllers/adminController.js` (Line 480-512)

```javascript
if (phone !== undefined) {
  // STEP 1: Sanitize phone number
  const normalizedPhone = normalizeIraqPhone(phone); // "+964 750 777 7777" → "+9647507777777"
  
  // STEP 4: Use normalized phone for update
  const phoneIndex = updates.findIndex(u => u.includes('phone'));
  if (phoneIndex !== -1) {
    params[phoneIndex] = normalizedPhone; // ✅ Normalized phone in params
  }
}
```

**Result**: `+964 750 777 7777` → Database: `+9647507777777` ✅

---

### 3. ✅ `createUser` (New Users)
**File**: `src/controllers/adminController.js` (Line 359-389)

```javascript
// Normalize phone number if provided
let normalizedPhone = null;
if (phone) {
  normalizedPhone = normalizeIraqPhone(phone); // "+964 750 777 7777" → "+9647507777777"
  if (!normalizedPhone || !isValidIraqPhone(normalizedPhone)) {
    return res.status(400).json({ error: "Invalid phone format" });
  }
}

// Use normalized phone for database storage
const result = await pool.query(
  `INSERT INTO users (name, email, password, phone, role, status, created_at)
   VALUES ($1, $2, $3, $4, $5, 'approved', CURRENT_TIMESTAMP) ...`,
  [name, email, hashedPassword, normalizedPhone, role]  // ✅ Normalized phone stored
);
```

**Result**: `+964 750 777 7777` → Database: `+9647507777777` ✅

---

### 4. ✅ `authController` (Auto-Create Viewer/Employee)
**File**: `src/controllers/authController.js` (Line 120-200)

```javascript
// Already uses normalizedPhone from normalizeIraqPhone()
const normalizedPhone = normalizeIraqPhone(phone); // "+964 750 777 7777" → "+9647507777777"

const insertResult = await pool.query(
  `INSERT INTO users (name, email, phone, role, status, created_at)
   VALUES ($1, $2, $3, 'viewer', 'approved', CURRENT_TIMESTAMP) ...`,
  [`Viewer ${normalizedPhone}`, viewerEmail, normalizedPhone]  // ✅ Normalized phone stored
);
```

**Result**: `+964 750 777 7777` → Database: `+9647507777777` ✅

---

## 📊 Normalization Function

**File**: `src/utils/phoneUtils.js`

```javascript
export function normalizeIraqPhone(phone) {
  if (!phone) return null;
  
  // Remove spaces, hyphens, parentheses, dots
  let cleaned = phone.replace(/[\s\-\(\)\.]/g, '');
  // "+964 750 777 7777" → "+9647507777777"
  
  // Handle various formats: 00964, 964, 0XXXXXXXXXX
  // ... normalization logic ...
  
  return cleaned; // Returns: "+9647507777777"
}
```

**Examples**:
- `+964 750 777 7777` → `+9647507777777` ✅
- `+964-750-777-7777` → `+9647507777777` ✅
- `+964 (750) 777.7777` → `+9647507777777` ✅
- `009647507777777` → `+9647507777777` ✅
- `07507777777` → `+9647507777777` ✅

---

## 🔒 Database Storage Format

### ✅ All Phone Numbers Stored As:
```
+9647507777777  (No spaces, no hyphens, no formatting)
```

### ❌ Never Stored As:
```
+964 750 777 7777  (with spaces)
+964-750-777-7777  (with hyphens)
+964 (750) 777.7777  (with formatting)
```

---

## 🧪 Testing

### Test 1: Create User with Spaces
```bash
POST /api/admin/users
{
  "name": "Test User",
  "email": "test@example.com",
  "password": "password123",
  "phone": "+964 750 777 7777",
  "role": "viewer"
}
```

**Expected Database Value**: `+9647507777777` ✅

---

### Test 2: Update User Phone with Spaces
```bash
PUT /api/admin/users/123
{
  "phone": "+964 750 999 9999"
}
```

**Expected Database Value**: `+9647509999999` ✅

---

### Test 3: Change Admin Phone with Spaces
```bash
PUT /api/admin/users/1/change-admin-phone
{
  "phone": "+964 750 123 4567",
  "confirmPassword": "admin123"
}
```

**Expected Database Value**: `+9647501234567` ✅

---

## 📝 Existing Data Cleanup (Optional)

If you have existing phone numbers with spaces in the database, you can normalize them:

```sql
-- Find phone numbers with spaces
SELECT id, name, phone FROM users 
WHERE phone LIKE '% %' OR phone LIKE '%-%';

-- Normalize all phone numbers (run normalization function for each)
-- Note: This requires application-level normalization, not SQL
```

**Recommended**: Use a migration script to normalize existing data:

```javascript
// migration-normalize-phones.js
import pool from './config/db.js';
import { normalizeIraqPhone, isValidIraqPhone } from './src/utils/phoneUtils.js';

const result = await pool.query('SELECT id, phone FROM users WHERE phone IS NOT NULL');

for (const row of result.rows) {
  const normalized = normalizeIraqPhone(row.phone);
  if (normalized && normalized !== row.phone) {
    await pool.query('UPDATE users SET phone = $1 WHERE id = $2', [normalized, row.id]);
    console.log(`Updated ${row.id}: ${row.phone} → ${normalized}`);
  }
}
```

---

## ✅ Summary

**All phone numbers are now normalized before database storage:**

1. ✅ **Input**: `+964 750 777 7777` (with spaces)
2. ✅ **Normalization**: `normalizeIraqPhone()` removes spaces
3. ✅ **Validation**: `isValidIraqPhone()` checks format
4. ✅ **Storage**: `+9647507777777` (normalized format)

**Result**: Database always contains clean, normalized phone numbers without spaces! 🎯

