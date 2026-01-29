
import twilio from 'twilio';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = join(__dirname, '../../.env');
dotenv.config({ path: envPath });

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const phone = '+9647700914000';

const client = twilio(accountSid, authToken);

async function checkSafeList() {
    try {
        console.log(`Checking if ${phone} is in Safe List...`);
        // Note: Fetch requires phoneNumber passed to the factory method usually
        const result = await client.verify.v2.safelist(phone).fetch();
        console.log('✅ Found in Safe List!');
        console.log('SID:', result.sid);
        console.log('Phone:', result.phoneNumber);
    } catch (error) {
        console.error('❌ Not found in Safe List or Error:');
        console.error(error.message);
    }
}

checkSafeList();
