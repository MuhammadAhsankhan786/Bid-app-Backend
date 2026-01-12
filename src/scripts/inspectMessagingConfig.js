
import twilio from 'twilio';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = join(__dirname, '../../.env');
dotenv.config({ path: envPath });

console.log('🔍 Inspecting Verify Messaging Config\n');

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const verifySid = process.env.TWILIO_VERIFY_SID;

const client = twilio(accountSid, authToken);

async function inspect() {
    try {
        const configs = await client.verify.v2.services(verifySid)
            .messagingConfigurations.list();

        console.log(`Found ${configs.length} Messaging Configurations:`);
        configs.forEach(config => {
            console.log('------------------------------------------------');
            console.log('Country:', config.country);
            console.log('Messaging Service SID:', config.messagingServiceSid);
            console.log(JSON.stringify(config, null, 2));
        });

        if (configs.length === 0) {
            console.log('No specific messaging configurations found (Using default)');
        }
    } catch (error) {
        console.error('Error fetching messaging configs:', error.message);
    }
}

inspect();
