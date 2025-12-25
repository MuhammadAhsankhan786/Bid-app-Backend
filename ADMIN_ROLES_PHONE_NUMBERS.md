# 📱 Admin Roles & Phone Numbers

## Fixed Phone Numbers (Protected - Cannot Change)

### Superadmin
- **Phone**: `+9647500914000` (or `7500914000`)
- **Status**: Protected - Phone number cannot be changed via normal endpoint
- **Login**: Use this exact phone number with role "superadmin"

### Moderator  
- **Phone**: `+9647800914000` (or `7800914000`)
- **Status**: Protected - Phone number cannot be changed via normal endpoint
- **Login**: Use this exact phone number with role "moderator"

---

## Auto-Create Roles (Any Iraqi Number Works)

### Viewer
- **Phone**: Any valid Iraqi number (e.g., `+9647501234567`)
- **Status**: Auto-created on first login
- **Login**: Use any Iraqi number with role "viewer"
- **Behavior**: 
  - If user doesn't exist → Auto-creates viewer user
  - If user exists → Updates role to viewer (if needed)

### Employee
- **Phone**: Any valid Iraqi number (e.g., `+9647501234567`)
- **Status**: Auto-created on first login
- **Login**: Use any Iraqi number with role "employee"
- **Behavior**:
  - If user doesn't exist → Auto-creates employee user
  - If user exists → Updates role to employee (if needed)

---

## Login Flow Summary

### Fixed Number Login (Superadmin/Moderator)
```
POST /api/auth/admin-login
Body: {
  "phone": "+9647500914000",  // Exact number required
  "role": "superadmin"
}
```

### Any Number Login (Viewer/Employee)
```
POST /api/auth/admin-login
Body: {
  "phone": "+9647501234567",  // Any valid Iraqi number
  "role": "viewer"  // or "employee"
}
```

---

## Phone Number Protection

### Protected Roles (Cannot Change Phone)
- ✅ Superadmin
- ✅ Moderator

### Unprotected Roles (Can Change Phone)
- ✅ Viewer
- ✅ Employee
- ✅ Seller
- ✅ Buyer

---

## Database Update (If Needed)

### Update Moderator Phone Number
```sql
UPDATE users 
SET phone = '+9647800914000',
    updated_at = NOW()
WHERE role = 'moderator' 
  AND phone != '+9647800914000';
```

### Update Superadmin Phone Number
```sql
UPDATE users 
SET phone = '+9647500914000',
    updated_at = NOW()
WHERE role IN ('superadmin', 'admin')
  AND phone != '+9647500914000';
```

---

## Testing

### Test Viewer Login (Any Number)
```bash
curl -X POST http://localhost:5000/api/auth/admin-login \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+9647501234567",
    "role": "viewer"
  }'
```

### Test Employee Login (Any Number)
```bash
curl -X POST http://localhost:5000/api/auth/admin-login \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+9647509876543",
    "role": "employee"
  }'
```

### Test Moderator Login (Fixed Number)
```bash
curl -X POST http://localhost:5000/api/auth/admin-login \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+9647800914000",
    "role": "moderator"
  }'
```

### Test Superadmin Login (Fixed Number)
```bash
curl -X POST http://localhost:5000/api/auth/admin-login \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+9647500914000",
    "role": "superadmin"
  }'
```

---

## Current Status

✅ **Viewer**: Any Iraqi number - Auto-create enabled
✅ **Employee**: Any Iraqi number - Auto-create enabled  
✅ **Moderator**: Fixed number `7800914000` - Protected
✅ **Superadmin**: Fixed number `7500914000` - Protected


