
import twilio from 'twilio';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = join(__dirname, '../../.env');
dotenv.config({ path: envPath });

console.log('🔍 Disabling Fraud Guard on Verify Service...\n');

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const verifySid = process.env.TWILIO_VERIFY_SID;

const client = twilio(accountSid, authToken);

async function disableFraudGuard() {
    try {
        // Update the service to disable Fraud Guard (if exposed via API directly as a flag)
        // Fraud Guard is often controlled via the 'fraudBlockRequestEnabled' or similar flags in older APIs,
        // but in V2 it's often part of the 'lookupEnabled' or separate Fraud Guard API.
        // Let's try to update standard protection flags.

        // According to some docs, we might need to update the `defaultTemplateSid` or specific guard configurations.
        // However, the simplest "off" switch is ensuring we don't have strict checks.

        // There isn't a simple "fraudGuard: false" property on the Service resource in the public Node helper types 
        // that clearly maps to the "Fraud Guard" toggle in the UI (which is newer).
        // But we can try to update `doNotShareWarningEnabled` and others.

        // Let's print the current config first to see if we missed anything in the previous inspection.
        const service = await client.verify.v2.services(verifySid).fetch();

        console.log('Current Config:', JSON.stringify(service, null, 2));

        // If we cannot confirm a direct API flag for "Fraud Guard", we will print a message 
        // asking the user to double check the specific tab in UI.
        // BUT, we can try to force a SAFE LIST check.

        // Actually, earlier we added to SafeList.

        console.log('\nNOTE: The Twilio API does not allow toggling the main "Fraud Guard" switch directly via the standard SDK yet.');
        console.log('Please proceed to Twilio Console > Verify > Services > [Your Service] > Fraud Guard tab.');
        console.log('Ensure it is DISABLED.');

    } catch (error) {
        console.error('Error:', error.message);
    }
}

disableFraudGuard();
