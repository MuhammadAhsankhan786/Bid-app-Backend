# 📬 Postman Collection Guide - BidMaster APIs

## 🚀 Postman Collection Kaise Import Karein

### Step 1: Postman Open Karein
1. Postman application install karein (agar nahi hai): https://www.postman.com/downloads/
2. Postman desktop app ya web version open karein

### Step 2: Collection Import Karein
1. Postman mein **"Import"** button click karein (top left corner)
2. Ya **File → Import** menu se import karein
3. **"Upload Files"** tab select karein
4. File select karein: `BidMaster_88_APIs.postman_collection.json`
5. **"Import"** button click karein

### Step 3: Environment Variables Set Karein
Collection import hone ke baad, **Environment Variables** set karein:

1. Top right corner mein **"Environments"** dropdown se **"Add"** click karein
2. Environment name: `BidMaster Local` ya `BidMaster Production`
3. Variables add karein:

| Variable Name | Initial Value | Current Value |
|--------------|---------------|---------------|
| `base_url` | `http://localhost:3000/api` | `http://localhost:3000/api` |
| `admin_token` | (empty - login ke baad set karein) | (empty) |
| `user_token` | (empty - login ke baad set karein) | (empty) |

4. **"Save"** click karein
5. Top right corner se environment select karein

### Step 4: Token Set Karein
1. **"1. Auth APIs"** folder mein jayein
2. **"Admin Login"** ya **"Login"** request run karein
3. Response se `token` copy karein
4. Environment variables mein:
   - Agar admin login kiya: `admin_token` = `Bearer <token>`
   - Agar user login kiya: `user_token` = `Bearer <token>`

---

## 📋 Collection Structure

### 1. Auth APIs (11 endpoints)
- Send OTP
- Verify OTP
- Register User
- Login
- Admin Login
- Login Phone
- Refresh Token
- Get Profile
- Update Profile
- Send Change Phone OTP
- Verify Change Phone

### 2. Admin - Users (9 endpoints)
- Get Users
- Get User By ID
- Create User
- Update User
- Delete User
- Update User Role
- Approve User
- Block User

### 3. Admin - Dashboard (3 endpoints)
- Get Dashboard
- Get Dashboard Charts
- Get Dashboard Categories

### 4. Admin - Products (12 endpoints) ⭐ **UPDATED**
- **Create Company Product** ⭐ **NEW** (POST /admin/products)
- Get Products
- Get Pending Products
- Get Live Auctions
- Get Rejected Products
- Get Completed Products
- Get Product By ID
- Approve Product
- Reject Product
- Update Product
- Delete Product
- Get Product Documents

### 5. Admin - Orders (3 endpoints)
- Get Orders
- Get Order Stats
- Update Order Status

### 6. Admin - Analytics (4 endpoints)
- Get Weekly Analytics
- Get Monthly Analytics
- Get Category Distribution
- Get Top Products

### 7. Admin - Auctions (3 endpoints)
- Get Active Auctions
- Get Auction Bids
- Get Auction Winner

### 8. Admin - Notifications (1 endpoint)
- Get All Notifications

### 9. Admin - Settings (2 endpoints)
- Upload Logo
- Get Logo

### 10. Admin - Referrals (5 endpoints)
- Get Referrals
- Revoke Referral
- Adjust Reward Balance
- Get Referral Settings
- Update Referral Settings

### 11. Admin - Wallet (1 endpoint)
- Get Wallet Logs

### 12. Admin - Seller Earnings (1 endpoint)
- Get Seller Earnings

### 13. Bids - Mobile (5 endpoints)
- Place Bid
- Get My Bids
- Get Bids By Product
- Get Highest Bid
- Cancel Bid

### 14. Products - Mobile (8 endpoints)
- Get All Products
- Get Product By ID
- Get My Products
- Get Seller Products
- Create Product (Seller)
- Create Seller Product
- Update Product
- Delete Product

