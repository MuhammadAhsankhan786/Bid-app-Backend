
import twilio from 'twilio';
import pool from '../config/db.js'; // Import existing DB pool

// Initialize Twilio client
let twilioClient = null;
if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
  twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  console.log('✅ Twilio client initialized (Custom OTP Mode)');
} else {
  console.warn('⚠️ Twilio client NOT initialized. Missing Credentials');
}

/**
 * Normalize Iraq phone number to +964 format
 */
function normalizeIraqPhone(phone) {
  if (!phone) return phone;
  let normalized = phone.trim();
  if (normalized.startsWith('+964')) return normalized;
  if (normalized.startsWith('964')) return '+' + normalized;
  if (normalized.startsWith('00964')) return '+964' + normalized.substring(5);
  if (normalized.startsWith('0')) return '+964' + normalized.substring(1);
  return normalized;
}

/**
 * Generate a random 6-digit OTP
 */
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export const TwilioService = {
  /**
   * Send OTP using Custom Logic + Raw SMS
   * (Bypassing Twilio Verify due to Iraq Blocking issues)
   */
  async sendOTP(phone) {
    console.log(`[CUSTOM OTP] Request to send OTP to ${phone}`);
    const normalizedPhone = normalizeIraqPhone(phone);

    // 1. Generate Code
    const code = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    try {
      // 2. Store in Database (Upsert)
      await pool.query(`
        INSERT INTO verification_codes (phone, code, expires_at)
        VALUES ($1, $2, $3)
        ON CONFLICT (phone) 
        DO UPDATE SET code = $2, expires_at = $3
      `, [normalizedPhone, code, expiresAt]);

      console.log(`[CUSTOM OTP] Code generated and stored for ${normalizedPhone}`);

      // 3. Send via Raw SMS (Programmable Messaging)
      // This uses the Account's Global Sender (or specific number if available)
      // We explicitly prefer a number if we know one, to avoid Alpha Sender ID blocks.
      // But usually 'from' left empty uses the default messaging service or a number?
      // No, creating a message requires 'from' or 'messagingServiceSid'.

      // We will try to find a valid 'from' source.
      // Option A: Use the Messaging Service we created earlier (Best)
      // Option B: Query for an outgoing number.

      // Let's use a hardcoded fallback or lookup? 
      // Safe bet: Use the Messaging Service SID we know works, or find one dynamically.
      // Actually, to make it robust, lets query for our 'BidMaster OTP Sender' service SID dynamically
      // or fall back to the first available number.

      let fromParams = {};

      // Try to find our specific Messaging Service
      try {
        const services = await twilioClient.messaging.v1.services.list({ limit: 20 });
        const myService = services.find(s => s.friendlyName === 'BidMaster OTP Sender');
        if (myService) {
          fromParams = { messagingServiceSid: myService.sid };
          console.log(`[CUSTOM OTP] Using Messaging Service: ${myService.sid}`);
        } else {
          // Fallback to first number
          const numbers = await twilioClient.incomingPhoneNumbers.list({ limit: 1 });
          if (numbers.length > 0) {
            fromParams = { from: numbers[0].phoneNumber };
            console.log(`[CUSTOM OTP] Using Number: ${numbers[0].phoneNumber}`);
          } else {
            throw new Error('No SMS capability found (No Messaging Service or Numbers).');
          }
        }
      } catch (e) {
        console.warn('[CUSTOM OTP] Error finding sender, trying default...', e.message);
        // If generic error, we might fail on create.
      }

      const message = await twilioClient.messages.create({
        body: `Your BidMaster verification code is: ${code}`,
        to: normalizedPhone,
        ...fromParams
      });

      console.log(`[CUSTOM OTP] SMS Sent! SID: ${message.sid}`);

      return {
        success: true,
        message: 'OTP sent successfully (via SMS)'
      };

    } catch (error) {
      console.error(`[CUSTOM OTP ERROR] Failed to send to ${normalizedPhone}:`, error.message);

      // Map to friendly errors
      if (error.code === 21608) {
        throw new Error('This number is unverified (Trial Account). Please verify it in Twilio Console.');
      } else if (error.code === 21408) {
        throw new Error('Permission to send SMS to this region is not enabled in Twilio Geo Permissions.');
      }

      // Provide more user-friendly error messages
      if (error.code === 30008) {
        throw new Error('Unable to deliver SMS to this number. Please check your phone number or contact support.');
      } else if (error.code === 21211 || error.code === 21212) {
        throw new Error('Invalid phone number format. Please check and try again.');
      } else {
        throw new Error(`Unable to send SMS. Please try again later. (Error: ${error.code || 'Unknown'})`);
      }
    }
  },

  /**
   * Verify OTP using Database Check
   */
  async verifyOTP(phone, code) {
    const normalizedPhone = normalizeIraqPhone(phone);
    console.log(`[CUSTOM OTP] Verifying code for ${normalizedPhone}`);

    try {
      // 1. Fetch from DB
      const res = await pool.query(`
        SELECT code, expires_at FROM verification_codes 
        WHERE phone = $1
      `, [normalizedPhone]);

      if (res.rows.length === 0) {
        return { success: false, status: 'failed', message: 'No OTP found for this number' };
      }

      const record = res.rows[0];

      // 2. Check Expiry
      if (new Date() > new Date(record.expires_at)) {
        return { success: false, status: 'expired', message: 'OTP has expired' };
      }

      // 3. Check Match
      if (record.code === code) {
        // Success! Delete the code so it can't be reused
        await pool.query('DELETE FROM verification_codes WHERE phone = $1', [normalizedPhone]);

        return {
          success: true,
          status: 'approved',
          message: 'OTP verified successfully'
        };
      } else {
        return { success: false, status: 'failed', message: 'Invalid OTP code' };
      }

    } catch (error) {
      console.error(`[CUSTOM OTP VERIFY ERROR]`, error.message);
      throw new Error('Internal Server Error during verification');
    }
  }
};
