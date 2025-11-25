#!/bin/bash
# =====================================================
# COPY-PASTE TEST COMMANDS - Complete Testing
# =====================================================

echo "🚀 Complete End-to-End Testing"
echo "================================="
echo ""

# Step 1: Database Fix
echo "📊 Step 1: Fixing Database..."
cd "Bid app Backend"
node src/scripts/create_admin_users_now.js
echo ""

# Step 2: Backend Health Check
echo "🏥 Step 2: Backend Health Check..."
curl -s http://localhost:5000/api/health | head -10
echo ""
echo ""

# Step 3: Test Super Admin Login
echo "🔐 Step 3: Testing Super Admin Login..."
curl -X POST http://localhost:5000/api/auth/admin-login \
  -H "Content-Type: application/json" \
  -d '{"phone": "+9647500914000", "role": "superadmin"}' \
  -s | head -20
echo ""
echo ""

# Step 4: Test Moderator Login
echo "👥 Step 4: Testing Moderator Login..."
curl -X POST http://localhost:5000/api/auth/admin-login \
  -H "Content-Type: application/json" \
  -d '{"phone": "+9647800914000", "role": "moderator"}' \
  -s | head -20
echo ""
echo ""

# Step 5: Test Flutter OTP Send
echo "📱 Step 5: Testing Flutter App OTP Send..."
curl -X POST http://localhost:5000/api/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"phone": "+9647700914000"}' \
  -s | head -10
echo ""
echo "   ⚠️  Note: Check SMS for OTP, then run verify-otp command"
echo ""

# Step 6: Test Viewer Login (Auto-create)
echo "👁️  Step 6: Testing Viewer Login (Auto-create)..."
curl -X POST http://localhost:5000/api/auth/admin-login \
  -H "Content-Type: application/json" \
  -d '{"phone": "+9647501234567", "role": "viewer"}' \
  -s | head -20
echo ""
echo ""

# Step 7: Verification
echo "✅ Step 7: Verification Complete!"
echo "   All tests completed. Check outputs above."
echo ""

