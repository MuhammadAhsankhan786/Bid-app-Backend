
import twilio from 'twilio';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = join(__dirname, '../../.env');
dotenv.config({ path: envPath });

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const toPhone = '+9647700914000';
const fromPhone = '+19047060393';

console.log(`🔍 Testing Raw SMS Send\n`);
console.log(`From: ${fromPhone}`);
console.log(`To:   ${toPhone}`);

const client = twilio(accountSid, authToken);

async function testRawSend() {
    try {
        const message = await client.messages.create({
            body: 'Test Code: 123456 (This is a raw SMS test)',
            from: fromPhone,
            to: toPhone
        });

        console.log('✅ RAW SMS SENT SUCCESSFULLY!');
        console.log('SID:', message.sid);
        console.log('Status:', message.status);

    } catch (error) {
        console.error('\n❌ FAILED TO SEND RAW SMS');
        console.error('Error Code:', error.code);
        console.error('Message:', error.message);
        console.error('More Info:', error.moreInfo);
    }
}

testRawSend();
