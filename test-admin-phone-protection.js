/**
 * Test Script: Admin Phone Number Protection
 * 
 * This script tests:
 * 1. Normal user phone number can be changed
 * 2. Superadmin/Moderator phone number is protected
 * 3. Special endpoint works with password confirmation
 * 
 * REQUIRED ENVIRONMENT VARIABLES:
 * - ADMIN_PASSWORD: The actual Superadmin password (required for special endpoint test)
 * 
 * Setup:
 * 1. Create .env file in this directory (or set environment variable)
 * 2. Add: ADMIN_PASSWORD=your_actual_superadmin_password
 * 3. Run: node test-admin-phone-protection.js
 */

import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const BASE_URL = process.env.BASE_URL || 'http://localhost:5000/api';

// Validate required environment variables
if (!process.env.ADMIN_PASSWORD) {
  console.error('\n❌ ERROR: ADMIN_PASSWORD environment variable is required!');
  console.error('\n📝 Setup Instructions:');
  console.error('   1. Create a .env file in the "Bid app Backend" directory');
  console.error('   2. Add: ADMIN_PASSWORD=your_actual_superadmin_password');
  console.error('   3. Or set environment variable: export ADMIN_PASSWORD=your_password');
  console.error('\n⚠️  This password is needed to test the special endpoint that requires password confirmation.');
  console.error('   The password must match the actual Superadmin password in the database.\n');
  process.exit(1);
}
let superadminToken = '';
let normalUserId = null;
let superadminId = null;
let moderatorId = null;

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function loginAsSuperadmin() {
  try {
    log('\n🔐 Step 1: Logging in as Superadmin...', 'cyan');

    // Admin login requires phone + role (not email/password)
    // Get phone from environment or use default
    // Note: Phone should match the actual Superadmin phone in database
    const adminPhone = process.env.ADMIN_PHONE || '+9647500914000';

    log(`   Using phone: ${adminPhone}`, 'yellow');
    log(`   💡 If login fails, check actual Superadmin phone in database and update ADMIN_PHONE in .env`, 'yellow');

    const response = await axios.post(`${BASE_URL}/auth/admin-login`, {
      phone: adminPhone,
      role: 'superadmin'
    });

    superadminToken = response.data.token || response.data.accessToken;
    log('✅ Login successful!', 'green');
    return true;
  } catch (error) {
    log(`❌ Login failed: ${error.response?.data?.message || error.message}`, 'red');
    log(`   Hint: Make sure ADMIN_PHONE environment variable is set or update the phone in the script`, 'yellow');
    return false;
  }
}

async function getUsers() {
  try {
    log('\n📋 Step 2: Fetching users...', 'cyan');

    // Get all users including admins
    const response = await axios.get(`${BASE_URL}/admin/users`, {
      headers: { Authorization: `Bearer ${superadminToken}` },
      params: { limit: 100 } // Get more users
    });

    const users = response.data.users || response.data || [];
    log(`   Found ${users.length} users total`, 'yellow');

    // Also try to get superadmin directly by ID (if we know it)
    // First, let's check current logged-in user
    let currentUser = null;
    try {
      const userResponse = await axios.get(`${BASE_URL}/admin/users/${superadminId || '1'}`, {
        headers: { Authorization: `Bearer ${superadminToken}` }
      });
      currentUser = userResponse.data;
      log(`   Current logged-in user: ${currentUser.name || 'Unknown'} (Role: ${currentUser.role})`, 'yellow');
    } catch (e) {
      // Ignore
    }

    // Find normal user (not superadmin/moderator)
    const normalUser = users.find(u =>
      !['superadmin', 'admin', 'moderator'].includes(u.role?.toLowerCase())
    );

    // Find superadmin - check in users list first
    let superadmin = users.find(u =>
      ['superadmin', 'admin'].includes(u.role?.toLowerCase())
    );

    // If not found, use current logged-in user if it's superadmin
    if (!superadmin && currentUser && ['superadmin', 'admin'].includes(currentUser.role?.toLowerCase())) {
      superadmin = currentUser;
      superadminId = currentUser.id;
      log(`   Using logged-in user as superadmin (ID: ${superadminId})`, 'yellow');
    }

    // Find moderator - check for phone 7800914000 or role moderator
    let moderator = users.find(u =>
      u.role?.toLowerCase() === 'moderator'
    );

    // If not found, search by moderator phone number
    if (!moderator) {
      moderator = users.find(u =>
        u.phone && (u.phone.includes('7800914000') || u.phone === '+9647800914000')
      );
      if (moderator) {
        log(`   Found moderator by phone: ${moderator.name} (ID: ${moderator.id})`, 'yellow');
      }
    }

    if (normalUser) {
      normalUserId = normalUser.id;
      log(`✅ Found normal user: ${normalUser.name} (ID: ${normalUserId})`, 'green');
    }

    if (superadmin) {
      superadminId = superadmin.id;
      log(`✅ Found superadmin: ${superadmin.name} (ID: ${superadminId}, Phone: ${superadmin.phone})`, 'green');
    }

    if (moderator) {
      moderatorId = moderator.id;
      log(`✅ Found moderator: ${moderator.name} (ID: ${moderatorId}, Phone: ${moderator.phone})`, 'green');
    }

    return { normalUser, superadmin, moderator };
  } catch (error) {
    log(`❌ Failed to fetch users: ${error.response?.data?.error || error.message}`, 'red');
    return null;
  }
}

