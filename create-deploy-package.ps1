# Create Deployment Package for Backend
# This script creates a clean package for deployment

Write-Host "📦 Creating Backend Deployment Package..." -ForegroundColor Yellow
Write-Host ""

$deployDir = "deploy-package"
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$packageName = "backend-deploy-$timestamp.zip"

# Clean previous deployment
if (Test-Path $deployDir) {
    Remove-Item $deployDir -Recurse -Force
}
New-Item -ItemType Directory -Path $deployDir | Out-Null

Write-Host "1. Copying source files..." -ForegroundColor Cyan
Copy-Item -Path "src" -Destination "$deployDir\src" -Recurse -Force
Copy-Item -Path "package.json" -Destination "$deployDir\package.json" -Force
Copy-Item -Path "package-lock.json" -Destination "$deployDir\package-lock.json" -Force

Write-Host "2. Creating .env.example..." -ForegroundColor Cyan
if (Test-Path ".env.example") {
    Copy-Item -Path ".env.example" -Destination "$deployDir\.env.example" -Force
} else {
    # Create basic .env.example
    $envContent = @"
# Database
DATABASE_URL=postgresql://user:password@host:port/database

# JWT
JWT_SECRET=your_jwt_secret_here
JWT_REFRESH_SECRET=your_refresh_secret_here

# Twilio
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_VERIFY_SID=your_verify_sid

# Server
PORT=5000
NODE_ENV=production

# OTP
OTP_BYPASS=false
"@
    $envContent | Out-File -FilePath "$deployDir\.env.example" -Encoding UTF8
}

Write-Host "3. Creating deployment README..." -ForegroundColor Cyan
$readmeContent = @"
# Backend Deployment Package

## Installation Steps

1. Extract this package on your server
2. Copy .env.example to .env and fill in your values
3. Run: npm install
4. Start server: npm start (or use PM2)

## Files Included
- src/ - All source code
- package.json - Dependencies
- package-lock.json - Lock file

## Changes in This Version
- Improved Twilio error messages
- Better OTP error handling

## Server Requirements
- Node.js >= 18.0.0
- PostgreSQL database
- Environment variables configured

## Restart Command
pm2 restart all
# OR
sudo systemctl restart your-backend-service
"@
$readmeContent | Out-File -FilePath "$deployDir\DEPLOY_README.txt" -Encoding UTF8

Write-Host "4. Creating ZIP package..." -ForegroundColor Cyan
Compress-Archive -Path "$deployDir\*" -DestinationPath $packageName -Force

Write-Host ""
Write-Host "✅ Package created: $packageName" -ForegroundColor Green
Write-Host "📦 Size: $([math]::Round((Get-Item $packageName).Length / 1MB, 2)) MB" -ForegroundColor Cyan
Write-Host ""
Write-Host "📤 Upload this file to your server and extract it" -ForegroundColor Yellow
Write-Host "   Then run: npm install && pm2 restart all" -ForegroundColor Yellow

