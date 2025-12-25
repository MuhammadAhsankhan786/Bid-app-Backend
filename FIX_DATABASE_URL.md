# 🔧 Fix DATABASE_URL Issue

## Problem
Script is failing because `DATABASE_URL` is not set in `.env` file.

**Error**: `DATABASE_URL: NOT SET`

## ✅ Solution

### Step 1: Check Current .env

```bash
cd "Bid app Backend"
node check-env.js
```

Yeh script dikhayega ke kya missing hai.

### Step 2: Add DATABASE_URL to .env

`.env` file me `DATABASE_URL` add karein:

```env
DATABASE_URL=postgresql://username:password@host:port/database
```

**Example**:
```env
DATABASE_URL=postgresql://user:pass@localhost:5432/bidmaster
```

Ya agar Neon PostgreSQL use kar rahe hain:
```env
DATABASE_URL=postgresql://user:pass@ep-xxx.region.aws.neon.tech/dbname?sslmode=require
```

### Step 3: Complete .env File

```env
DATABASE_URL=your_postgresql_connection_string_here
ADMIN_PHONE=+9647500914000
ADMIN_PASSWORD=admin123
BASE_URL=http://localhost:5000/api
```

### Step 4: Run Script Again

```bash
node update-admin-phones.js
```

---

## 🔍 Find DATABASE_URL

Agar aapko nahi pata ke DATABASE_URL kya hai:

1. **Check existing .env file** (agar hai)
2. **Check backend server logs** - startup me DATABASE_URL dikhta hai
3. **Check database provider** (Neon, Supabase, etc.) - connection string milta hai
4. **Check server.js or app.js** - waha bhi DATABASE_URL use hota hai

---

## 📝 Quick Fix

Agar aapke paas DATABASE_URL hai, to:

```bash
cd "Bid app Backend"

# Create/update .env
echo "DATABASE_URL=your_connection_string_here" > .env
echo "ADMIN_PHONE=+9647500914000" >> .env
echo "ADMIN_PASSWORD=admin123" >> .env
echo "BASE_URL=http://localhost:5000/api" >> .env

# Verify
node check-env.js

# Run update
node update-admin-phones.js
```

---

## ⚠️ Important

- `DATABASE_URL` me sensitive information hai - never commit to git!
- `.env` file should be in `.gitignore`
- Connection string format: `postgresql://user:password@host:port/database`

---

## 🆘 Still Having Issues?

1. **Check database is running**: Make sure PostgreSQL server is accessible
2. **Check connection string format**: Must start with `postgresql://` or `postgres://`
3. **Check credentials**: Username, password, host, port, database name must be correct
4. **Check network**: Firewall or VPN might be blocking connection

