# Fix Bid Placement 400 Error

## 🔴 Problem

**Error:** `400 Bad Request` when placing bid
- Product ID: 7
- Amount: 1000
- User ID: 53
- Role: buyer ✅

## ✅ Quick Fix

### Step 1: Debug Bid Placement

```bash
cd "Bid app Backend"
node src/scripts/test_bid_placement.js
```

Ye script check karega:
- Product exists?
- Product status approved?
- Auction ended?
- User is seller?
- Bid amount valid?

### Step 2: Common Issues & Fixes

#### Issue 1: Product Status Not Approved
```sql
-- Check product status
SELECT id, title, status FROM products WHERE id = 7;

-- Fix: Update status to approved
UPDATE products 
SET status = 'approved' 
WHERE id = 7;
```

#### Issue 2: Auction Ended
```sql
-- Check auction end time
SELECT id, title, auction_end_time, 
       CASE 
         WHEN auction_end_time < NOW() THEN 'Ended'
         ELSE 'Active'
       END as status
FROM products WHERE id = 7;

-- Fix: Extend auction end time
UPDATE products 
SET auction_end_time = NOW() + INTERVAL '7 days'
WHERE id = 7;
```

#### Issue 3: Bid Amount Too Low
```sql
-- Check current bid
SELECT id, title, current_bid, starting_bid 
FROM products WHERE id = 7;

-- Fix: Use higher bid amount
-- Minimum bid = current_bid + 1 (or starting_bid if no current bid)
```

#### Issue 4: User is Seller
```sql
-- Check if user is seller
SELECT p.id, p.title, p.seller_id, u.id as user_id
FROM products p
JOIN users u ON u.id = 53
WHERE p.id = 7 AND p.seller_id = u.id;

-- If returns row, user is seller (cannot bid)
```

### Step 3: Test Bid Placement

```bash
# Get token first (from login)
TOKEN="your_access_token_here"

# Test bid placement
curl -X POST http://localhost:5000/api/bids/place \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "productId": 7,
    "amount": 1000
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Bid placed successfully",
  "data": {
    "id": "...",
    "product_id": 7,
    "user_id": 53,
    "amount": 1000
  }
}
```

## 🔍 Debug Queries

### Check Product Details
```sql
SELECT 
  id,
  title,
  status,
  seller_id,
  current_bid,
  starting_bid,
  auction_end_time,
  CASE 
    WHEN status != 'approved' THEN '❌ Not Approved'
    WHEN auction_end_time < NOW() THEN '❌ Auction Ended'
    ELSE '✅ Ready for Bidding'
  END as bid_status
FROM products 
WHERE id = 7;
```

### Check Current Bids
```sql
SELECT 
  b.id,
  b.product_id,
  b.user_id,
  b.amount,
  u.name as bidder_name,
  b.created_at
FROM bids b
JOIN users u ON b.user_id = u.id
WHERE b.product_id = 7
ORDER BY b.amount DESC
LIMIT 5;
```

## ✅ After Fix

1. ✅ Product status is `approved`
2. ✅ Auction is active (not ended)
3. ✅ User is not the seller
4. ✅ Bid amount > current bid
5. ✅ Bid placement successful

**Pehle debug script run karo, phir issues fix karo!**

