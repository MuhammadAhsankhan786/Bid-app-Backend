/**
 * Fix Twilio Verify Service Issue
 * 
 * This script checks and helps fix the Twilio Verify Service 401 error
 */

import twilio from 'twilio';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env file
const envPath = join(__dirname, '../../.env');
dotenv.config({ path: envPath });

console.log('\n🔧 Twilio Verify Service Fix Script\n');
console.log('='.repeat(60));

// Check environment variables
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const verifySid = process.env.TWILIO_VERIFY_SID;

console.log('\n📋 Current Configuration:');
console.log('   Account SID:', accountSid ? `${accountSid.substring(0, 10)}...` : 'NOT SET');
console.log('   Auth Token:', authToken ? 'SET (hidden)' : 'NOT SET');
console.log('   Verify SID:', verifySid || 'NOT SET');

if (!accountSid || !authToken) {
  console.error('\n❌ ERROR: TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN not set');
  console.error('   Please set these in your .env file');
  process.exit(1);
}

if (!verifySid) {
  console.error('\n❌ ERROR: TWILIO_VERIFY_SID not set');
  console.error('   Please set this in your .env file');
  process.exit(1);
}

// Initialize Twilio client
const client = twilio(accountSid, authToken);

console.log('\n🔍 Checking Twilio Verify Service...\n');

async function checkAndFixService() {
  try {
    // Try to fetch the service
    console.log(`📞 Attempting to fetch Verify Service: ${verifySid}`);
    const service = await client.verify.v2.services(verifySid).fetch();
    
    console.log('\n✅ SUCCESS: Verify Service Found!');
    console.log('   Service SID:', service.sid);
    console.log('   Friendly Name:', service.friendlyName);
    console.log('   Status:', service.status || 'active');
    console.log('\n✅ Your Twilio Verify Service is correctly configured!');
    console.log('   The 401 error might be due to:');
    console.log('   1. Phone number not verified in Twilio (trial account)');
    console.log('   2. Service temporarily unavailable');
    console.log('   3. Network/connection issue');
    
    return true;
  } catch (error) {
    console.error('\n❌ ERROR: Verify Service Not Found!');
    console.error('   Error Code:', error.code);
    console.error('   Error Message:', error.message);
    console.error('   Status Code:', error.status);
    
    if (error.code === 20404 || error.status === 404) {
      console.error('\n🔧 SOLUTION:');
      console.error('   The Verify Service SID does not exist in your Twilio account.');
      console.error('\n📝 Steps to Fix:');
      console.error('   1. Go to: https://console.twilio.com/us1/develop/verify/services');
      console.error('   2. Check if a service with SID ' + verifySid + ' exists');
      console.error('   3. If not, create a new Verify Service:');
      console.error('      - Click "Create new Verify Service"');
      console.error('      - Enter a name (e.g., "BidMaster OTP")');
      console.error('      - Copy the new Service SID (starts with VA...)');
      console.error('   4. Update your .env file:');
      console.error('      TWILIO_VERIFY_SID=VA[new_service_sid]');
      console.error('   5. Restart your backend server');
      
      // List all available services
      console.error('\n📋 Checking for existing Verify Services in your account...');
      try {
        const services = await client.verify.v2.services.list({ limit: 20 });
        if (services.length > 0) {
          console.error('\n✅ Found ' + services.length + ' Verify Service(s) in your account:');
          services.forEach((svc, index) => {
            console.error(`   ${index + 1}. ${svc.friendlyName || 'Unnamed'} - ${svc.sid}`);
          });
          console.error('\n💡 TIP: You can use any of these Service SIDs in your .env file');
        } else {
          console.error('\n⚠️  No Verify Services found in your account.');
          console.error('   You need to create one at: https://console.twilio.com/us1/develop/verify/services');
        }
      } catch (listError) {
        console.error('\n⚠️  Could not list services:', listError.message);
      }
    }
    
    return false;
  }
}

// Run the check
checkAndFixService()
  .then((success) => {
    if (success) {
      console.log('\n✅ All checks passed!');
      process.exit(0);
    } else {
      console.log('\n❌ Service check failed. Please follow the steps above.');
      process.exit(1);
    }
  })
  .catch((error) => {
    console.error('\n❌ Unexpected error:', error.message);
    process.exit(1);
  });



