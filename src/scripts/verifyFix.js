
import { TwilioService } from '../services/twilioService.js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = join(__dirname, '../../.env');
dotenv.config({ path: envPath });

console.log('🔍 Verifying Fix for Blocked SMS\n');

async function testFix() {
    const phone = '+9647700914000';
    try {
        console.log(`Attempting to send OTP to ${phone} using TwilioService...`);
        await TwilioService.sendOTP(phone);
        console.log('✅ Success! (Unexpected if number is still blocked)');
    } catch (error) {
        console.log('\n✅ CAUGHT ERROR (This is good):');
        console.log('---------------------------------------------------');
        console.log(error.message);
        console.log('---------------------------------------------------');

        if (error.message.includes('SMS blocked by Twilio')) {
            console.log('\n🎉 PASS: logic correctly identified the blocked error!');
        } else {
            console.log('\n❌ FAIL: Did not get the expected specific error message.');
        }
    }
}

testFix();
