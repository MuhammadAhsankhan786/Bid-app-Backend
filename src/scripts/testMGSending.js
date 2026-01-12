
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

// We need the SID of the Messaging Service we just created/found
// From logs: MG40268ad8be9b49228be93cf856c522b2 (This was the one found in fixRouting.js)
// Let's find it dynamically to be safe
const client = twilio(accountSid, authToken);

async function testMG() {
    try {
        console.log('🔍 Testing Raw SMS via Messaging Service...\n');

        // Find the service first
        const services = await client.messaging.v1.services.list({ limit: 50 });
        const mgService = services.find(s => s.friendlyName === 'BidMaster OTP Sender');

        if (!mgService) {
            throw new Error('Messaging Service not found!');
        }

        console.log(`Using Service: ${mgService.sid}`);

        const message = await client.messages.create({
            body: 'Test Code: 999999 (Via Messaging Service)',
            messagingServiceSid: mgService.sid,
            to: phone
        });

        console.log('✅ SMS SENT via Messaging Service!');
        console.log('SID:', message.sid);
        console.log('Status:', message.status);

    } catch (error) {
        console.error('❌ Failed via Messaging Service:');
        console.error(error.message);
        console.error('Code:', error.code);
    }
}

testMG();
