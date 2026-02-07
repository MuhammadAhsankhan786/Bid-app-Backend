
import twilio from 'twilio';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = join(__dirname, '../../.env');
dotenv.config({ path: envPath });

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

console.log('Testing WhatsApp...');

client.verify.v2.services(process.env.TWILIO_VERIFY_SID)
    .verifications
    .create({ to: '+9647700914000', channel: 'whatsapp' })
    .then(verification => console.log('✅ SUCCESS:', verification.status))
    .catch(error => {
        console.log('❌ ERROR:');
        console.log(error.code);
        console.log(error.message);
    });
