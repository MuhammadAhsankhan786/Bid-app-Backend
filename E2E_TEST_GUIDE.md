# End-to-End Product Lifecycle Test Guide

## Overview

This automated test script verifies the complete product lifecycle flow:
1. **Seller** uploads image and creates product (status: pending)
2. **Admin** approves product (status: approved)
3. **Buyer** sees approved product in product list

## Prerequisites

1. **Backend server running:**
   ```bash
   cd "Bid app Backend"
   npm run dev
   # Server should be running on http://localhost:5000
   ```

2. **Database connected:**
   - PostgreSQL database must be running
   - Connection configured in `.env` file

3. **Test users exist:**
   - At least one user with `role = 'seller'` and `status = 'approved'`
   - At least one user with `role = 'superadmin'` or `role = 'admin'` and `status = 'approved'`
   - At least one user with `role = 'buyer'` and `status = 'approved'`

   If users don't exist, run:
   ```bash
   npm run seed:mock
   ```

4. **Dependencies installed:**
   ```bash
   npm install
   ```

## Running the Test

### Option 1: Using npm script
```bash
cd "Bid app Backend"
npm run test:e2e
```

### Option 2: Direct execution
```bash
cd "Bid app Backend"
node src/scripts/e2e_product_lifecycle_test.js
```

## Test Steps

The test automatically performs these steps:

### Step 1: Upload Image
- Creates a test PNG image
- Uploads to `/api/uploads/image`
- Verifies upload success and receives image URL

### Step 2: Create Product (Seller)
- Creates product with:
  - Title: "Test Watch"
  - Description: "Automatic test product created by E2E automation test"
  - Price: $2500
  - Image: Uploaded image URL
  - Duration: 7 days
- Verifies status is `pending`

### Step 3: Verify Product in Database
- Queries database directly
- Confirms product exists with `status = 'pending'`
- Verifies all fields are correct

### Step 4: Admin Approves Product
- Calls `/api/admin/products/approve/:id`
- Verifies approval success

### Step 5: Verify Status Changed
- Queries database again
- Confirms status changed to `approved`
- Verifies `auction_end_time` is set

### Step 6: Verify Admin Pending List
- Fetches `/api/admin/products/pending`
- Verifies product no longer appears (or appears as approved)

### Step 7: Buyer Fetches Products
- Calls `/api/products` (public endpoint)
- Verifies test product appears in list
- Confirms status is `approved`
- Verifies image URL is accessible
- Confirms NO pending products are visible

### Step 8: Database Consistency Check
- Final database query
- Verifies all fields are correct
- Checks auction timer is active

## Expected Output

### Success Output
```
🚀 BIDMASTER E2E PRODUCT LIFECYCLE TEST
============================================================
Base URL: http://localhost:5000/api
Timestamp: 2024-01-15T10:30:00.000Z

📋 Getting Test Users
   Seller: Test Seller (ID: 1, Phone: +9647701234567)
   Admin: Admin User (ID: 2, Phone: +9647701234568)
   Buyer: Test Buyer (ID: 3, Phone: +9647701234569)

📸 STEP 1: Uploading Product Image
============================================================
✅ Image Uploaded Successfully
   Status Code: 200
   Filename: test-product-1234567890.png
   Image URL: http://localhost:5000/uploads/products/test-product-1234567890.png

📦 STEP 2: Creating Product as Seller
============================================================
✅ Product Created Successfully
   Status Code: 201
   Product ID: 123
   Title: Test Watch
   Status: pending
   Starting Price: $2500

🔍 STEP 3: Verifying Product in Database
============================================================
✅ Product Found in Database
   Product ID: 123
   Title: Test Watch
   Status: pending ✅

✅ STEP 4: Admin Approving Product
============================================================
✅ Product Approved Successfully
   Status Code: 200
   Status: approved

🔍 STEP 5: Verifying Product Status Changed to Approved
============================================================
✅ Product Status Verification
   Status: approved ✅

🛒 STEP 7: Buyer Fetching Approved Products
============================================================
✅ Products Retrieved Successfully
   Total Products: 10
   Approved Products: 10
   Pending Products: 0
✅ Test Product Found in Buyer List
   Product ID: 123
   Title: Test Watch
   Status: approved ✅

📊 TEST SUMMARY
============================================================
Overall Success: ✅ PASSED

Layer Status:
  Seller Layer: ✅ Working perfectly
  Admin Layer: ✅ Working perfectly
  Buyer Layer: ✅ Working perfectly
  Image Upload: ✅ Working perfectly

Product ID: 123
```

### Failure Output
If any step fails, you'll see:
```
❌ Failed to create product
   Status Code: 403
   Error: Only sellers can create products
```

## Test Report

After execution, a detailed JSON report is saved to:
```
Bid app Backend/logs/e2e_test_report.json
```

The report includes:
- Timestamp and base URL
- Results of each step
- Success/failure status
- Error messages (if any)
- Summary of all layers

## Troubleshooting

### Error: "No seller user found"
**Solution:** Run `npm run seed:mock` to create test users

### Error: "Connection refused"
**Solution:** Make sure backend server is running on port 5000

### Error: "JWT_SECRET not found"
**Solution:** Check `.env` file has `JWT_SECRET` defined

### Error: "Image upload failed"
**Solution:** 
- Check `uploads/products/` directory exists and is writable
- Verify multer is properly configured
- Check file size limits (5MB max)

### Error: "403 Forbidden"
**Solution:**
- Verify user roles in database match expected values
- Check JWT token is valid
- Ensure user status is 'approved'

## Database Verification

After test completion, you can manually verify:

```sql
-- Check the test product
SELECT id, title, status, image_url, seller_id, created_at, updated_at 
FROM products 
WHERE title = 'Test Watch' 
ORDER BY id DESC 
LIMIT 1;

-- Verify status flow
SELECT status, COUNT(*) 
FROM products 
GROUP BY status;
```

## Cleanup

The test creates a real product in the database. To clean up:

```sql
DELETE FROM products WHERE title = 'Test Watch';
```

Or use the admin panel to delete the test product.

## Continuous Integration

This test can be integrated into CI/CD pipelines:

```yaml
# Example GitHub Actions
- name: Run E2E Test
  run: |
    cd "Bid app Backend"
    npm run test:e2e
```

## Notes

- The test uses real database connections and API calls
- Test products are created with actual data
- Image files are stored in `uploads/products/` directory
- Test creates a minimal valid PNG image if test image doesn't exist
- All API calls use JWT authentication
- Test verifies both API responses and database state

---

**Last Updated:** 2024-01-15  
**Version:** 1.0







