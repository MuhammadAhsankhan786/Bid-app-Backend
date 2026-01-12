
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
// Specific SID from the last successful log
const messageSid = 'SM9634ebb05f5388739c7e2b053c6d1609';

console.log(`🔍 Checking Delivery Status for SID: ${messageSid}`);

const client = twilio(accountSid, authToken);

async function checkStatus() {
    try {
        const message = await client.messages(messageSid).fetch();
        console.log('------------------------------------------------');
        console.log('Status:   ', message.status.toUpperCase());
        console.log('To:       ', message.to);
        console.log('From:     ', message.from);
        console.log('Body:     ', message.body);
        console.log('Error Code:', message.errorCode);
        console.log('Error Msg: ', message.errorMessage);
        console.log('------------------------------------------------');

        if (message.status === 'undelivered' || message.status === 'failed') {
            console.log('❌ Message FAILED to deliver.');
        } else if (message.status === 'sent' || message.status === 'delivered') {
            console.log('✅ Message reported as SENT to carrier.');
        }
    } catch (error) {
        console.error('Error fetching status:', error.message);
    }
}

checkStatus();
