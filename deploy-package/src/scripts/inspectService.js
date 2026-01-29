
import twilio from 'twilio';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = join(__dirname, '../../.env');
dotenv.config({ path: envPath });

console.log('🔍 Inspecting Twilio Verify Service Settings\n');

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const verifySid = process.env.TWILIO_VERIFY_SID;

const client = twilio(accountSid, authToken);

async function inspect() {
    try {
        const service = await client.verify.v2.services(verifySid).fetch();
        console.log('Service Friendly Name:', service.friendlyName);
        console.log('Service SID:', service.sid);
        console.log('------------------------------------------------');
        console.log(JSON.stringify(service, null, 2));
        console.log('------------------------------------------------');

    } catch (error) {
        console.error('Error fetching service:', error.message);
    }
}

inspect();
