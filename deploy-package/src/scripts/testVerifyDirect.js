
import twilio from 'twilio';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = join(__dirname, '../../.env');
dotenv.config({ path: envPath });

console.log('🔍 Testing Direct Verify API (Sender ID Check)...\n');

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const verifySid = process.env.TWILIO_VERIFY_SID;
const phone = '+9647700914000';

const client = twilio(accountSid, authToken);

async function testDirectVerify() {
    try {
        console.log(`Sending Verify Request to ${phone}...`);
        console.log(`Service SID: ${verifySid}`);

        // This calculates the signature of the request implicitly
        const verification = await client.verify.v2
            .services(verifySid)
            .verifications
            .create({
                to: phone,
                channel: 'sms'
            });

        console.log('✅ Success! Verify API Accepted Request.');
        console.log('Status:', verification.status);
        console.log('Sid:', verification.sid);
        console.log('\nIf you receive this SMS, "Auth" Sender ID works!');

    } catch (error) {
        console.error('\n❌ FAILED - Sender ID Likely Blocked');
        console.error('Code:', error.code);
        console.error('Message:', error.message);
    }
}

testDirectVerify();
