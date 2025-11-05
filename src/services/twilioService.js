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
   * Send OTP via SMS using Twilio
   * Real SMS only - no mock mode
   * Returns OTP in response for auto-fill if enabled
   */
  async sendOTP(phone, otp) {
    const returnOTP = process.env.RETURN_OTP_IN_RESPONSE === 'true';
    
    // If Twilio is not configured
    if (!twilioClient || !process.env.TWILIO_PHONE_NUMBER) {
      console.error(`[ERROR] Twilio not configured. Please set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER`);
      // Still return OTP for auto-fill if enabled (for development/testing)
      if (returnOTP) {
        console.log(`[DEV MODE] Returning OTP for auto-fill: ${otp}`);
        return { 
          success: true, 
          mode: 'dev',
          otp: otp
        };
      }
      throw new Error('SMS service not configured');
    }

    try {
      await twilioClient.messages.create({
        body: `Your BidMaster Admin OTP code is: ${otp}. This code will expire in 5 minutes.`,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: phone
      });
      
      console.log(`[TWILIO] OTP sent successfully to ${phone}`);
      
      // Return OTP in response for auto-fill (if enabled via environment variable)
      return { 
        success: true, 
        mode: 'twilio',
        // Include OTP for auto-fill when RETURN_OTP_IN_RESPONSE is enabled
        otp: returnOTP ? otp : undefined
      };
    } catch (error) {
      console.error(`[TWILIO ERROR] Failed to send OTP to ${phone}:`, error.message);
      // Still return OTP for auto-fill if enabled (so user can test even if SMS fails)
      if (returnOTP) {
        console.log(`[DEV MODE] Returning OTP for auto-fill despite SMS failure: ${otp}`);
        return {
          success: true,
          mode: 'twilio-error',
          error: error.message,
          otp: otp
        };
      }
      throw new Error(`Failed to send OTP: ${error.message}`);
    }
  },

  /**
   * Generate a random 6-digit OTP
   * No mock OTP - always generates real random code
   */
  generateOTP() {
    // Always generate real random OTP (no mock)
    return Math.floor(100000 + Math.random() * 900000).toString();
  }
};

