
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
const verifySid = process.env.TWILIO_VERIFY_SID;

const client = twilio(accountSid, authToken);

async function resetRouting() {
    try {
        console.log('🔄 Resetting Verify Routing (Restoring Default Alpha ID)...');

        // We specifically added a config for 'IQ'. We need to delete it.
        // The API allows listing and deleting messaging configurations.

        // 1. List configs to find the SID for IQ or the Messaging Service
        console.log('   Checking specific country configs...');
        const country = 'IQ';

        try {
            await client.verify.v2.services(verifySid)
                .messagingConfigurations(country)
                .remove();
            console.log('   ✅ Removed Custom Routing for Iraq (IQ).');
            console.log('   Service will now use default Sender ID ("Auth").');
        } catch (error) {
            if (error.status === 404) {
                console.log('   ℹ️ No custom routing found for IQ (Already default).');
            } else {
                throw error;
            }
        }

    } catch (error) {
        console.error('❌ Failed to reset routing:', error.message);
    }
}

resetRouting();
