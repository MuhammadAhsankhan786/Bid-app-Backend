import twilio from 'twilio';
import dotenv from 'dotenv';

dotenv.config();

// Initialize Twilio client (only if credentials are provided)
let twilioClient = null;
if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
  twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
}

export const TwilioService = {
  /**
   * Send OTP using Twilio Verify API
   * Uses verifications.create() to send OTP via SMS
   * 
   * IMPORTANT: Twilio Verify API does NOT require and does NOT allow a "from" number.
   * It uses the default sender configured in Twilio Verify Service.
   * 
   * @param {string} phone - Normalized phone number (e.g., +9647700914000)
   * @returns {Promise<{success: boolean, message?: string}>}
   */
  async sendOTP(phone) {
    // Validate Twilio configuration
    if (!twilioClient) {
      console.error('[ERROR] Twilio client not initialized. Please set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN');
      throw new Error('SMS service not configured');
    }

    if (!process.env.TWILIO_VERIFY_SID) {
      console.error('[ERROR] TWILIO_VERIFY_SID not configured');
      throw new Error('Twilio Verify Service SID not configured');
    }

    console.log("Using VERIFY SID:", process.env.TWILIO_VERIFY_SID);

    try {
      // Use Twilio Verify API to send OTP
      // NOTE: Twilio Verify does NOT use "from" field - it uses default sender from Verify Service
      const verification = await twilioClient.verify.v2
        .services(process.env.TWILIO_VERIFY_SID)
        .verifications
        .create({
          to: phone,
          channel: 'sms'
        });

      console.log(`[TWILIO VERIFY] OTP verification sent to ${phone}, Status: ${verification.status}`);
      
      return {
        success: true,
        message: 'OTP sent successfully'
      };
    } catch (error) {
      console.error(`[TWILIO VERIFY ERROR] Failed to send OTP to ${phone}:`, error.message);
      console.error(`[TWILIO VERIFY ERROR] Error code: ${error.code}, Status: ${error.status}`);
      
      // Handle specific Twilio errors
      if (error.code === 20404 || error.status === 404) {
        throw new Error(`Twilio Verify Service not found. Please check your TWILIO_VERIFY_SID (${process.env.TWILIO_VERIFY_SID}). The service may not exist in your Twilio account.`);
      } else if (error.code === 20003) {
        throw new Error('Twilio account credentials are invalid. Please check your TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN.');
      } else if (error.code === 21211) {
        throw new Error('Invalid phone number format. Please use E.164 format (e.g., +9647700914000).');
      } else if (error.code === 60200) {
        throw new Error('Twilio Verify Service configuration error. Please check your Verify Service settings in Twilio Console.');
      }
      
      throw new Error(`Failed to send OTP: ${error.message}`);
    }
  },

  /**
   * Verify OTP using Twilio Verify API
   * Uses verificationChecks.create() to verify the OTP code
   * 
   * @param {string} phone - Normalized phone number (e.g., +9647700914000)
   * @param {string} code - OTP code entered by user
   * @returns {Promise<{success: boolean, status: string, message?: string}>}
   */
  async verifyOTP(phone, code) {
    // Validate Twilio configuration
    if (!twilioClient) {
      console.error('[ERROR] Twilio client not initialized. Please set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN');
      throw new Error('SMS service not configured');
    }

    if (!process.env.TWILIO_VERIFY_SID) {
      console.error('[ERROR] TWILIO_VERIFY_SID not configured');
      throw new Error('Twilio Verify Service SID not configured');
    }

    try {
      // Use Twilio Verify API to verify OTP
      const verificationCheck = await twilioClient.verify.v2
        .services(process.env.TWILIO_VERIFY_SID)
        .verificationChecks
        .create({
          to: phone,
          code: code
        });

      console.log(`[TWILIO VERIFY] OTP verification check for ${phone}, Status: ${verificationCheck.status}`);

      if (verificationCheck.status === 'approved') {
        return {
          success: true,
          status: 'approved',
          message: 'OTP verified successfully'
        };
      } else {
        return {
          success: false,
          status: verificationCheck.status,
          message: 'Invalid or expired OTP'
        };
      }
    } catch (error) {
      console.error(`[TWILIO VERIFY ERROR] Failed to verify OTP for ${phone}:`, error.message);
      console.error(`[TWILIO VERIFY ERROR] Error code: ${error.code}, Status: ${error.status}`);
      
      // Twilio returns 404 if verification not found or expired
      if (error.code === 20404 || error.status === 404) {
        // Check if it's a service not found error or verification not found
        if (error.message.includes('Services') && error.message.includes('not found')) {
          throw new Error(`Twilio Verify Service not found. Please check your TWILIO_VERIFY_SID (${process.env.TWILIO_VERIFY_SID}). The service may not exist in your Twilio account.`);
        }
        return {
          success: false,
          status: 'not_found',
          message: 'OTP not found or expired. Please request a new OTP.'
        };
      } else if (error.code === 20003) {
        throw new Error('Twilio account credentials are invalid. Please check your TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN.');
      } else if (error.code === 60200) {
        throw new Error('Twilio Verify Service configuration error. Please check your Verify Service settings in Twilio Console.');
      }
      
      throw new Error(`Failed to verify OTP: ${error.message}`);
    }
  }
};
