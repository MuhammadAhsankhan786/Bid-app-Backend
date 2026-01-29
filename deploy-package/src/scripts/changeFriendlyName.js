
import twilio from 'twilio';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = join(__dirname, '../../.env');
dotenv.config({ path: envPath });

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const verifySid = process.env.TWILIO_VERIFY_SID;

const client = twilio(accountSid, authToken);

async function changeName() {
    try {
        console.log(`Current Verify SID: ${verifySid}`);
        console.log('Renaming Service to "Iraq Bid"...');

        await client.verify.v2.services(verifySid)
            .update({ friendlyName: 'Iraq Bid' });

        console.log('✅ Service Renamed successfully.');

    } catch (error) {
        console.error('❌ Failed to rename:', error.message);
    }
}

changeName();
