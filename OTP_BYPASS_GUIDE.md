# 🔧 OTP Bypass for Development

## Overview

This feature allows you to temporarily disable OTP verification for development purposes. When enabled, Twilio calls are completely skipped and any OTP will be accepted.

## ⚠️ IMPORTANT

**This feature is for DEVELOPMENT ONLY.**
- **NEVER** enable this in production
- **NEVER** commit `.env` with `OTP_BYPASS=true` to production
- Always verify `OTP_BYPASS` is not set in production environment

## Setup

### 1. Add to `.env` file

```env
# Development OTP Bypass (DO NOT USE IN PRODUCTION)
OTP_BYPASS=true
```

### 2. Restart Backend Server

```bash
cd "Bid app Backend"
npm start
```

## How It Works

### When `OTP_BYPASS=true`:

#### `/api/auth/send-otp`
- ✅ **Skips Twilio completely**
- ✅ Returns: `{ success: true, message: "OTP disabled (dev mode)", otp: "0000" }`
- ✅ Console log: `⚠️ OTP DISABLED — DEVELOPMENT MODE ACTIVE`

#### `/api/auth/verify-otp`
- ✅ **Skips Twilio verification**
- ✅ **Accepts ANY OTP** (even "0000", "123456", etc.)
- ✅ Generates JWT tokens normally
- ✅ Returns user data normally
- ✅ Console log: `⚠️ OTP DISABLED — DEVELOPMENT MODE ACTIVE`

### When `OTP_BYPASS=false` or not set:
- ✅ Normal Twilio OTP flow
- ✅ Real OTP verification required
- ✅ Production-ready behavior

## Testing

### 1. Send OTP (Dev Mode)
```bash
curl -X POST http://localhost:5000/api/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"phone": "+9647700914000"}'
```

**Response:**
```json
{
  "success": true,
  "message": "OTP disabled (dev mode)",
  "otp": "0000"
}
```

### 2. Verify OTP (Dev Mode)
```bash
curl -X POST http://localhost:5000/api/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"phone": "+9647700914000", "otp": "0000"}'
```

**Response:**
```json
{
  "success": true,
  "accessToken": "eyJhbGci...",
  "refreshToken": "eyJhbGci...",
  "user": {
    "id": 1,
    "phone": "+9647700914000",
    "role": "buyer",
    ...
  }
}
```

**Note:** Any OTP will work (e.g., "123456", "000000", etc.)

## Console Logs

When OTP bypass is active, you'll see:
```
⚠️ OTP DISABLED — DEVELOPMENT MODE ACTIVE
   Skipping Twilio OTP send
   Phone: +9647700914000
```

And for verification:
```
⚠️ OTP DISABLED — DEVELOPMENT MODE ACTIVE
   Skipping Twilio OTP verification
   Accepting any OTP for development
   Phone: +9647700914000
   OTP provided: ***
```

## Disabling OTP Bypass

### Option 1: Remove from `.env`
```env
# Remove or comment out:
# OTP_BYPASS=true
```

### Option 2: Set to false
```env
OTP_BYPASS=false
```

Then restart the server.

## Production Checklist

Before deploying to production:

- [ ] `OTP_BYPASS` is NOT in `.env` file
- [ ] `OTP_BYPASS` is NOT set in production environment variables
- [ ] Test OTP flow with real Twilio credentials
- [ ] Verify Twilio is working correctly
- [ ] Check server logs for "OTP DISABLED" messages (should NOT appear)

## Security Notes

1. **Never commit `.env` with `OTP_BYPASS=true`**
2. **Use `.gitignore` to exclude `.env` files**
3. **Review environment variables before deployment**
4. **Monitor logs for bypass activation in production**

## Troubleshooting

### Issue: OTP still going through Twilio

**Check:**
1. Is `OTP_BYPASS=true` in `.env`?
2. Did you restart the server after adding it?
3. Check server logs for "OTP DISABLED" message

### Issue: OTP verification still failing

**Check:**
1. Verify `OTP_BYPASS=true` is set correctly
2. Check server logs for bypass activation
3. Restart server if needed

### Issue: Want to test with real OTP

**Solution:**
1. Remove `OTP_BYPASS` from `.env` or set to `false`
2. Restart server
3. Use real Twilio OTP flow

