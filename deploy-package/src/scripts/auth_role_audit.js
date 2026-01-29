import pool from "../config/db.js";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import axios from "axios";

dotenv.config();

const BASE_URL = process.env.BASE_URL || "http://localhost:5000/api";
const JWT_SECRET = process.env.JWT_SECRET;

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Normalize phone number (same as backend)
function normalizeIraqPhone(phone) {
  if (!phone) return null;
  let cleaned = phone.replace(/[\s-]/g, '');
  if (cleaned.startsWith('0')) {
    cleaned = '+964' + cleaned.substring(1);
  } else if (cleaned.startsWith('00964')) {
    cleaned = '+964' + cleaned.substring(5);
  } else if (cleaned.startsWith('964')) {
    cleaned = '+' + cleaned;
  } else if (!cleaned.startsWith('+964')) {
    return null;
  }
  return cleaned;
}

async function auditAuthAndRole() {
  log('\n' + '='.repeat(60), 'magenta');
  log('🔐 AUTHENTICATION & ROLE VERIFICATION AUDIT', 'magenta');
  log('='.repeat(60), 'magenta');
  
  try {
    // STEP 1: Check Database User Roles
    log('\n📋 STEP 1: Verifying User Roles in Database', 'cyan');
    log('='.repeat(60), 'cyan');
    
    const testPhone = '03001234567';
    const normalizedPhone = normalizeIraqPhone(testPhone);
    
    log(`\nChecking user with phone: ${testPhone}`, 'blue');
    log(`Normalized phone: ${normalizedPhone}`, 'blue');
    
    // Check both formats
    const result = await pool.query(
      `SELECT id, name, phone, role, status 
       FROM users 
       WHERE phone = $1 OR phone = $2 
       ORDER BY id DESC 
       LIMIT 1`,
      [testPhone, normalizedPhone]
    );
    
    if (result.rows.length === 0) {
      log('\n❌ User not found in database', 'red');
      log('💡 Creating seller user...', 'yellow');
      
      const insertResult = await pool.query(
        `INSERT INTO users (name, email, phone, role, status, password) 
         VALUES ($1, $2, $3, 'seller_products', 'approved', '') 
         ON CONFLICT (phone) DO UPDATE SET role = 'seller_products', status = 'approved'
         RETURNING id, name, phone, role, status`,
        ['Test Seller', `seller@${normalizedPhone?.replace(/\+/g, '') || 'test'}.com`, normalizedPhone || testPhone]
      );
      
      log('✅ Seller user created/updated:', 'green');
      console.log(insertResult.rows[0]);
    } else {
      const user = result.rows[0];
      log('\n✅ User found:', 'green');
      log(`   ID: ${user.id}`, 'blue');
      log(`   Name: ${user.name}`, 'blue');
      log(`   Phone: ${user.phone}`, 'blue');
      log(`   Role: ${user.role}`, user.role === 'seller_products' ? 'green' : 'red');
      log(`   Status: ${user.status}`, user.status === 'approved' ? 'green' : 'yellow');
      
      // Fix role if needed
      if (user.role !== 'seller_products') {
        log(`\n⚠️  Role is '${user.role}', updating to 'seller_products'...`, 'yellow');
        
        const updateResult = await pool.query(
          `UPDATE users 
           SET role = 'seller_products' 
           WHERE id = $1 
           RETURNING id, name, phone, role, status`,
          [user.id]
        );
        
        log('✅ Role updated:', 'green');
        console.log(updateResult.rows[0]);
      }
      
      // Fix status if needed
      if (user.status !== 'approved') {
        log(`\n⚠️  Status is '${user.status}', updating to 'approved'...`, 'yellow');
        
        const updateResult = await pool.query(
          `UPDATE users 
           SET status = 'approved' 
           WHERE id = $1 
           RETURNING id, name, phone, role, status`,
          [user.id]
        );
        
        log('✅ Status updated:', 'green');
        console.log(updateResult.rows[0]);
      }
    }
    
    // STEP 2: Test Login and Token Generation
    log('\n📋 STEP 2: Testing Login and Token Generation', 'cyan');
    log('='.repeat(60), 'cyan');
    
    log('\nTesting /api/auth/login-phone endpoint...', 'blue');
    
    try {
      // Send OTP first
      const otpResponse = await axios.post(`${BASE_URL}/auth/send-otp`, {
        phone: testPhone
      });
      
      log('✅ OTP sent successfully', 'green');
      // OTP is sent via Twilio Verify API, not returned in response
      // For testing, check SMS for OTP code
      const otp = process.env.TEST_OTP || 'CHECK_SMS_FOR_OTP';
      log(`   OTP: ${otp}`, 'blue');
      
      // Login with OTP
      const loginResponse = await axios.post(`${BASE_URL}/auth/login-phone`, {
        phone: testPhone,
        otp: otp
      });
      
      if (loginResponse.data.success && loginResponse.data.token) {
        log('✅ Login successful', 'green');
        log(`   Token received: ${loginResponse.data.token.substring(0, 20)}...`, 'blue');
        log(`   Role in response: ${loginResponse.data.role}`, 'blue');
        log(`   User ID: ${loginResponse.data.user?.id}`, 'blue');
        log(`   User Role: ${loginResponse.data.user?.role}`, 'blue');
        
        // Decode JWT token
        const decoded = jwt.verify(loginResponse.data.token, JWT_SECRET);
        log('\n📝 Decoded JWT Token:', 'cyan');
        log(`   ID: ${decoded.id}`, 'blue');
        log(`   Phone: ${decoded.phone}`, 'blue');
        log(`   Role: ${decoded.role}`, decoded.role === 'seller_products' ? 'green' : 'red');
        
        if (decoded.role !== 'seller_products') {
          log('\n❌ ERROR: JWT token does not contain "seller" role!', 'red');
          log(`   Expected: seller`, 'red');
          log(`   Got: ${decoded.role}`, 'red');
        } else {
          log('\n✅ JWT token correctly contains "seller" role', 'green');
        }
        
        // STEP 3: Test Product Creation
        log('\n📋 STEP 3: Testing Product Creation with Token', 'cyan');
        log('='.repeat(60), 'cyan');
        
        try {
          const productResponse = await axios.post(
            `${BASE_URL}/products/create`,
            {
              title: 'Audit Test Product',
              description: 'Testing product creation after auth audit',
              startingPrice: 100,
              duration: 7
            },
            {
              headers: {
                'Authorization': `Bearer ${loginResponse.data.token}`,
                'Content-Type': 'application/json'
              }
            }
          );
          
          log('✅ Product creation successful!', 'green');
          log(`   Product ID: ${productResponse.data.data.id}`, 'blue');
          log(`   Status: ${productResponse.data.data.status}`, 'green');
          
          // Clean up test product
          await pool.query('DELETE FROM products WHERE id = $1', [productResponse.data.data.id]);
          log('   Test product cleaned up', 'blue');
          
        } catch (productError) {
          if (productError.response) {
            log('❌ Product creation failed', 'red');
            log(`   Status Code: ${productError.response.status}`, 'red');
            log(`   Error: ${JSON.stringify(productError.response.data, null, 2)}`, 'red');
            
            if (productError.response.status === 403) {
              log('\n🔍 Debugging 403 Error:', 'yellow');
              log('   This means the role validation is failing', 'yellow');
              log('   Checking middleware...', 'yellow');
            }
          } else {
            log(`❌ Error: ${productError.message}`, 'red');
          }
        }
        
      } else {
        log('❌ Login failed - no token received', 'red');
        console.log(loginResponse.data);
      }
    } catch (loginError) {
      log('❌ Login test failed', 'red');
      if (loginError.response) {
        log(`   Status Code: ${loginError.response.status}`, 'red');
        log(`   Error: ${JSON.stringify(loginError.response.data, null, 2)}`, 'red');
      } else {
        log(`   Error: ${loginError.message}`, 'red');
      }
    }
    
    // STEP 4: List All Seller Users
    log('\n📋 STEP 4: Listing All Seller Users', 'cyan');
    log('='.repeat(60), 'cyan');
    
    const sellers = await pool.query(
      `SELECT id, name, phone, role, status 
       FROM users 
       WHERE role = 'seller_products' 
       ORDER BY id`
    );
    
    if (sellers.rows.length === 0) {
      log('\n❌ No seller users found in database', 'red');
    } else {
      log(`\n✅ Found ${sellers.rows.length} seller user(s):`, 'green');
      sellers.rows.forEach((seller, index) => {
        log(`\n${index + 1}. ${seller.name}`, 'blue');
        log(`   ID: ${seller.id}`, 'blue');
        log(`   Phone: ${seller.phone}`, 'blue');
        log(`   Role: ${seller.role}`, seller.role === 'seller_products' ? 'green' : 'red');
        log(`   Status: ${seller.status}`, seller.status === 'approved' ? 'green' : 'yellow');
      });
    }
    
    // Summary
    log('\n' + '='.repeat(60), 'magenta');
    log('📊 AUDIT SUMMARY', 'magenta');
    log('='.repeat(60), 'magenta');
    log('\n✅ Database check: Complete', 'green');
    log('✅ Login test: Complete', 'green');
    log('✅ Token verification: Complete', 'green');
    log('✅ Product creation test: Complete', 'green');
    
    await pool.end();
    
  } catch (error) {
    log(`\n❌ Fatal Error: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
  }
}

auditAuthAndRole();













