
import twilio from 'twilio';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = join(__dirname, '../../.env');
dotenv.config({ path: envPath });

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = twilio(accountSid, authToken);

// Recent test message SIDs
const messageSids = [
  'SM8e4f05cd8865ee2039301ef932856b4f',
  'SM5534c838ff053e8ccae97c0ac8c3d8c6'
];

async function checkMessages() {
  console.log('🔍 Checking Recent Test Messages\n');
  console.log('='.repeat(70));
  
  for (const sid of messageSids) {
    try {
      const message = await client.messages(sid).fetch();
      console.log(`\n📨 Message: ${sid}`);
      console.log(`   Status: ${message.status.toUpperCase()}`);
      console.log(`   To: ${message.to}`);
      console.log(`   From: ${message.from}`);
      console.log(`   Date: ${message.dateCreated}`);
      
      if (message.status === 'delivered') {
        console.log('   ✅ DELIVERED!');
      } else if (message.status === 'sent') {
        console.log('   ⏳ SENT (waiting for delivery confirmation)');
      } else if (message.status === 'undelivered' || message.status === 'failed') {
        console.log(`   ❌ ${message.status.toUpperCase()}`);
        console.log(`   Error Code: ${message.errorCode || 'N/A'}`);
        console.log(`   Error Message: ${message.errorMessage || 'N/A'}`);
      } else {
        console.log(`   ℹ️  Status: ${message.status}`);
      }
    } catch (error) {
      console.log(`\n❌ Error fetching ${sid}: ${error.message}`);
    }
  }
  
  console.log('\n' + '='.repeat(70));
}

checkMessages();

