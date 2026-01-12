
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
const phone = '+9647700914000';

console.log(`🔍 Adding ${phone} to Twilio Safe List...`);

const client = twilio(accountSid, authToken);

async function addToSafeList() {
    try {
        // Attempt to add to Global Safe List
        // Note: The Twilio Node helper library might not have a direct 'safelist' helper on client.monitor or similar
        // depending on version, but usually it is under client.messaging or similar, or we use raw request.
        // Actually, per docs it is often: client.trusthub... or plain http request if SDK missing it.
        // Let's rely on the generic 'request' method if specific helper is missing, 
        // BUT standard way in newer lib is: client.verify.v2.safelist(...)

        // Let's try the Verify V2 SafeList API first (since it's a Verify block)
        // Docs: https://www.twilio.com/docs/verify/api/safelist

        console.log('Attempting verify.v2.safelist...');
        const result = await client.verify.v2.safelist
            .create({ phoneNumber: phone });

        console.log('✅ Successfully added to Verify Safe List!');
        console.log('SID:', result.sid);
        console.log('Phone:', result.phoneNumber);

    } catch (error) {
        console.error('❌ Failed to add to Safe List via SDK helper.');
        console.error(error.message);

        // Fallback: Try direct API call if SDK method fails or doesn't exist
        // Expected endpoint: https://verify.twilio.com/v2/SafeList/Numbers
        console.log('\nCannot add automatically. Please try the Manual CURL command below in your terminal:');
        console.log('-------------------------------------------------------');
        const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
        console.log(`curl -X POST https://verify.twilio.com/v2/SafeList/Numbers \\
--data-urlencode "PhoneNumber=${phone}" \\
-u "${accountSid}:[HIDDEN_TOKEN]"`);
        console.log('-------------------------------------------------------');
    }
}

addToSafeList();
