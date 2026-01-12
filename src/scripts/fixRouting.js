
import twilio from 'twilio';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = join(__dirname, '../../.env');
dotenv.config({ path: envPath });

console.log('🔍 Fixing Verify Routing (Robust)...\n');

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const verifySid = process.env.TWILIO_VERIFY_SID;

const client = twilio(accountSid, authToken);

async function fixRouting() {
    try {
        // 1. Find the Account's Phone Number
        console.log('1. Finding valid phone number...');
        const numbers = await client.incomingPhoneNumbers.list({ limit: 1 });
        if (numbers.length === 0) throw new Error('No phone numbers found.');
        const myNumber = numbers[0];
        console.log(`   ✅ Found Number: ${myNumber.phoneNumber} (${myNumber.sid})`);

        let msgServiceSid = null;

        // 2. Check if number is already in a Messaging Service
        //    We can't easily query "which service has this number", so we'll just try to create a new one
        //    and if it fails, we'll try to find the existing one.
        //    Actually, simpler: List messaging services and see if we created one called "BidMaster OTP Sender".

        console.log('2. Finding existing Messaging Service...');
        const services = await client.messaging.v1.services.list({ limit: 50 });
        const existing = services.find(s => s.friendlyName === 'BidMaster OTP Sender');

        if (existing) {
            console.log(`   ✅ Found existing service: ${existing.sid}`);
            msgServiceSid = existing.sid;

            // Ensure number is in it?
            // If the number was added before, we are good. If not, we might fail adding it if it's elsewhere.
            // Let's just try to add it, ignore error if already there.
            try {
                await client.messaging.v1.services(msgServiceSid).phoneNumbers.create({
                    phoneNumberSid: myNumber.sid
                });
                console.log('   ✅ Number added to Messaging Service.');
            } catch (e) {
                console.log('   ⚠️ Number might already be in this service or another (ignoring).');
            }

        } else {
            console.log('   Creating NEW Messaging Service...');
            const newService = await client.messaging.v1.services.create({
                friendlyName: 'BidMaster OTP Sender'
            });
            msgServiceSid = newService.sid;
            console.log(`   ✅ Created: ${msgServiceSid}`);

            // Add number
            try {
                await client.messaging.v1.services(msgServiceSid).phoneNumbers.create({
                    phoneNumberSid: myNumber.sid
                });
                console.log('   ✅ Number added to Messaging Service.');
            } catch (e) {
                console.log('   ⚠️ Could not add number (might be in use). Proceeding anyway...');
            }
        }

        // 3. Update Verify Service to use this Messaging Service (Force Update)
        console.log('3. Linking Verify Service -> Messaging Service...');
        const country = 'IQ';

        // First try to delete any existing config for IQ to start fresh
        try {
            await client.verify.v2.services(verifySid)
                .messagingConfigurations(country)
                .remove();
            console.log('   - Cleared old config (if any)');
        } catch (e) {
            // ignore
        }

        // Create new config
        console.log(`   Creating new config for ${country} with Service ${msgServiceSid}...`);
        try {
            await client.verify.v2.services(verifySid)
                .messagingConfigurations.create({
                    country: country,
                    messagingServiceSid: msgServiceSid
                });
            console.log('   ✅ Verify Service Routing Updated for Iraq!');
            console.log('\nSUCCESS! Verify messages to Iraq will now route via your US Number.');

        } catch (e) {
            console.error('   ❌ Failed to link config:', e.message);
            console.error('      Verify Service: ' + verifySid);
            console.error('      Msg Service: ' + msgServiceSid);
        }

    } catch (error) {
        console.error('❌ Failed:', error.message);
    }
}

fixRouting();