async function testNormalUserPhoneChange() {
  if (!normalUserId) {
    log('\n⚠️  Skipping: No normal user found', 'yellow');
    return false;
  }

  try {
    log('\n🧪 Test 1: Changing Normal User Phone Number...', 'blue');
    const newPhone = '+964 750 999 9999';

    const response = await axios.put(
      `${BASE_URL}/admin/users/${normalUserId}`,
      { phone: newPhone },
      { headers: { Authorization: `Bearer ${superadminToken}` } }
    );

    log(`✅ SUCCESS: Normal user phone changed to ${newPhone}`, 'green');
    return true;
  } catch (error) {
    log(`❌ FAILED: ${error.response?.data?.error || error.message}`, 'red');
    return false;
  }
}

async function testSuperadminPhoneChange() {
  if (!superadminId) {
    log('\n⚠️  Skipping: No superadmin found', 'yellow');
    return false;
  }

  try {
    log('\n🧪 Test 2: Trying to Change Superadmin Phone (Should Fail)...', 'blue');
    const newPhone = '+964 750 888 8888';

    await axios.put(
      `${BASE_URL}/admin/users/${superadminId}`,
      { phone: newPhone },
      { headers: { Authorization: `Bearer ${superadminToken}` } }
    );

    log(`❌ FAILED: Phone was changed (should be blocked!)`, 'red');
    return false;
  } catch (error) {
    const errorMsg = error.response?.data?.error || error.message;
    if (errorMsg.includes('Cannot update phone number') || errorMsg.includes('Super Admin') || errorMsg.includes('Moderator')) {
      log(`✅ SUCCESS: Phone change blocked correctly - ${errorMsg}`, 'green');
      return true;
    } else {
      log(`❌ UNEXPECTED ERROR: ${errorMsg}`, 'red');
      return false;
    }
  }
}

async function testModeratorPhoneChange() {
  if (!moderatorId) {
    log('\n⚠️  Skipping: No moderator found', 'yellow');
    return false;
  }

  try {
    log('\n🧪 Test 3: Trying to Change Moderator Phone (Should Fail)...', 'blue');
    const newPhone = '+964 750 777 7777';

    await axios.put(
      `${BASE_URL}/admin/users/${moderatorId}`,
      { phone: newPhone },
      { headers: { Authorization: `Bearer ${superadminToken}` } }
    );

    log(`❌ FAILED: Phone was changed (should be blocked!)`, 'red');
    return false;
  } catch (error) {
    const errorMsg = error.response?.data?.error || error.message;
    if (errorMsg.includes('Cannot update phone number') || errorMsg.includes('Super Admin') || errorMsg.includes('Moderator')) {
      log(`✅ SUCCESS: Phone change blocked correctly - ${errorMsg}`, 'green');
      return true;
    } else {
      log(`❌ UNEXPECTED ERROR: ${errorMsg}`, 'red');
      return false;
    }
  }
}

