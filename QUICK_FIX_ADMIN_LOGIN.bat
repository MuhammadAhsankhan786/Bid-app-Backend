@echo off
REM Quick Fix Script for Admin Login - End to End (Windows)

echo 🔧 Fixing Admin Login - End to End
echo ====================================
echo.

REM Step 1: Create admin users in database
echo Step 1: Creating admin users in database...
node src/scripts/create_admin_users_now.js

echo.
echo Step 2: Verifying backend server...
echo    Check if server is running on port 5000
echo    If not, run: npm start
echo.

echo Step 3: Testing API endpoint...
curl -X POST http://localhost:5000/api/auth/admin-login -H "Content-Type: application/json" -d "{\"phone\": \"+9647500914000\", \"role\": \"superadmin\"}"

echo.
echo.
echo ✅ Fix complete!
echo    Now try login in admin panel with:
echo    Phone: +9647500914000
echo    Role: superadmin
echo.

pause

