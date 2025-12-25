# Employee Login Instructions

## 📱 Employee Login Process

### Requirements:
1. **Database me Employee User Registered Hona Chahiye**
   - Phone number database me registered hona chahiye
   - Role = `employee` set hona chahiye
   - Status = `approved` hona chahiye

### Login Steps:

1. **Login Screen me:**
   - "Employee" role select karein
   - Database me registered phone number enter karein

2. **Phone Number Format:**
   - Iraq format: `+964XXXXXXXXXX` (9-10 digits after +964)
   - Examples:
     - `+964776650986`
     - `+9647701234567`
     - `07701234567` (auto-converts to +9647701234567)

3. **Backend Process:**
   - Backend database me search karega: `WHERE phone = $1 AND role = 'employee'`
   - Agar user mil gaya aur status = 'approved' hai, to login successful
   - Agar user nahi mila, to error: "User not found"

---

## 🔧 How to Create Employee User in Database

### Option 1: Via Admin Panel (Recommended)
1. Super Admin se login karein
2. User Management page par jayein
3. "Create User" button click karein
4. Fill karein:
   - Name: Employee ka name
   - Phone: Employee ka phone number (Iraq format)
   - Role: `employee` select karein
   - Status: `approved` select karein
5. Save karein

### Option 2: Via SQL Query
```sql
INSERT INTO users (name, email, phone, role, status, created_at)
VALUES (
  'Employee Name',
  'employee@company.com',
  '+964776650986',  -- Employee ka phone number
  'employee',
  'approved',
  CURRENT_TIMESTAMP
);
```

### Option 3: Via API
```bash
POST /api/admin/users
Headers: Authorization: Bearer <admin_token>
Body: {
  "name": "Employee Name",
  "phone": "+964776650986",
  "role": "employee",
  "status": "approved"
}
```

---

## ✅ Verification

### Check Employee User Exists:
```sql
SELECT id, name, phone, role, status 
FROM users 
WHERE role = 'employee' AND status = 'approved';
```

### Test Login:
1. Login screen me "Employee" role select karein
2. Database me registered phone number enter karein
3. Login button click karein
4. Agar user exists aur approved hai, to login successful hoga

---

## ⚠️ Important Notes

1. **Phone Number Must Match:**
   - Database me jo phone number hai, wahi enter karna hoga
   - Format normalization automatic hota hai (+964, 964, 00964, 0)

2. **Role Must Match:**
   - Database me role = `employee` hona chahiye
   - Agar role different hai, to login fail hoga

3. **Status Must Be Approved:**
   - Status = `approved` hona chahiye
   - Agar `pending` ya `blocked` hai, to login fail hoga

4. **No Auto-Create:**
   - Employee ke liye auto-create nahi hota (sirf viewer ke liye hai)
   - Pehle database me user create karna hoga

---

## 📝 Example

### Database Entry:
```sql
INSERT INTO users (name, email, phone, role, status, created_at)
VALUES (
  'John Employee',
  'john@company.com',
  '+964776650986',
  'employee',
  'approved',
  CURRENT_TIMESTAMP
);
```

### Login:
- Role: Employee
- Phone: `+964776650986` ya `0776650986` ya `964776650986`
- Result: ✅ Login Successful

---

**Note:** Employee login ke liye database me user pehle se registered hona chahiye.

