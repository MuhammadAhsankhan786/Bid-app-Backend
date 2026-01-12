
import twilio from 'twilio';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = join(__dirname, '../../.env');
dotenv.config({ path: envPath });

console.log('🔍 Configuring Verify Routing via Messaging Service...\n');

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const verifySid = process.env.TWILIO_VERIFY_SID;

const client = twilio(accountSid, authToken);

async function setupRouting() {
    try {
        // 1. Find the Account's Phone Number
        console.log('1. Finding valid phone number...');
        const numbers = await client.incomingPhoneNumbers.list({ limit: 1 });
        if (numbers.length === 0) {
            throw new Error('No phone numbers found in account. Cannot create Messaging Service routing.');
        }
        const myNumber = numbers[0];
        console.log(`   ✅ Found Number: ${myNumber.phoneNumber} (${myNumber.sid})`);

        // 2. Create Messaging Service
        console.log('2. Creating Messaging Service "BidMaster OTP Sender"...');
        const msgService = await client.messaging.v1.services.create({
            friendlyName: 'BidMaster OTP Sender'
        });
        console.log(`   ✅ Created Messaging Service: ${msgService.sid}`);

        // 3. Add Phone Number to Messaging Service
        console.log('3. Adding Number to Messaging Service...');
        await client.messaging.v1.services(msgService.sid).phoneNumbers.create({
            phoneNumberSid: myNumber.sid
        });
        console.log('   ✅ Number added to Messaging Service.');

        // 4. Update Verify Service to use this Messaging Service
        //    Twilio Verify V2 Service has a property 'defaultTemplateSid' but mainly we are looking for logic
        //    that forces SMS to use the messaging service.
        //    Wait, the `services(sid).update(...)` method accepts `defaultRouting` or similar? 
        //    Actually, we update it via `messagingConfigurations`.

        console.log('4. Linking Verify Service to Messaging Service...');

        // Check for existing configs first
        const configs = await client.verify.v2.services(verifySid)
            .messagingConfigurations.list();

        // Create or Update configuration for Iraq (+964)
        // Actually, setting it for "all" isn't direct, we usually set by country.
        // Let's set it for Iraq (+964) specifically.

        const country = 'IQ'; // Iraq

        // Check if configuration exists for IQ
        const existing = configs.find(c => c.country === country);

        if (existing) {
            console.log(`   Updating existing config for ${country}...`);
            await client.verify.v2.services(verifySid)
                .messagingConfigurations(country)
                .update({
                    messagingServiceSid: msgService.sid
                });
        } else {
            console.log(`   Creating new config for ${country}...`);
            await client.verify.v2.services(verifySid)
                .messagingConfigurations.create({
                    country: country,
                    messagingServiceSid: msgService.sid
                });
        }

        console.log('   ✅ Verify Service Routing Updated for Iraq!');
        console.log('\nSUCCESS! Verify messages to Iraq will now route via your US Number.');

    } catch (error) {
        console.error('❌ Failed:', error.message);
        if (error.code) console.error('Code:', error.code);
    }
}

setupRouting();
