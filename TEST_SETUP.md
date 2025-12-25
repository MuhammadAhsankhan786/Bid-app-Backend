# Test Script Setup Guide

## Running `test-admin-phone-protection.js`

### Required Environment Variables

The test script requires the **actual Superadmin password** to test the special endpoint.

#### Option 1: Using `.env` File (Recommended)

1. Create a `.env` file in the `Bid app Backend` directory:

```bash
cd "Bid app Backend"
```

2. Add the following to `.env`:

```env
ADMIN_PASSWORD=your_actual_superadmin_password_here
ADMIN_PHONE=+9647500914000
BASE_URL=http://localhost:5000/api
```

**Important**: Replace `your_actual_superadmin_password_here` with the **actual password** of the Superadmin user in your database.

#### Option 2: Using Environment Variables

```bash
# Windows PowerShell
$env:ADMIN_PASSWORD="your_actual_superadmin_password_here"
$env:ADMIN_PHONE="+9647500914000"

# Linux/Mac
export ADMIN_PASSWORD="your_actual_superadmin_password_here"
export ADMIN_PHONE="+9647500914000"
```

### Finding the Superadmin Password

If you don't know the Superadmin password:

1. **Check Database**:
   ```sql
   SELECT id, name, email, phone, role 
   FROM users 
   WHERE role IN ('superadmin', 'admin');
   ```

2. **Reset Password** (if needed):
   ```sql
   -- Hash a new password (use bcrypt in Node.js)
   -- Or use the password reset functionality if available
   ```

3. **Check Application Config**: Look for default passwords in:
   - Database seed scripts
   - Initial setup documentation
   - Environment configuration files

### Running the Test

```bash
cd "Bid app Backend"
node test-admin-phone-protection.js
```

### Expected Output

If `ADMIN_PASSWORD` is correct:
```
✅ Test 4: Using Special Endpoint with Password (Should Work)...
✅ SUCCESS: Phone changed via special endpoint to +964 750 123 4567
```

If `ADMIN_PASSWORD` is wrong:
```
❌ FAILED: Invalid password confirmation
💡 Hint: The password in ADMIN_PASSWORD doesn't match the Superadmin password.
```

### Security Note

⚠️ **Never commit `.env` file to version control!**

The `.env` file should be in `.gitignore`:
```
.env
.env.local
*.env
```

### Troubleshooting

**Error: "ADMIN_PASSWORD environment variable is required"**
- Solution: Create `.env` file or set environment variable

**Error: "Invalid password confirmation"**
- Solution: Update `ADMIN_PASSWORD` in `.env` with the correct password

**Error: "Login failed"**
- Solution: Check `ADMIN_PHONE` is correct (default: `+9647500914000`)

