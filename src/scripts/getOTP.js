
import pg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = join(__dirname, '../../.env');
dotenv.config({ path: envPath });

const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

const phone = '+9647700914000';

async function getCode() {
    try {
        console.log(`🔍 Checking OTP for ${phone}...`);
        const res = await pool.query(`
      SELECT * FROM verification_codes 
      WHERE phone = $1
    `, [phone]);

        if (res.rows.length > 0) {
            const record = res.rows[0];
            console.log('--------------------------------');
            console.log('✅ OTP FOUND IN DB:');
            console.log(`   Code:       ${record.code}`);
            console.log(`   Expires At: ${record.expires_at}`);
            console.log('--------------------------------');
            console.log('👉 Aap ye code Client ko manually bata dein login ke liye.');
        } else {
            console.log('❌ No OTP found in database for this number.');
        }
    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        pool.end();
    }
}

getCode();
