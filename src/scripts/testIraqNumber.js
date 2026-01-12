
import twilio from 'twilio';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = join(__dirname, '../../.env');
dotenv.config({ path: envPath });

console.log('🧪 Testing Iraq Number Delivery\n');
console.log('='.repeat(70));

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;

if (!accountSid || !authToken) {
  console.error('❌ ERROR: Twilio credentials missing!');
  process.exit(1);
}

const client = twilio(accountSid, authToken);
const testPhone = '+9647700914000';

async function testIraqNumber() {
  try {
    // 1. Get messaging service
    console.log('\n📱 Step 1: Getting Messaging Service...');
    const services = await client.messaging.v1.services.list({ limit: 20 });
    const bidmasterService = services.find(s => s.friendlyName === 'BidMaster OTP Sender');
    
    if (!bidmasterService) {
      console.error('❌ BidMaster OTP Sender service not found!');
      return;
    }
    
    console.log(`   ✅ Found: ${bidmasterService.sid}`);

    // 2. Get phone number
    console.log('\n📞 Step 2: Getting Phone Number...');
    const numbers = await client.incomingPhoneNumbers.list({ limit: 1 });
    if (numbers.length === 0) {
      console.error('❌ No phone numbers found!');
      return;
    }
    const fromNumber = numbers[0].phoneNumber;
    console.log(`   ✅ Using: ${fromNumber}`);

    // 3. Try sending with Messaging Service
    console.log('\n📨 Step 3: Testing with Messaging Service...');
    try {
      const msg1 = await client.messages.create({
        body: `Test message from BidMaster. If you receive this, SMS is working!`,
        to: testPhone,
        messagingServiceSid: bidmasterService.sid
      });
      console.log(`   ✅ Message sent! SID: ${msg1.sid}`);
      console.log(`   Status: ${msg1.status}`);
    } catch (error) {
      console.log(`   ❌ Failed: ${error.message}`);
      console.log(`   Code: ${error.code}`);
    }

    // 4. Try sending with direct phone number
    console.log('\n📨 Step 4: Testing with Direct Phone Number...');
    try {
      const msg2 = await client.messages.create({
        body: `Test message from BidMaster (Direct). If you receive this, SMS is working!`,
        to: testPhone,
        from: fromNumber
      });
      console.log(`   ✅ Message sent! SID: ${msg2.sid}`);
      console.log(`   Status: ${msg2.status}`);
    } catch (error) {
      console.log(`   ❌ Failed: ${error.message}`);
      console.log(`   Code: ${error.code}`);
    }

    // 5. Check if number needs verification
    console.log('\n🔍 Step 5: Checking Number Status...');
    console.log(`   Test Number: ${testPhone}`);
    console.log(`   Format: ${testPhone.startsWith('+964') ? '✅ Correct' : '❌ Incorrect'}`);
    console.log(`   Length: ${testPhone.length} characters`);
    console.log(`   Digits after +964: ${testPhone.substring(4).length}`);
    
    if (testPhone.substring(4).length < 9 || testPhone.substring(4).length > 10) {
      console.log('   ⚠️  WARNING: Phone number should have 9-10 digits after +964');
    }

    // 6. Recommendations
    console.log('\n💡 Recommendations:');
    console.log('='.repeat(70));
    console.log('\n   If both methods failed:');
    console.log('   1. ✅ Verify phone number in Twilio Console (if Trial account)');
    console.log('   2. ✅ Check Geo Permissions for Iraq');
    console.log('   3. ✅ Contact Twilio Support about Error 30008');
    console.log('   4. ✅ Try with a different Iraq phone number');
    console.log('   5. ✅ Check if carrier supports SMS to Iraq');

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error('   Code:', error.code);
  }
}

testIraqNumber();

