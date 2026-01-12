
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

console.log('🔍 Creating Fresh Verify Service & Testing...\n');

const client = twilio(accountSid, authToken);

async function createAndTest() {
    try {
        // 1. Create New Service
        console.log('1. Creating new service "BidMaster OTP V2"...');
        const service = await client.verify.v2.services.create({
            friendlyName: 'BidMaster OTP V2'
        });
        console.log('   ✅ Created Service SID:', service.sid);

        // 2. Test Sending OTP
        console.log('2. Attempting to send OTP with NEW Service...');
        const verification = await client.verify.v2
            .services(service.sid)
            .verifications
            .create({
                to: phone,
                channel: 'sms'
            });

        console.log('   ✅ SUCCESS! OTP Sent with new service.');
        console.log('   Status:', verification.status);
        console.log('\n--> SOLUTION FOUND: Replace TWILIO_VERIFY_SID in .env with:', service.sid);

    } catch (error) {
        console.error('   ❌ Failed with new service as well.');
        console.error('   Error:', error.message);
        console.error('   Code:', error.code);
    }
}

createAndTest();
