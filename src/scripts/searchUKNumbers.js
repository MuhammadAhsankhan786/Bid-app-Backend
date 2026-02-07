
import twilio from 'twilio';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = join(__dirname, '../../.env');
dotenv.config({ path: envPath });

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

async function searchNumbers() {
    try {
        console.log('🔍 Searching for UK (+44) Numbers...');
        const numbers = await client.availablePhoneNumbers('GB')
            .local.list({ limit: 3 });

        numbers.forEach(n => {
            console.log(`\n🇬🇧 Number: ${n.phoneNumber}`);
            console.log(`   Location: ${n.locality || 'General'}`);
            console.log(`   Type:     Local`);
        });

    } catch (e) {
        console.log('Error searching:', e.message);
    }
}

searchNumbers();
