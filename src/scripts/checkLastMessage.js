
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
const client = twilio(accountSid, authToken);

const targetPhone = '+9647700914000';

async function checkLastMessage() {
    console.log(`🔍 Checking last message sent to ${targetPhone}...`);

    try {
        const messages = await client.messages.list({
            to: targetPhone,
            limit: 1
        });

        if (messages.length === 0) {
            console.log('❌ No messages found for this number.');
            return;
        }

        const msg = messages[0];
        console.log('------------------------------------------------');
        console.log(`SID: ${msg.sid}`);
        console.log(`Date Sent: ${msg.dateCreated}`);
        console.log(`From: ${msg.from}`);
        console.log(`Status: ${msg.status.toUpperCase()}`);
        console.log(`Body: ${msg.body}`);

        if (msg.errorCode) {
            console.log(`❌ Error Code: ${msg.errorCode}`);
            console.log(`❌ Error Message: ${msg.errorMessage}`);
        } else {
            console.log('✅ No Error Code (yet).');
        }
        console.log('------------------------------------------------');

    } catch (error) {
        console.error('❌ Failed to fetch messages:', error.message);
    }
}

checkLastMessage();
