# Backend Deployment Instructions

## Changes Made
- ✅ Improved Twilio error messages in `src/services/twilioService.js`
- ✅ Better error handling for OTP sending failures

## Deployment Steps

### Option 1: Git Pull (If using Git on server)
```bash
# On server
cd /path/to/backend
git pull origin main
npm install  # If new dependencies added
pm2 restart all  # Or your process manager
```

### Option 2: Manual File Upload
1. **Upload Updated File:**
   - File: `src/services/twilioService.js`
   - Upload to: `src/services/twilioService.js` on server

2. **Restart Server:**
   ```bash
   # Using PM2
   pm2 restart all
   
   # Or using systemd
   sudo systemctl restart your-backend-service
   
   # Or manually
   # Stop current process and start again
   ```

### Option 3: Build Package (If needed)
```bash
# Create deployment package
cd "Bid app Backend"
tar -czf backend-deploy.tar.gz \
  src/ \
  package.json \
  package-lock.json \
  .env.example

# Upload to server and extract
# On server:
tar -xzf backend-deploy.tar.gz
npm install
pm2 restart all
```

## Files Changed
- `src/services/twilioService.js` - Improved error messages

## What Changed in twilioService.js

**Before:**
```javascript
throw new Error(`Failed to send SMS: ${error.message} (Code: ${error.code})`);
```

**After:**
```javascript
// Provide more user-friendly error messages
if (error.code === 30008) {
  throw new Error('Unable to deliver SMS to this number. Please check your phone number or contact support.');
} else if (error.code === 21211 || error.code === 21212) {
  throw new Error('Invalid phone number format. Please check and try again.');
} else {
  throw new Error(`Unable to send SMS. Please try again later. (Error: ${error.code || 'Unknown'})`);
}
```

## Verification After Deployment

1. **Check Server Logs:**
   ```bash
   pm2 logs
   # Or
   tail -f /path/to/logs
   ```

2. **Test OTP Endpoint:**
   ```bash
   curl -X POST https://api.mazaadati.com/api/auth/send-otp \
     -H "Content-Type: application/json" \
     -d '{"phone": "+9647700914000"}'
   ```

3. **Check Error Messages:**
   - Try with invalid phone number
   - Check if error messages are user-friendly

## Important Notes

- ⚠️ **Don't upload `.env` file** - Keep environment variables on server
- ✅ **Keep `node_modules` on server** - Don't upload it
- ✅ **Restart server after upload** - Changes won't apply until restart
- ✅ **Check logs** - Monitor for any errors after deployment

## Rollback (If needed)

If something goes wrong:
```bash
# Revert to previous version
git checkout HEAD~1 src/services/twilioService.js
# Or restore from backup
```

## Support

If deployment fails:
1. Check server logs
2. Verify Node.js version (>=18.0.0)
3. Check environment variables
4. Verify database connection

