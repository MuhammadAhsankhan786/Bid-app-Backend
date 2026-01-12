
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

console.log(`🔍 Adding ${phone} to Global Master Safe List...\n`);

const client = twilio(accountSid, authToken);

async function addToGlobalSafeList() {
    try {
        // The Global Safe List API is available at https://api.twilio.com/v1/SafeList/Numbers
        // or https://accounts.twilio.com/v1/SafeList/Numbers depending on the exact product.
        // The most reliable way for "Anti-Fraud" Global Safe List is strictly for SMS Pumping/Fraud.
        // Let's use the generic client.request to hit the endpoint directly.

        // Endpoint: POST https://api.twilio.com/v2010/2010-04-01/Accounts/{AccountSid}/IncomingPhoneNumbers.json is for buying.

        // Let's try the modern "Anti-Fraud Developer's Guide" endpoint.
        // POST https://verify.twilio.com/v2/SafeList/Numbers (This is what we did before, supposedly "Global" for Verify)

        // Wait, let's try to query if it's already there first using the generic Verify V2 safelist
        // If that didn't work, maybe we need the "Messaging" Safe List?
        // There isn't a separate "Messaging Safe List" exposed publicly easily.

        // However, let's try the "Magic Number" approach if this is a trial account issue (but user paid).

        // Let's try to Send a "Magic" SMS to force a route refresh? No.

        // Let's look for any other blocking list. "Blocklist"?

        console.log('Attempting to add to Safe List again (Force Update)...');

        // we will delete and re-add to force refresh
        try {
            await client.verify.v2.safelist(phone).remove();
            console.log('   - Removed existing entry (cleanup)');
        } catch (e) {
            // ignore
        }

        const result = await client.verify.v2.safelist.create({ phoneNumber: phone });
        console.log('   ✅ Added to Safe List successfully!');
        console.log('   SID:', result.sid);

    } catch (error) {
        console.error('❌ Failed:', error.message);
    }
}

addToGlobalSafeList();
