# Comprehensive API Test Report

**Generated:** 2025-12-20T19:55:15.091Z

**Local URL:** http://localhost:5000/api
**Live URL:** https://api.mazaadati.com/api

## Summary

- **Local APIs Working:** 0/31 (0.0%)
- **Live APIs Working:** 20/31 (64.5%)
- **Issues Found:** 0

## Detailed API Status

| API Name | Method | Endpoint | Local | Live | Status |
|----------|--------|----------|-------|------|--------|
| Register User | POST | /auth/register | ❌ | ✅ | ℹ️ Live Only |
| Send OTP | POST | /auth/send-otp | ❌ | ✅ | ℹ️ Live Only |
| Verify OTP | POST | /auth/verify-otp | ❌ | ✅ | ℹ️ Live Only |
| Login | POST | /auth/login | ❌ | ❌ | ❌ Both Failed |
| Admin Login | POST | /auth/admin-login | ❌ | ✅ | ℹ️ Live Only |
| Get Dashboard | GET | /admin/dashboard | ❌ | ✅ | ℹ️ Live Only |
| Get Dashboard Charts | GET | /admin/dashboard/charts | ❌ | ✅ | ℹ️ Live Only |
| Get Dashboard Categories | GET | /admin/dashboard/categories | ❌ | ✅ | ℹ️ Live Only |
| Get Users | GET | /admin/users | ❌ | ❌ | ❌ Both Failed |
| Get User By ID | GET | /admin/users/:id | ❌ | ❌ | ❌ Both Failed |
| Create User | POST | /admin/users | ❌ | ❌ | ❌ Both Failed |
| Update User Role | PUT | /admin/users/:id/role | ❌ | ✅ | ℹ️ Live Only |
| Get Products | GET | /admin/products | ❌ | ❌ | ❌ Both Failed |
| Get Pending Products | GET | /admin/products/pending | ❌ | ❌ | ❌ Both Failed |
| Get Live Auctions | GET | /admin/products/live | ❌ | ❌ | ❌ Both Failed |
| Get Rejected Products | GET | /admin/products/rejected | ❌ | ❌ | ❌ Both Failed |
| Get Completed Products | GET | /admin/products/completed | ❌ | ❌ | ❌ Both Failed |
| Get Product By ID | GET | /admin/products/:id | ❌ | ❌ | ❌ Both Failed |
| Get Orders | GET | /admin/orders | ❌ | ❌ | ❌ Both Failed |
| Get Order Stats | GET | /admin/orders/stats | ❌ | ✅ | ℹ️ Live Only |
| Get Weekly Analytics | GET | /admin/analytics/weekly | ❌ | ✅ | ℹ️ Live Only |
| Get Monthly Analytics | GET | /admin/analytics/monthly | ❌ | ✅ | ℹ️ Live Only |
| Get Category Analytics | GET | /admin/analytics/categories | ❌ | ✅ | ℹ️ Live Only |
| Get Top Products | GET | /admin/analytics/top-products | ❌ | ❌ | ❌ Both Failed |
| Get Active Auctions | GET | /admin/auctions/active | ❌ | ✅ | ℹ️ Live Only |
| Get Auction Bids | GET | /admin/auctions/:id/bids | ❌ | ✅ | ℹ️ Live Only |
| Get Notifications | GET | /admin/notifications | ❌ | ✅ | ℹ️ Live Only |
| Get Payments | GET | /admin/payments | ❌ | ✅ | ℹ️ Live Only |
| Get Referrals | GET | /admin/referrals | ❌ | ✅ | ℹ️ Live Only |
| Get Referral Settings | GET | /admin/referral/settings | ❌ | ✅ | ℹ️ Live Only |
| Get Wallet Logs | GET | /admin/wallet/logs | ❌ | ✅ | ℹ️ Live Only |
| Get Banners | GET | /banners | ❌ | ✅ | ℹ️ Live Only |
