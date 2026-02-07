
import twilio from 'twilio';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = join(__dirname, '../../.env');
dotenv.config({ path: envPath });

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

async function listServices() {
    try {
        console.log('🔍 Listing Messaging Services...');
        const services = await client.messaging.v1.services.list({ limit: 5 });

        if (services.length === 0) {
            console.log('❌ No Messaging Services found.');
        } else {
            services.forEach(s => {
                console.log('--------------------------------');
                console.log(`Name: ${s.friendlyName}`);
                console.log(`SID:  ${s.sid}`);
            });
            console.log('--------------------------------');
        }
    } catch (e) {
        console.log('Error:', e.message);
    }
}

listServices();
