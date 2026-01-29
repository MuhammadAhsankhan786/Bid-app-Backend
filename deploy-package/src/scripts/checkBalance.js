
import twilio from 'twilio';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = join(__dirname, '../../.env');
dotenv.config({ path: envPath });

console.log('🔍 Checking Twilio Balance\n');

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;

const client = twilio(accountSid, authToken);

async function checkBalance() {
    try {
        const balance = await client.api.v2010.accounts(accountSid).balance.fetch();
        console.log('Account Balance:', balance.balance, balance.currency);
    } catch (error) {
        console.error('Error fetching balance:', error.message);
    }
}

checkBalance();
