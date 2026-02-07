
import twilio from 'twilio';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = join(__dirname, '../../.env');
dotenv.config({ path: envPath });

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

// SID for "BidMaster OTP V2" which showed WhatsApp Enabled
const oldServiceSid = 'VA103b039cce3291606c24f9b0dcf3356c';
const phone = '+9647700914000';

console.log(`Testing WhatsApp on Service: ${oldServiceSid}...`);

client.verify.v2.services(oldServiceSid)
    .verifications
    .create({ to: phone, channel: 'whatsapp' })
    .then(verification => {
        console.log('✅ SUCCESS!');
        console.log('Status:', verification.status);
        console.log('Sid:', verification.sid);
    })
    .catch(error => {
        console.log('❌ ERROR:');
        console.log(error.code);
        console.log(error.message);
    });
