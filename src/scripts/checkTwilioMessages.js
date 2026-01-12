
import twilio from 'twilio';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = join(__dirname, '../../.env');
dotenv.config({ path: envPath });

console.log('🔍 Twilio Message Sending Status Check\n');
console.log('='.repeat(60));

// Check Environment Variables
console.log('\n📋 Environment Configuration:');
console.log('   TWILIO_ACCOUNT_SID:', process.env.TWILIO_ACCOUNT_SID ? `✅ SET (${process.env.TWILIO_ACCOUNT_SID.substring(0, 10)}...)` : '❌ NOT SET');
console.log('   TWILIO_AUTH_TOKEN:', process.env.TWILIO_AUTH_TOKEN ? '✅ SET (hidden)' : '❌ NOT SET');
console.log('   TWILIO_VERIFY_SID:', process.env.TWILIO_VERIFY_SID ? `✅ SET (${process.env.TWILIO_VERIFY_SID})` : '❌ NOT SET');

if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
  console.error('\n❌ ERROR: Twilio credentials are missing!');
  console.error('   Please set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN in .env file');
  process.exit(1);
}

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

async function checkTwilioMessages() {
  try {
    // 1. Check Account Balance
    console.log('\n💰 Checking Account Balance...');
    try {
      const balance = await client.balance.fetch();
      console.log(`   Balance: $${balance.balance} ${balance.currency}`);
      if (parseFloat(balance.balance) < 0.01) {
        console.log('   ⚠️  WARNING: Low balance! Messages may fail to send.');
      }
    } catch (error) {
      console.log('   ⚠️  Could not fetch balance:', error.message);
    }

    // 2. List Recent Messages (Last 10)
    console.log('\n📨 Recent Messages (Last 10):');
    console.log('-'.repeat(60));
    
    const messages = await client.messages.list({ limit: 10 });
    
    if (messages.length === 0) {
      console.log('   ℹ️  No messages found in recent history');
    } else {
      messages.forEach((msg, index) => {
        console.log(`\n   Message ${index + 1}:`);
        console.log(`   SID:      ${msg.sid}`);
        console.log(`   Status:   ${msg.status.toUpperCase()}`);
        console.log(`   From:     ${msg.from || 'N/A'}`);
        console.log(`   To:       ${msg.to}`);
        console.log(`   Date:     ${msg.dateCreated}`);
        console.log(`   Body:     ${msg.body ? msg.body.substring(0, 50) + '...' : 'N/A'}`);
        if (msg.errorCode || msg.errorMessage) {
          console.log(`   ❌ Error:  ${msg.errorCode} - ${msg.errorMessage}`);
        }
      });
    }

    // 3. Check Messaging Services
    console.log('\n📱 Checking Messaging Services...');
    try {
      const services = await client.messaging.v1.services.list({ limit: 10 });
      if (services.length === 0) {
        console.log('   ⚠️  No messaging services found');
      } else {
        services.forEach((service, index) => {
          console.log(`\n   Service ${index + 1}:`);
          console.log(`   Name: ${service.friendlyName}`);
          console.log(`   SID:  ${service.sid}`);
        });
      }
    } catch (error) {
      console.log('   ⚠️  Could not fetch messaging services:', error.message);
    }

    // 4. Check Phone Numbers
    console.log('\n📞 Checking Phone Numbers...');
    try {
      const numbers = await client.incomingPhoneNumbers.list({ limit: 10 });
      if (numbers.length === 0) {
        console.log('   ⚠️  No phone numbers found');
      } else {
        numbers.forEach((number, index) => {
          console.log(`\n   Number ${index + 1}:`);
          console.log(`   Phone: ${number.phoneNumber}`);
          console.log(`   SID:   ${number.sid}`);
          console.log(`   SMS:   ${number.capabilities.sms ? '✅ Enabled' : '❌ Disabled'}`);
        });
      }
    } catch (error) {
      console.log('   ⚠️  Could not fetch phone numbers:', error.message);
    }

    // 5. Summary
    console.log('\n' + '='.repeat(60));
    console.log('\n📊 Summary:');
    
    const sentMessages = messages.filter(m => m.status === 'sent' || m.status === 'delivered');
    const failedMessages = messages.filter(m => m.status === 'failed' || m.status === 'undelivered');
    const queuedMessages = messages.filter(m => m.status === 'queued' || m.status === 'sending');
    
    console.log(`   Total Recent Messages: ${messages.length}`);
    console.log(`   ✅ Sent/Delivered:    ${sentMessages.length}`);
    console.log(`   ⏳ Queued/Sending:    ${queuedMessages.length}`);
    console.log(`   ❌ Failed:            ${failedMessages.length}`);
    
    if (failedMessages.length > 0) {
      console.log('\n   ⚠️  WARNING: Some messages failed to send!');
      failedMessages.forEach(msg => {
        console.log(`      - ${msg.to}: ${msg.errorMessage || 'Unknown error'}`);
      });
    }
    
    if (sentMessages.length > 0) {
      console.log('\n   ✅ Messages are being sent successfully from Twilio!');
    } else if (messages.length === 0) {
      console.log('\n   ℹ️  No recent messages found. This could mean:');
      console.log('      - No messages have been sent yet');
      console.log('      - Messages are older than the default limit');
    }

  } catch (error) {
    console.error('\n❌ ERROR checking Twilio messages:');
    console.error('   Message:', error.message);
    console.error('   Code:', error.code);
    if (error.code === 20003) {
      console.error('\n   ⚠️  Invalid credentials! Please check your TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN');
    }
  }
}

checkTwilioMessages();

