/**
 * Twilio Configuration Verification Script
 * 
 * This script verifies that Twilio is correctly configured
 * and can connect to Twilio's API.
 * 
 * Usage: node src/scripts/verifyTwilioConfig.js
 */

import twilio from 'twilio';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = join(__dirname, '../../.env');
dotenv.config({ path: envPath });

console.log('🔍 Twilio Configuration Verification\n');
console.log('=' .repeat(50));

// Check environment variables
console.log('\n📋 Environment Variables Check:');
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const verifySid = process.env.TWILIO_VERIFY_SID;

console.log(`   TWILIO_ACCOUNT_SID: ${accountSid ? `✅ SET (${accountSid.substring(0, 10)}...)` : '❌ NOT SET'}`);
console.log(`   TWILIO_AUTH_TOKEN: ${authToken ? '✅ SET (hidden)' : '❌ NOT SET'}`);
console.log(`   TWILIO_VERIFY_SID: ${verifySid ? `✅ SET (${verifySid})` : '❌ NOT SET'}`);

// Validate format
let hasErrors = false;

if (!accountSid) {
  console.error('\n❌ ERROR: TWILIO_ACCOUNT_SID is not set');
  hasErrors = true;
} else if (!accountSid.startsWith('AC')) {
  console.error('\n❌ ERROR: TWILIO_ACCOUNT_SID format is invalid (should start with AC)');
  hasErrors = true;
}

if (!authToken) {
  console.error('\n❌ ERROR: TWILIO_AUTH_TOKEN is not set');
  hasErrors = true;
}

if (!verifySid) {
  console.error('\n❌ ERROR: TWILIO_VERIFY_SID is not set');
  hasErrors = true;
} else if (!verifySid.startsWith('VA')) {
  console.error('\n❌ ERROR: TWILIO_VERIFY_SID format is invalid (should start with VA)');
  hasErrors = true;
}

if (hasErrors) {
  console.error('\n❌ Configuration errors found. Please fix them before proceeding.');
  process.exit(1);
}

// Test Twilio connection
console.log('\n🔌 Testing Twilio API Connection...');

try {
  const client = twilio(accountSid, authToken);
  
  // Test 1: Fetch account info
  console.log('   Test 1: Fetching account information...');
  const account = await client.api.accounts(accountSid).fetch();
  console.log(`   ✅ Account connected: ${account.friendlyName || accountSid}`);
  console.log(`   ✅ Account status: ${account.status}`);
  
  // Test 2: Verify Service exists
  console.log('   Test 2: Verifying Verify Service exists...');
  try {
    const service = await client.verify.v2.services(verifySid).fetch();
    console.log(`   ✅ Verify Service found: ${service.friendlyName || verifySid}`);
    console.log(`   ✅ Service status: ${service.status || 'active'}`);
  } catch (error) {
    if (error.status === 404) {
      console.error(`   ❌ Verify Service NOT FOUND: ${verifySid}`);
      console.error('   💡 Solution: Create a new Verify Service in Twilio Console:');
      console.error('      https://console.twilio.com/us1/develop/verify/services');
      process.exit(1);
    } else {
      throw error;
    }
  }
  
  // Test 3: Check phone number (if configured)
  console.log('   Test 3: Checking Verify Service configuration...');
  try {
    const service = await client.verify.v2.services(verifySid).fetch();
    console.log(`   ✅ Service configuration looks good`);
  } catch (error) {
    console.error(`   ⚠️  Warning: Could not fetch service details: ${error.message}`);
  }
  
  console.log('\n✅ All Twilio configuration checks passed!');
  console.log('\n📝 Next Steps:');
  console.log('   1. Make sure your backend server is running');
  console.log('   2. Test OTP sending with:');
  console.log('      curl -X POST http://localhost:5000/api/auth/send-otp \\');
  console.log('        -H "Content-Type: application/json" \\');
  console.log('        -d \'{"phone": "+9647700914000"}\'');
  console.log('\n   3. For trial accounts, verify the phone number in Twilio Console first');
  console.log('      https://console.twilio.com/us1/develop/phone-numbers/manage/verified');
  
} catch (error) {
  console.error('\n❌ Twilio API Connection Failed:');
  console.error(`   Error: ${error.message}`);
  console.error(`   Code: ${error.code || 'N/A'}`);
  console.error(`   Status: ${error.status || 'N/A'}`);
  
  if (error.status === 401) {
    console.error('\n💡 This usually means:');
    console.error('   - TWILIO_ACCOUNT_SID is incorrect');
    console.error('   - TWILIO_AUTH_TOKEN is incorrect');
    console.error('   - Credentials have been rotated/changed');
    console.error('\n   Solution: Check your Twilio Console for correct credentials:');
    console.error('   https://console.twilio.com/');
  }
  
  process.exit(1);
}
