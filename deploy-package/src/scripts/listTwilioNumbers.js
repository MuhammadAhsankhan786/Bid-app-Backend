
import twilio from 'twilio';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = join(__dirname, '../../.env');
dotenv.config({ path: envPath });

console.log('🔍 Listing Account Phone Numbers...\n');

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;

const client = twilio(accountSid, authToken);

async function listNumbers() {
    try {
        const numbers = await client.incomingPhoneNumbers.list({ limit: 5 });

        if (numbers.length === 0) {
            console.log('❌ No phone numbers found in this account.');
            console.log('   (Verify can work without numbers, but raw SMS cannot)');
        } else {
            console.log(`✅ Found ${numbers.length} numbers:`);
            numbers.forEach(num => {
                console.log(`   - ${num.phoneNumber} (${num.friendlyName})`);
            });
        }
    } catch (error) {
        console.error('Error listing numbers:', error.message);
    }
}

listNumbers();
