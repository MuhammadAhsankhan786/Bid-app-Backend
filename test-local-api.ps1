# Quick Local API Test
$token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6NTMsInBob25lIjoiKzk2NDc1MDA5MTQwMDAiLCJyb2xlIjoic3VwZXJhZG1pbiIsInNjb3BlIjoiYWRtaW4iLCJpYXQiOjE3NjYxNzIwNTMsImV4cCI6MTc2Njc3Njg1M30.zQItgDfi6jMB9n0vdk1dkOAxzSr21ksZBr3wC9aoCLQ"
$baseUrl = "http://localhost:5000/api"

Write-Host "🧪 Testing Local Backend APIs..." -ForegroundColor Cyan
Write-Host ""

# Test 1: Dashboard
Write-Host "1. Testing Dashboard..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/admin/dashboard" -Method GET -Headers @{"Authorization"="Bearer $token"} -UseBasicParsing
    Write-Host "   ✅ Dashboard: $($response.StatusCode)" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Dashboard: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 2: Get Products
Write-Host "2. Testing Get Products..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/admin/products" -Method GET -Headers @{"Authorization"="Bearer $token"} -UseBasicParsing
    Write-Host "   ✅ Get Products: $($response.StatusCode)" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Get Products: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 3: Get Pending Products
Write-Host "3. Testing Get Pending Products..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/admin/products/pending" -Method GET -Headers @{"Authorization"="Bearer $token"} -UseBasicParsing
    Write-Host "   ✅ Get Pending Products: $($response.StatusCode)" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Get Pending Products: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 4: Get Users
Write-Host "4. Testing Get Users..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/admin/users" -Method GET -Headers @{"Authorization"="Bearer $token"} -UseBasicParsing
    Write-Host "   ✅ Get Users: $($response.StatusCode)" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Get Users: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "✅ Test Complete!" -ForegroundColor Green

