
import twilio from 'twilio';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = join(__dirname, '../../.env');
dotenv.config({ path: envPath });

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

// The WORKING Service SID (formerly BidMaster OTP V2)
const serviceSid = 'VA103b039cce3291606c24f9b0dcf3356c';
const newName = 'IRAQ BID';

async function rename() {
    try {
        console.log(`Renaming Service ${serviceSid}...`);
        console.log(`Old Name: 'BidMaster OTP V2'`);
        console.log(`New Name: '${newName}'`);

        const service = await client.verify.v2.services(serviceSid)
            .update({ friendlyName: newName });

        console.log('✅ Success! Service renamed.');
        console.log(`Current Name: ${service.friendlyName}`);
        console.log('\nAb WhatsApp message ayega: "Your Iraq Bid verification code is..."');

    } catch (e) {
        console.error('Error:', e.message);
    }
}

rename();
