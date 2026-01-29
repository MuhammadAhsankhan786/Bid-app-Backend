
import pool from '../config/db.js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = join(__dirname, '../../.env');
dotenv.config({ path: envPath });

const phone = '+9647700914000';

async function getLatestOTP() {
    console.log(`🔍 Fetching stored OTP for ${phone}...`);
    try {
        const res = await pool.query(`
            SELECT code, expires_at 
            FROM verification_codes 
            WHERE phone = $1
        `, [phone]);

        if (res.rows.length > 0) {
            const { code, expires_at } = res.rows[0];
            const now = new Date();
            const expiry = new Date(expires_at);
            const timeLeft = Math.floor((expiry - now) / 1000);

            console.log('\n==========================================');
            console.log(`🔐 OTP CODE: ${code}`);
            console.log(`⏳ Expires in: ${timeLeft} seconds`);
            console.log('==========================================\n');

            if (timeLeft < 0) {
                console.log('⚠️ Warning: This OTP has expired!');
            } else {
                console.log('✅ VALID - Use this to login!');
            }
        } else {
            console.log('❌ No OTP found in database for this number.');
        }
    } catch (error) {
        console.error('❌ Database Error:', error.message);
    }
    process.exit(0);
}

getLatestOTP();
