# Banner API Testing Guide

## ✅ Code Verification Complete

All files have been verified:
- ✅ `src/controllers/bannerController.js` - No syntax errors
- ✅ `src/Routes/bannerRoutes.js` - No syntax errors  
- ✅ `src/server.js` - No syntax errors
- ✅ Routes registered correctly

## 🚀 Quick Test Steps

### Step 1: Run Database Migration

```bash
# Option 1: Using psql directly
psql -d your_database_name -f src/scripts/create_banners_table.sql

# Option 2: Using Node.js (if you have a migration runner)
node -e "const { Pool } = require('pg'); const fs = require('fs'); const pool = new Pool({ connectionString: process.env.DATABASE_URL }); pool.query(fs.readFileSync('src/scripts/create_banners_table.sql', 'utf8')).then(() => { console.log('✅ Migration complete'); process.exit(0); });"
```

### Step 2: Start Backend Server

```bash
cd "D:\New folder (2)\Main folder\Bid app Backend"
npm run dev
# or
npm start
```

### Step 3: Test API Endpoints

#### Test 1: Get All Banners (Public - No Auth Required)

```bash
# Using curl
curl http://localhost:5000/api/banners

# Using PowerShell
Invoke-RestMethod -Uri "http://localhost:5000/api/banners" -Method GET
```

**Expected Response:**
```json
{
  "success": true,
  "data": []
}
```

#### Test 2: Create Banner (Admin Only)

**First, get admin token from your admin login endpoint, then:**

```bash
# Using curl (with admin token)
curl -X POST http://localhost:5000/api/banners \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "imageUrl": "https://images.unsplash.com/photo-1606761568499-6d45d7a523c5?w=1920&h=600&fit=crop&q=100&auto=format",
    "title": "Test Banner",
    "link": "/products?category=electronics",
    "displayOrder": 1,
    "isActive": true
  }'

# Using PowerShell
$headers = @{
    "Authorization" = "Bearer YOUR_ADMIN_TOKEN"
    "Content-Type" = "application/json"
}
$body = @{
    imageUrl = "https://images.unsplash.com/photo-1606761568499-6d45d7a523c5?w=1920&h=600&fit=crop&q=100&auto=format"
    title = "Test Banner"
    link = "/products?category=electronics"
    displayOrder = 1
    isActive = $true
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:5000/api/banners" -Method POST -Headers $headers -Body $body
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Banner created successfully",
  "data": {
    "id": 1,
    "imageUrl": "https://images.unsplash.com/...",
    "title": "Test Banner",
    "link": "/products?category=electronics",
    "isActive": true,
    "displayOrder": 1,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

#### Test 3: Get Single Banner

```bash
curl http://localhost:5000/api/banners/1
```

#### Test 4: Update Banner

```bash
curl -X PUT http://localhost:5000/api/banners/1 \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Updated Banner",
    "isActive": false
  }'
```

#### Test 5: Delete Banner

```bash
curl -X DELETE http://localhost:5000/api/banners/1 \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

## 🧪 Automated Test Script

Run the automated test script:

```bash
cd "D:\New folder (2)\Main folder\Bid app Backend"

# Set admin token in .env file first
# ADMIN_TOKEN=your_admin_token_here

# Run test script
node src/scripts/test_banner_api.js
```

## 📋 Manual Testing Checklist

- [ ] Database migration run successfully
- [ ] Server starts without errors
- [ ] GET /api/banners returns empty array (no banners yet)
- [ ] POST /api/banners creates banner (with admin token)
- [ ] GET /api/banners returns created banner
- [ ] GET /api/banners/:id returns single banner
- [ ] PUT /api/banners/:id updates banner
- [ ] DELETE /api/banners/:id deletes banner
- [ ] Public users can only see active banners
- [ ] Admin users can see all banners (including inactive)

## 🔍 Verify Routes are Registered

Check server logs when starting:
```
🚀 Server running on port 5000
```

Then test:
```bash
curl http://localhost:5000/api/banners
```

Should return JSON response (not 404).

## ⚠️ Common Issues

### Issue: 404 Not Found
**Solution:** Check if routes are registered in `src/server.js`

### Issue: 401 Unauthorized
**Solution:** Make sure admin token is valid and user has admin role

### Issue: Database Error
**Solution:** Run migration script first

### Issue: Cloudinary Error
**Solution:** Configure Cloudinary in `.env` file or use direct `imageUrl` in request

## ✅ Success Criteria

All tests pass when:
1. ✅ Public GET returns banners (empty array initially)
2. ✅ Admin POST creates banner successfully
3. ✅ Admin PUT updates banner successfully
4. ✅ Admin DELETE removes banner successfully
5. ✅ Flutter app can fetch banners from `/api/banners`

## 🎯 Next Steps

1. Run database migration
2. Start backend server
3. Test endpoints manually or use test script
4. Verify Flutter app fetches banners correctly

