# Comprehensive API Test Report

**Generated:** 2025-12-20T20:40:12.794Z

**Local URL:** http://localhost:5000/api
**Live URL:** https://api.mazaadati.com/api

## Summary

- **Local APIs Working:** 27/31 (87.1%)
- **Live APIs Working:** 19/31 (61.3%)
- **Issues Found:** 8

## ⚠️ Critical Issues

The following APIs work on LOCAL but NOT on LIVE:

### 1. Register User

- **Endpoint:** `POST /auth/register`
- **Local Status:** ✅ 201
- **Live Status:** ❌ 400
- **Error:** ```json
{
  "success": false,
  "message": "User with this phone or email already exists"
}
```

### 2. Get Products

- **Endpoint:** `GET /admin/products`
- **Local Status:** ✅ 200
- **Live Status:** ❌ 500
- **Error:** ```json
{
  "error": "Failed to fetch products"
}
```

### 3. Get Pending Products

- **Endpoint:** `GET /admin/products/pending`
- **Local Status:** ✅ 200
- **Live Status:** ❌ 500
- **Error:** ```json
{
  "error": "Failed to fetch pending products"
}
```

### 4. Get Live Auctions

- **Endpoint:** `GET /admin/products/live`
- **Local Status:** ✅ 200
- **Live Status:** ❌ 500
- **Error:** ```json
{
  "error": "Failed to fetch live auctions"
}
```

### 5. Get Rejected Products

- **Endpoint:** `GET /admin/products/rejected`
- **Local Status:** ✅ 200
- **Live Status:** ❌ 500
- **Error:** ```json
{
  "error": "Failed to fetch rejected products"
}
```

### 6. Get Completed Products

- **Endpoint:** `GET /admin/products/completed`
- **Local Status:** ✅ 200
- **Live Status:** ❌ 500
- **Error:** ```json
{
  "error": "Failed to fetch completed products"
}
```

### 7. Get Orders

- **Endpoint:** `GET /admin/orders`
- **Local Status:** ✅ 200
- **Live Status:** ❌ 500
- **Error:** ```json
{
  "error": "Failed to fetch orders"
}
```

### 8. Get Top Products

- **Endpoint:** `GET /admin/analytics/top-products`
- **Local Status:** ✅ 200
- **Live Status:** ❌ 500
- **Error:** ```json
{
  "error": "Failed to fetch top products"
}
```

## Detailed API Status

| API Name | Method | Endpoint | Local | Live | Status |
|----------|--------|----------|-------|------|--------|
| Register User | POST | /auth/register | ✅ | ❌ | ⚠️ Local Only |
| Send OTP | POST | /auth/send-otp | ✅ | ✅ | ✅ Both |
| Verify OTP | POST | /auth/verify-otp | ✅ | ✅ | ✅ Both |
| Login | POST | /auth/login | ❌ | ❌ | ❌ Both Failed |
| Admin Login | POST | /auth/admin-login | ✅ | ✅ | ✅ Both |
| Get Dashboard | GET | /admin/dashboard | ✅ | ✅ | ✅ Both |
| Get Dashboard Charts | GET | /admin/dashboard/charts | ✅ | ✅ | ✅ Both |
| Get Dashboard Categories | GET | /admin/dashboard/categories | ✅ | ✅ | ✅ Both |
| Get Users | GET | /admin/users | ❌ | ❌ | ❌ Both Failed |
| Get User By ID | GET | /admin/users/:id | ❌ | ❌ | ❌ Both Failed |
| Create User | POST | /admin/users | ❌ | ❌ | ❌ Both Failed |
| Update User Role | PUT | /admin/users/:id/role | ✅ | ✅ | ✅ Both |
| Get Products | GET | /admin/products | ✅ | ❌ | ⚠️ Local Only |
| Get Pending Products | GET | /admin/products/pending | ✅ | ❌ | ⚠️ Local Only |
| Get Live Auctions | GET | /admin/products/live | ✅ | ❌ | ⚠️ Local Only |
| Get Rejected Products | GET | /admin/products/rejected | ✅ | ❌ | ⚠️ Local Only |
| Get Completed Products | GET | /admin/products/completed | ✅ | ❌ | ⚠️ Local Only |
| Get Product By ID | GET | /admin/products/:id | ❌ | ❌ | ❌ Both Failed |
| Get Orders | GET | /admin/orders | ✅ | ❌ | ⚠️ Local Only |
| Get Order Stats | GET | /admin/orders/stats | ✅ | ✅ | ✅ Both |
| Get Weekly Analytics | GET | /admin/analytics/weekly | ✅ | ✅ | ✅ Both |
| Get Monthly Analytics | GET | /admin/analytics/monthly | ✅ | ✅ | ✅ Both |
| Get Category Analytics | GET | /admin/analytics/categories | ✅ | ✅ | ✅ Both |
| Get Top Products | GET | /admin/analytics/top-products | ✅ | ❌ | ⚠️ Local Only |
| Get Active Auctions | GET | /admin/auctions/active | ✅ | ✅ | ✅ Both |
| Get Auction Bids | GET | /admin/auctions/:id/bids | ✅ | ✅ | ✅ Both |
| Get Notifications | GET | /admin/notifications | ✅ | ✅ | ✅ Both |
| Get Payments | GET | /admin/payments | ✅ | ✅ | ✅ Both |
| Get Referrals | GET | /admin/referrals | ✅ | ✅ | ✅ Both |
| Get Referral Settings | GET | /admin/referral/settings | ✅ | ✅ | ✅ Both |
| Get Wallet Logs | GET | /admin/wallet/logs | ✅ | ✅ | ✅ Both |
| Get Banners | GET | /banners | ✅ | ✅ | ✅ Both |
