
import twilio from 'twilio';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = join(__dirname, '../../.env');
dotenv.config({ path: envPath });

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

async function searchAltNumbers() {
    try {
        console.log('🔍 Searching for Sweden (+46) Mobile Numbers...');
        const seNumbers = await client.availablePhoneNumbers('SE')
            .mobile.list({ limit: 2 });
        seNumbers.forEach(n => console.log(`   🇸🇪 ${n.phoneNumber}`));

        console.log('\n🔍 Searching for Belgium (+32) Mobile Numbers...');
        const beNumbers = await client.availablePhoneNumbers('BE')
            .mobile.list({ limit: 2 });
        beNumbers.forEach(n => console.log(`   🇧🇪 ${n.phoneNumber}`));

        console.log('\n🔍 Searching for Poland (+48) Mobile Numbers...');
        const plNumbers = await client.availablePhoneNumbers('PL')
            .mobile.list({ limit: 2 });
        plNumbers.forEach(n => console.log(`   🇵🇱 ${n.phoneNumber}`));

    } catch (e) {
        console.log('Error searching:', e.message);
    }
}

searchAltNumbers();