async function testSpecialEndpoint() {
  if (!superadminId) {
    log('\n⚠️  Skipping: No superadmin found', 'yellow');
    return false;
  }

  // Get password from environment (required, validated at startup)
  const password = process.env.ADMIN_PASSWORD;

  if (!password) {
    log('\n❌ ERROR: ADMIN_PASSWORD not set. Cannot run special endpoint test.', 'red');
    log('   Please set ADMIN_PASSWORD environment variable or add it to .env file', 'yellow');
    return false;
  }

  try {
    log('\n🧪 Test 4: Using Special Endpoint with Password (Should Work)...', 'blue');
    log(`   Using password from ADMIN_PASSWORD environment variable`, 'yellow');
    const newPhone = '+964 750 123 4567';

    const response = await axios.put(
      `${BASE_URL}/admin/users/${superadminId}/change-admin-phone`,
      {
        phone: newPhone,
        confirmPassword: password
      },
      { headers: { Authorization: `Bearer ${superadminToken}` } }
    );

    log(`✅ SUCCESS: Phone changed via special endpoint to ${newPhone}`, 'green');
    return true;
  } catch (error) {
    const errorMsg = error.response?.data?.error || error.message;
    log(`❌ FAILED: ${errorMsg}`, 'red');

    // Provide helpful hint if password is wrong
    if (errorMsg.includes('password') || errorMsg.includes('Invalid password') || errorMsg.includes('401')) {
      log(`\n💡 Hint: The password in ADMIN_PASSWORD doesn't match the Superadmin password.`, 'yellow');
      log(`   Please verify the correct Superadmin password and update ADMIN_PASSWORD in .env file.`, 'yellow');
    }

    return false;
  }
}

async function testSpecialEndpointWrongPassword() {
  if (!superadminId) {
    log('\n⚠️  Skipping: No superadmin found', 'yellow');
    return false;
  }

  try {
    log('\n🧪 Test 5: Special Endpoint with Wrong Password (Should Fail)...', 'blue');
    const newPhone = '+964 750 111 1111';

    await axios.put(
      `${BASE_URL}/admin/users/${superadminId}/change-admin-phone`,
      {
        phone: newPhone,
        confirmPassword: 'wrong_password_123'
      },
      { headers: { Authorization: `Bearer ${superadminToken}` } }
    );

    log(`❌ FAILED: Request succeeded (should be blocked!)`, 'red');
    return false;
  } catch (error) {
    const errorMsg = error.response?.data?.error || error.message;
    if (errorMsg.includes('password') || errorMsg.includes('Invalid password')) {
      log(`✅ SUCCESS: Wrong password rejected correctly - ${errorMsg}`, 'green');
      return true;
    } else {
      log(`❌ UNEXPECTED ERROR: ${errorMsg}`, 'red');
      return false;
    }
  }
}

async function runAllTests() {
  log('\n🚀 Starting Admin Phone Protection Tests...', 'cyan');
  log('='.repeat(60), 'cyan');

  // Validate environment setup
  if (!process.env.ADMIN_PASSWORD) {
    log('\n❌ Cannot proceed: ADMIN_PASSWORD environment variable is required', 'red');
    log('   Please set ADMIN_PASSWORD in .env file or as environment variable', 'yellow');
    log('   See TEST_SETUP.md for instructions', 'yellow');
    return;
  }

  // Login
  const loggedIn = await loginAsSuperadmin();
  if (!loggedIn) {
    log('\n❌ Cannot proceed without login', 'red');
    return;
  }

  // Get users
  await getUsers();

  // Run tests
  const results = {
    normalUser: await testNormalUserPhoneChange(),
    superadminBlock: await testSuperadminPhoneChange(),
    moderatorBlock: await testModeratorPhoneChange(),
    specialEndpoint: await testSpecialEndpoint(),
    wrongPassword: await testSpecialEndpointWrongPassword()
  };

  // Summary
  log('\n' + '='.repeat(60), 'cyan');
  log('📊 TEST SUMMARY', 'cyan');
  log('='.repeat(60), 'cyan');
  log(`Normal User Phone Change: ${results.normalUser ? '✅ PASS' : '❌ FAIL'}`, results.normalUser ? 'green' : 'red');
  log(`Superadmin Protection: ${results.superadminBlock ? '✅ PASS' : '❌ FAIL'}`, results.superadminBlock ? 'green' : 'red');
  log(`Moderator Protection: ${results.moderatorBlock ? '✅ PASS' : '❌ FAIL'}`, results.moderatorBlock ? 'green' : 'red');
  log(`Special Endpoint: ${results.specialEndpoint ? '✅ PASS' : '❌ FAIL'}`, results.specialEndpoint ? 'green' : 'red');
  log(`Wrong Password Rejection: ${results.wrongPassword ? '✅ PASS' : '❌ FAIL'}`, results.wrongPassword ? 'green' : 'red');

  const allPassed = Object.values(results).every(r => r === true);
  log('\n' + '='.repeat(60), 'cyan');
  if (allPassed) {
    log('🎉 ALL TESTS PASSED!', 'green');
  } else {
    log('⚠️  SOME TESTS FAILED - Please review above', 'yellow');
  }
  log('='.repeat(60), 'cyan');
}

// Run tests
runAllTests().catch(console.error);

