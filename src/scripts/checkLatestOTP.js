import { TwilioService } from '../services/twilioService.js';
import pool from '../config/db.js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = join(__dirname, '../../.env');
dotenv.config({ path: envPath });

async function checkOTP() {
    try {
        console.log(`Checking TOP 5 DB Records...`);
        const res = await pool.query(
            'SELECT * FROM verification_codes ORDER BY expires_at DESC LIMIT 5'
        );

        if (res.rows.length > 0) {
            console.log('✅ Recent Records:');
            console.table(res.rows);
        } else {
            console.log('❌ No records found.');
        }

        const messagingConfig = {
            accountSid: process.env.TWILIO_ACCOUNT_SID ? 'Set' : 'Missing',
            authToken: process.env.TWILIO_AUTH_TOKEN ? 'Set' : 'Missing',
            verifySid: process.env.TWILIO_VERIFY_SID ? 'Set' : 'Missing'
        };
        console.log('Twilio Config:', messagingConfig);

    } catch (error) {
        console.error('Error checking OTP:', error);
    } finally {
        pool.end();
    }
}

checkOTP();
