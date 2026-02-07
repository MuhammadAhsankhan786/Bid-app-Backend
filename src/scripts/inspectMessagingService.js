
import twilio from 'twilio';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = join(__dirname, '../../.env');
dotenv.config({ path: envPath });

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

const createdServiceSid = 'MG40268ad8be9b49228be93cf856c522b2'; // IRAQ BID OTP Sender

async function inspectSenders() {
    try {
        console.log(`🔍 Inspecting Senders for Service: ${createdServiceSid}`);
        const phoneNumbers = await client.messaging.v1.services(createdServiceSid)
            .phoneNumbers.list();

        if (phoneNumbers.length === 0) {
            console.log('   ❌ No Phone Numbers in this Service.');
        } else {
            phoneNumbers.forEach(p => {
                console.log(`   📞 Number: ${p.phoneNumber} (Sid: ${p.sid})`);
            });
        }

    } catch (e) {
        console.log('Error:', e.message);
    }
}

inspectSenders();
