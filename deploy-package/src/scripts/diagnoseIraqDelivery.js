
import twilio from 'twilio';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = join(__dirname, '../../.env');
dotenv.config({ path: envPath });

console.log('🔍 Iraq Delivery Diagnosis Tool\n');
console.log('='.repeat(70));

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const verifySid = process.env.TWILIO_VERIFY_SID;

if (!accountSid || !authToken) {
  console.error('❌ ERROR: Twilio credentials missing!');
  process.exit(1);
}

const client = twilio(accountSid, authToken);

async function diagnoseIraqDelivery() {
  try {
    // 1. Check Account Type
    console.log('\n📋 1. Account Information:');
    console.log('-'.repeat(70));
    try {
      const account = await client.api.accounts(accountSid).fetch();
      console.log(`   Account Type: ${account.type}`);
      console.log(`   Status: ${account.status}`);
      if (account.type === 'Trial') {
        console.log('   ⚠️  WARNING: Trial Account - May have restrictions for Iraq');
      }
    } catch (error) {
      console.log('   ⚠️  Could not fetch account info:', error.message);
    }

    // 2. Geo Permissions Info
    console.log('\n🌍 2. Geo Permissions Check:');
    console.log('-'.repeat(70));
    console.log('   📍 Go to: https://console.twilio.com/us1/develop/sms/settings/geo-permissions');
    console.log('   ✅ Make sure Iraq (IQ) is enabled');
    console.log('   ⚠️  Error 30008 may indicate carrier-level blocking');

    // 3. Messaging Services
    console.log('\n📱 3. Messaging Services:');
    console.log('-'.repeat(70));
    try {
      const services = await client.messaging.v1.services.list({ limit: 20 });
      const bidmasterService = services.find(s => s.friendlyName === 'BidMaster OTP Sender');
      if (bidmasterService) {
        console.log(`   ✅ Found: ${bidmasterService.friendlyName} (${bidmasterService.sid})`);
      } else {
        console.log('   ⚠️  BidMaster OTP Sender service not found');
      }
    } catch (error) {
      console.log('   ❌ Error:', error.message);
    }

    // 4. Verify Service Config for Iraq
    console.log('\n🔐 4. Verify Service Configuration:');
    console.log('-'.repeat(70));
    if (verifySid) {
      try {
        const configs = await client.verify.v2.services(verifySid)
          .messagingConfigurations.list();
        const iraqConfig = configs.find(c => c.country === 'IQ');
        if (iraqConfig) {
          console.log('   ✅ Iraq (IQ) configuration found');
          console.log(`   Messaging Service: ${iraqConfig.messagingServiceSid}`);
        } else {
          console.log('   ⚠️  No specific configuration for Iraq (IQ)');
        }
      } catch (error) {
        console.log('   ⚠️  Could not fetch configs:', error.message);
      }
    } else {
      console.log('   ⚠️  TWILIO_VERIFY_SID not set');
    }

    // 5. Recent Failed Messages
    console.log('\n📨 5. Recent Failed Messages to Iraq:');
    console.log('-'.repeat(70));
    try {
      const messages = await client.messages.list({ limit: 20 });
      const iraqMessages = messages.filter(m => m.to.startsWith('+964'));
      const failed = iraqMessages.filter(m => 
        m.status === 'failed' || m.status === 'undelivered' || m.errorCode
      );
      
      console.log(`   Total Iraq messages: ${iraqMessages.length}`);
      console.log(`   Failed/Undelivered: ${failed.length}`);
      
      if (failed.length > 0) {
        const errorCounts = {};
        failed.forEach(m => {
          const code = m.errorCode || 'NO_CODE';
          errorCounts[code] = (errorCounts[code] || 0) + 1;
        });
        
        console.log('\n   Error Analysis:');
        Object.entries(errorCounts).forEach(([code, count]) => {
          console.log(`   Error Code ${code}: ${count} messages`);
          if (code === '30008') {
            console.log('      💡 Solutions:');
            console.log('         1. Check Geo Permissions in Twilio Console');
            console.log('         2. Verify carrier supports SMS to Iraq');
            console.log('         3. Contact Twilio Support');
          }
        });
      }
    } catch (error) {
      console.log('   ⚠️  Could not fetch messages:', error.message);
    }

    // 6. Recommendations
    console.log('\n💡 6. Recommendations:');
    console.log('='.repeat(70));
    console.log('\n   For Error Code 30008:');
    console.log('   1. ✅ Check Twilio Console > Geo Permissions > Enable Iraq');
    console.log('   2. ✅ Verify account is not Trial (upgrade if needed)');
    console.log('   3. ✅ Contact Twilio Support for carrier-level issues');
    console.log('   4. ✅ Try using different messaging service or phone number');
    console.log('\n   📞 Twilio Support: https://support.twilio.com');

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
  }
}

diagnoseIraqDelivery();

