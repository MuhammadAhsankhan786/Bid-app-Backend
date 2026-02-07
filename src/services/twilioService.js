
import twilio from 'twilio';
import dotenv from 'dotenv';

// Ensure env vars are loaded if not already
dotenv.config();

// Initialize Twilio client
let twilioClient = null;
if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
  twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  console.log('✅ Twilio client initialized (WhatsApp Verify Mode)');
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

export const TwilioService = {
  /**
   * Send OTP using Twilio Verify (WhatsApp Channel)
   */
  async sendOTP(phoneNumber) {
    if (!twilioClient) throw new Error('Twilio client not initialized');

    try {
      const formattedPhone = normalizeIraqPhone(phoneNumber);
      console.log(`[Twilio] Requesting WhatsApp OTP for: ${formattedPhone}`);

      // Use Twilio Verify API with 'whatsapp' channel
      // Relying on the correct Service SID (VA...) being in .env
      const verification = await twilioClient.verify.v2
        .services(process.env.TWILIO_VERIFY_SID)
        .verifications
        .create({ to: formattedPhone, channel: 'whatsapp' });

      console.log(`[Twilio] OTP Sent successfully! SID: ${verification.sid}, Status: ${verification.status}`);

      return {
        success: true,
        message: 'OTP sent via WhatsApp successfully',
        details: verification.status
      };

    } catch (error) {
      console.error('[Twilio] Send OTP Error:', error);

      if (error.code === 60200) {
        throw new Error('Invalid phone number format for WhatsApp.');
      }

      throw new Error(`Failed to send OTP verify: ${error.message} (Code: ${error.code})`);
    }
  },

  /**
   * Verify OTP using Twilio Verify
   */
  async verifyOTP(phoneNumber, code) {
    if (!twilioClient) throw new Error('Twilio client not initialized');

    try {
      const formattedPhone = normalizeIraqPhone(phoneNumber);
      console.log(`[Twilio] Verifying code for: ${formattedPhone}`);

      const verificationCheck = await twilioClient.verify.v2
        .services(process.env.TWILIO_VERIFY_SID)
        .verificationChecks
        .create({ to: formattedPhone, code: code });

      if (verificationCheck.status === 'approved') {
        console.log('[Twilio] Verification Successful!');
        return {
          success: true,
          status: 'approved',
          message: 'OTP Verified Successfully'
        };
      } else {
        console.warn(`[Twilio] Verification Failed. Status: ${verificationCheck.status}`);
        return {
          success: false,
          status: verificationCheck.status,
          message: 'Invalid OTP or expired'
        };
      }

    } catch (error) {
      console.error('[Twilio] Verify OTP Error:', error);

      if (error.code === 20404) {
        return { success: false, message: 'OTP Expired or Not Found' };
      }

      throw new Error(`Verification failed: ${error.message}`);
    }
  },

  // Helper alias if needed by other files
  normalizePhoneNumber: normalizeIraqPhone
};