### 15. Orders - Mobile (4 endpoints)
- Create Order
- Get My Orders
- Get Order By ID
- Update Order Status

### 16. Notifications - Mobile (3 endpoints)
- Get My Notifications
- Mark Notification Read
- Mark All Notifications Read

### 17. Wishlist - Mobile (4 endpoints)
- Add to Wishlist
- Remove from Wishlist
- Get Wishlist
- Check if in Wishlist

### 18. Referrals - Mobile (3 endpoints)
- Get Referral Code
- Get Referral History
- Use Referral Reward

---

## ✅ Routes Verification Checklist

### ✅ All Routes Are Correct:
1. **Auth Routes** - ✅ Working
2. **Admin Routes** - ✅ Working
3. **Mobile Routes** - ✅ Working
4. **New Route Added**: POST /admin/products (Create Company Product) - ✅ Added

### 🔍 Routes Test Karne Ka Tarika:

1. **Base URL Check:**
   - Environment variable `base_url` set hai
   - Format: `http://localhost:3000/api` ya production URL

2. **Authentication Check:**
   - Pehle login karein
   - Token environment variable mein save karein
   - Har request mein `Authorization: Bearer {{token}}` header automatically add hoga

3. **Request Test:**
   - Request select karein
   - **"Send"** button click karein
   - Response check karein:
     - ✅ Status: 200/201 = Success
     - ❌ Status: 400/401/403/404/500 = Error

---

## 🆕 New Endpoint: Create Company Product

### Endpoint Details:
- **Method:** POST
- **URL:** `/admin/products`
- **Authorization:** Required (Admin/Moderator/Employee token)
- **Location in Collection:** `4. Admin - Products → Create Company Product`

### Request Body:
```json
{
  "title": "Company Product Title",
  "description": "Product description here",
  "images": [
    "https://example.com/image1.jpg",
    "https://example.com/image2.jpg"
  ],
  "startingPrice": 100,
  "duration": 1,
  "category_id": 1
}
```

### Response (Success):
```json
{
  "success": true,
  "message": "Company product created successfully and pending approval",
  "product": {
    "id": 123,
    "seller_id": null,
    "title": "Company Product Title",
    "status": "pending",
    ...
  }
}
```

### Important Notes:
- ✅ `seller_id` automatically `null` set hoga (company product)
- ✅ Only employees, moderators, and superadmins can create
- ✅ Product status: `pending` (needs approval)
- ✅ Duration: 1, 2, or 3 days only
- ✅ Images: At least 1, maximum 6

---

## 🐛 Common Issues & Solutions

### Issue 1: "Unauthorized" Error
**Solution:**
- Token expire ho gaya hai
- Naya login karein aur token update karein
- Environment variable check karein

### Issue 2: "base_url not found"
**Solution:**
- Environment select karein (top right corner)
- `base_url` variable check karein

### Issue 3: "Invalid JSON"
**Solution:**
- Request body mein JSON format check karein
- Commas aur quotes properly check karein

### Issue 4: "Route not found"
**Solution:**
- Backend server running hai?
- Base URL correct hai?
- Route path check karein

---

## 📝 Testing Tips

1. **Sequential Testing:**
   - Pehle Auth APIs test karein (login)
   - Phir token set karein
   - Phir baaki APIs test karein

2. **Environment Switching:**
   - Local testing: `http://localhost:3000/api`
   - Production testing: Production URL

3. **Save Responses:**
   - Important responses ko save karein
   - Examples ke liye use karein

4. **Collection Runner:**
   - Multiple requests ek saath run karne ke liye
   - **Collection → Run** use karein

---

## 📞 Support

Agar koi issue ho to:
1. Request/Response details check karein
2. Backend logs check karein
3. Environment variables verify karein
4. Token validity check karein

---

**Last Updated:** Collection updated with new "Create Company Product" endpoint
**Total Endpoints:** 89 (was 88, +1 new)




