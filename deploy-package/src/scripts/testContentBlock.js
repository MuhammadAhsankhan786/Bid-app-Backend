
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

async function testContent() {
    try {
        console.log('🔍 Testing Content Block ("BidMaster")...\n');

        // 1. Get Messaging Service
        const services = await client.messaging.v1.services.list({ limit: 50 });
        const mgService = services.find(s => s.friendlyName === 'BidMaster OTP Sender');
        if (!mgService) throw new Error('Service not found');

        console.log(`Using Service: ${mgService.sid}`);

        // 2. Send Message with "BidMaster" in body
        const body = 'Your BidMaster verification code is: 123456';
        console.log(`Sending body: "${body}"`);

        const message = await client.messages.create({
            body: body,
            messagingServiceSid: mgService.sid,
            to: phone
        });

        console.log('✅ CONTENT SENT! "BidMaster" word is NOT blocked.');
        console.log('SID:', message.sid);

    } catch (error) {
        console.error('❌ Failed (Content might be blocked):');
        console.error(error.message);
        console.error('Code:', error.code);
    }
}

testContent();
