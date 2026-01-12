
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
const phone = '+9647700914000';

const client = twilio(accountSid, authToken);

async function sendNeutralTest() {
    try {
        console.log('🔍 Sending Neutral Test Message ("Hello")...\n');

        // We try to find our numeric sender or service
        // Just use the first available number directly to be explicit
        const numbers = await client.incomingPhoneNumbers.list({ limit: 1 });
        let fromNumber = '';

        if (numbers.length > 0) {
            fromNumber = numbers[0].phoneNumber;
            console.log(`Using Sender: ${fromNumber}`);
        } else {
            throw new Error('No Twilio Phone Number found.');
        }

        const message = await client.messages.create({
            body: 'Hello from Tech Support. Can you see this?',
            from: fromNumber,
            to: phone
        });

        console.log('✅ NEUTRAL MESSAGE SENT!');
        console.log('SID:', message.sid);
        console.log('Status:', message.status);

    } catch (error) {
        console.error('❌ Failed:', error.message);
    }
}

sendNeutralTest();
