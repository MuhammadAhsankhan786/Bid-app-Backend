
import twilio from 'twilio';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = join(__dirname, '../../.env');
dotenv.config({ path: envPath });

console.log('🔍 Testing WhatsApp OTP via Notify/Verify...\n');

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const verifySid = process.env.TWILIO_VERIFY_SID;
const phone = '+9647700914000';

const client = twilio(accountSid, authToken);

async function testWhatsApp() {
    try {
        console.log(`Sending WhatsApp OTP to ${phone}...`);

        // Try standard verify with channel: 'whatsapp'
        const verification = await client.verify.v2
            .services(verifySid)
            .verifications
            .create({
                to: phone,
                channel: 'whatsapp'
            });

        console.log('✅ WhatsApp Request Accepted!');
        console.log('Status:', verification.status);
        console.log('Sid:', verification.sid);
        console.log('\nPlease check WhatsApp on the device.');

    } catch (error) {
        console.error('\n❌ FAILED WhatsApp Delivery');
        console.error('Code:', error.code);
        console.error('Message:', error.message);
    }
}

testWhatsApp();
