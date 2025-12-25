# Postman Collection - BidMaster 88 APIs

## 📦 Collection File
**File Name**: `BidMaster_88_APIs.postman_collection.json`

## 🚀 How to Import in Postman

1. Open Postman
2. Click **Import** button (top left)
3. Select **File** tab
4. Choose `BidMaster_88_APIs.postman_collection.json`
5. Click **Import**

## 🔧 Environment Variables Setup

After importing, set up environment variables:

### Option 1: Create Environment in Postman
1. Click **Environments** (left sidebar)
2. Click **+** to create new environment
3. Name it: `BidMaster Local` or `BidMaster Production`
4. Add these variables:

| Variable | Initial Value | Current Value |
|----------|--------------|---------------|
| `base_url` | `https://api.mazaadati.com/api` | `https://api.mazaadati.com/api` |
| `admin_token` | `your_admin_token_here` | `your_admin_token_here` |
| `mobile_token` | `your_mobile_token_here` | `your_mobile_token_here` |

5. Select the environment from dropdown (top right)

### Option 2: Use Collection Variables
Collection already has default variables. You can update them:
1. Right-click collection → **Edit**
2. Go to **Variables** tab
3. Update values:
   - `base_url`: `https://api.mazaadati.com/api` (Live Production URL)
   - `admin_token`: Your admin JWT token
   - `mobile_token`: Your mobile app JWT token

## 📋 Collection Structure

### Total APIs: 88

1. **Auth APIs (11)**
   - Send OTP, Verify OTP, Register, Login, Admin Login, etc.

2. **Admin - Users (9)**
   - Get Users, Create User, Update User, Delete User, etc.

3. **Admin - Dashboard (3)**
   - Get Dashboard, Get Charts, Get Categories

4. **Admin - Products (11)**
   - Get Products, Pending Products, Approve/Reject, etc.

5. **Admin - Orders (3)**
   - Get Orders, Get Stats, Update Status

6. **Admin - Analytics (4)**
   - Weekly, Monthly, Categories, Top Products

7. **Admin - Auctions (3)**
   - Active Auctions, Bids, Winner

8. **Admin - Notifications (1)**
   - Get Notifications

9. **Admin - Payments (1)**
   - Get Payments

10. **Admin - Settings (2)**
    - Get Logo, Upload Logo

11. **Admin - Referrals (5)**
    - Get Referrals, Revoke, Settings

12. **Admin - Wallet (1)**
    - Get Wallet Logs

13. **Admin - Seller Earnings (1)**
    - Get Seller Earnings

14. **Products - Mobile (8)**
    - Get All, Get By ID, Create, Update, Delete

15. **Bids (3)**
    - Place Bid, Get My Bids, Get By Product

16. **Auctions (2)**
    - Get Winner, Get Seller Winner

17. **Orders (2)**
    - Create Order, Get My Orders

18. **Notifications (2)**
    - Get Notifications, Mark Read

19. **Categories (5)**
    - Get All, Get By ID, Create, Update, Delete

20. **Banners (5)**
    - Get All, Get By ID, Create, Update, Delete

21. **Referrals (2)**
    - Get My Code, Get History

22. **Wallet (1)**
    - Get Wallet

23. **Buyer Bidding History (1)**
    - Get History

24. **Seller Earnings (1)**
    - Get Earnings

25. **Uploads (2)**
    - Upload Image, Upload Images

## 🔑 Authentication

### Admin APIs
- Use `{{admin_token}}` in Authorization header
- Format: `Bearer {{admin_token}}`

### Mobile APIs
- Use `{{mobile_token}}` in Authorization header
- Format: `Bearer {{mobile_token}}`

### Public APIs
- No authentication required (e.g., Get All Products, Get Categories)

## 📝 Notes

1. **File Upload APIs**: 
   - Upload Logo, Upload Image, Upload Images require actual file uploads
   - Use Postman's form-data with file type

2. **Dynamic IDs**:
   - Many APIs use `:id` path variables
   - Update these in the URL or use Postman variables

3. **Test Data**:
   - Sample request bodies are included
   - Update with actual data before testing

4. **Environment**:
   - **Live Production**: `https://api.mazaadati.com/api` (Default in collection)
   - Local: `http://localhost:5000/api` (Change if needed)

## ✅ Testing Checklist

- [ ] Import collection in Postman
- [ ] Set up environment variables
- [ ] Update `admin_token` with valid token
- [ ] Update `mobile_token` with valid token
- [ ] Update `base_url` for your environment
- [ ] Test a few APIs to verify setup
- [ ] Share collection with DevOps team

## 📧 Support

For issues or questions, contact the development team.

---

**Last Updated**: 2025-12-20
**Version**: 1.0
**Total APIs**: 88

