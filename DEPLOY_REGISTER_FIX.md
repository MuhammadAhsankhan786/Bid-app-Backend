# Deploy Registration Fix to Production

## Issue
Production API (`https://api.mazaadati.com/api/auth/register`) is returning 500 error because:
- Old code tries to insert `NULL` for email when not provided
- Database has `email VARCHAR(150) UNIQUE NOT NULL` constraint

## Fix Applied (Local)
✅ Email auto-generation added (line 978)
✅ Enhanced error handling with full stack trace (lines 1042-1120)

## Production Deployment Steps

### Option 1: Deploy Updated Code
1. **Commit the changes:**
   ```bash
   cd "Bid app Backend"
   git add src/controllers/authController.js
   git commit -m "Fix: Auto-generate email in registration endpoint"
   git push origin main
   ```

2. **Deploy to production server:**
   - If using Render/Heroku/AWS: Push triggers auto-deploy
   - If manual deployment: Copy updated `authController.js` to production server

3. **Restart production server:**
   ```bash
   # On production server
   pm2 restart bidmaster-api
   # OR
   systemctl restart bidmaster-api
   # OR (if using Render/Heroku)
   # Auto-restarts on deploy
   ```

### Option 2: Check Production Database Schema
If production database has different schema, check:
```sql
-- Check if email is nullable
SELECT column_name, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'users' AND column_name = 'email';

-- If email is NOT NULL, the fix is needed
-- If email is nullable, check other constraints
```

### Option 3: Temporary Database Fix (If can't deploy code)
If you can't deploy code immediately, make email nullable:
```sql
ALTER TABLE users ALTER COLUMN email DROP NOT NULL;
```
⚠️ **Warning: This allows NULL emails, which may cause issues elsewhere**

## Verify Fix
After deployment, test registration:
```bash
curl -X POST https://api.mazaadati.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "phone": "+9647100914000",
    "password": "test123",
    "role": "company_products"
  }'
```

Expected response:
```json
{
  "success": true,
  "message": "User registered successfully",
  "accessToken": "...",
  "refreshToken": "...",
  "user": {
    "id": 123,
    "name": "Test User",
    "email": "user_9647100914000@bidmaster.com",
    "phone": "+9647100914000",
    "role": "company_products",
    "status": "pending"
  }
}
```

## Files Changed
- `Bid app Backend/src/controllers/authController.js`
  - Line 978: Email auto-generation
  - Lines 1042-1120: Enhanced error handling

## Current Status
- ✅ Local code fixed
- ⏳ Production deployment pending
- ⏳ Production server restart needed



