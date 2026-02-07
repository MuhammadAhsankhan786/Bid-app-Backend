
import twilio from 'twilio';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = join(__dirname, '../../.env');
dotenv.config({ path: envPath });

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

async function checkCaps() {
    try {
        console.log('Checking Incoming Phone Numbers...');
        const numbers = await client.incomingPhoneNumbers.list({ limit: 5 });

        numbers.forEach(n => {
            console.log(`\nNumber: ${n.phoneNumber}`);
            console.log(`Capabilities:`, n.capabilities);
        });
    } catch (e) {
        console.log(e);
    }
}

checkCaps();
