
import { TwilioService } from '../services/twilioService.js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = join(__dirname, '../../.env');
dotenv.config({ path: envPath });

console.log('🔍 Testing OTP Send (via TwilioService)\n');

const phone = '+9647700914000';

async function testSend() {
    try {
        console.log(`Attempting to send OTP to ${phone}...`);

        // Use the Service (which now uses Custom OTP logic)
        const result = await TwilioService.sendOTP(phone);

        console.log('✅ Success!');
        console.log(result);
    } catch (error) {
        console.error('\n❌ FAILED TO SEND OTP');
        console.error('Message:', error.message);
        console.error('Details:', error);
    }
}

testSend();
