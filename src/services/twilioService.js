import twilio from 'twilio';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Ensure .env is loaded from project root
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = join(__dirname, '../../.env');
dotenv.config({ path: envPath });

// Initialize Twilio client (only if credentials are provided)
let twilioClient = null;
if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
  twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  console.log('✅ Twilio client initialized with Account SID:', process.env.TWILIO_ACCOUNT_SID);
} else {
  console.warn('⚠️ Twilio client NOT initialized. Missing TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN');
}

/**
 * Normalize Iraq phone number to +964 format
 * @param {string} phone - Phone number in various formats
 * @returns {string} - Normalized phone number starting with +964
 */
function normalizeIraqPhone(phone) {
  if (!phone) return phone;
  
  let normalized = phone.trim();
  
  // If it already starts with "+964", keep it
  if (normalized.startsWith('+964')) {
    return normalized;
  }
  
  // If it starts with "964", prepend "+"
  if (normalized.startsWith('964')) {
    return '+' + normalized;
  }
  
  // If it starts with "00964", convert to "+964"
  if (normalized.startsWith('00964')) {
    return '+964' + normalized.substring(5);
  }
  
  // If it starts with "0", replace with "+964"
  if (normalized.startsWith('0')) {
    return '+964' + normalized.substring(1);
  }
  
  // Return as-is if no Iraq format detected
  return normalized;
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
    // 🔍 DEBUG: Log Twilio configuration
    console.log('🔍 [TWILIO SERVICE] Configuration Check:');
    console.log('   Using Twilio Service:', process.env.TWILIO_VERIFY_SID || 'NOT SET');
    console.log('   Using Twilio Account:', process.env.TWILIO_ACCOUNT_SID || 'NOT SET');
    console.log('   Twilio Auth Token:', process.env.TWILIO_AUTH_TOKEN ? 'SET (hidden)' : 'NOT SET');
    
    // Validate Twilio configuration
    if (!twilioClient) {
      console.error('[ERROR] Twilio client not initialized. Please set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN');
      throw new Error('SMS service not configured');
    }

    if (!process.env.TWILIO_VERIFY_SID) {
      console.error('[ERROR] TWILIO_VERIFY_SID not configured');
      throw new Error('Twilio Verify Service SID not configured');
    }

    console.log("✅ Using VERIFY SID:", process.env.TWILIO_VERIFY_SID);

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
      } else if (error.code === 21608) {
        // Trial account - phone number not verified
        const verifyUrl = 'https://console.twilio.com/us1/develop/phone-numbers/manage/verified';
        throw new Error(
          `Phone number ${phone} is not verified. Trial accounts can only send OTPs to verified numbers.\n` +
          `Please verify this number at: ${verifyUrl}\n` +
          `Or upgrade your Twilio account to send to any number.`
        );
      }
      
      throw new Error(`Failed to send OTP: ${error.message}`);
    }
  },

  /**
   * Verify OTP using Twilio Verify API
   * Uses verificationChecks.create() to verify the OTP code
   * 
   * @param {string} phone - Phone number (will be normalized to +964 format for Iraq)
   * @param {string} code - OTP code entered by user
   * @returns {Promise<{success: boolean, status: string, message?: string}>}
   */
  async verifyOTP(phone, code) {
    // Normalize phone number for Iraq (+964 format)
    const normalizedPhone = normalizeIraqPhone(phone);
    
    // Log the fixed verify request
    console.log("Fixed verify request:", normalizedPhone, code);
    
    // 🔍 DEBUG: Log Twilio configuration
    console.log('🔍 [TWILIO SERVICE] Verify OTP Configuration Check:');
    console.log('   Using Twilio Service:', process.env.TWILIO_VERIFY_SID || 'NOT SET');
    console.log('   Using Twilio Account:', process.env.TWILIO_ACCOUNT_SID || 'NOT SET');
    console.log('   Twilio Auth Token:', process.env.TWILIO_AUTH_TOKEN ? 'SET (hidden)' : 'NOT SET');
    
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
      // ✅ CORRECT: Using verificationChecks (plural) - correct Twilio API endpoint
      console.log("🚀 Using Twilio verificationChecks endpoint");
      console.log("   Service SID:", process.env.TWILIO_VERIFY_SID);
      console.log("   Phone:", normalizedPhone);
      console.log("   Code:", code ? "***" : "missing");
      
      const verificationCheck = await twilioClient.verify.v2
        .services(process.env.TWILIO_VERIFY_SID)
        .verificationChecks  // ✅ CORRECT: Plural form
        .create({
          to: normalizedPhone,
          code: code
        });

      console.log(`[TWILIO VERIFY] OTP verification check for ${normalizedPhone}, Status: ${verificationCheck.status}`);

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
      console.error(`[TWILIO VERIFY ERROR] Failed to verify OTP for ${normalizedPhone}:`, error.message);
      console.error(`[TWILIO VERIFY ERROR] Error code: ${error.code}, Status: ${error.status}`);
      console.error(`[TWILIO VERIFY ERROR] Full error:`, JSON.stringify(error, null, 2));
      
      // Twilio returns 404 if verification not found or expired
      if (error.code === 20404 || error.status === 404) {
        // Check if it's a service not found error (more specific check)
        const errorMsg = error.message || '';
        const errorMoreInfo = error.moreInfo || '';
        
        // Service not found - check for specific indicators
        if (errorMsg.includes('Services') && errorMsg.includes('not found')) {
          throw new Error(`Twilio Verify Service not found. Please check your TWILIO_VERIFY_SID (${process.env.TWILIO_VERIFY_SID}). The service may not exist in your Twilio account.`);
        }
        
        // Verification not found - OTP not sent or expired
        if (errorMsg.includes('Verification') || errorMsg.includes('verification') || errorMoreInfo.includes('Verification')) {
          return {
            success: false,
            status: 'not_found',
            message: 'OTP not found or expired. Please request a new OTP first.'
          };
        }
        
        // Default: OTP not found or expired
        return {
          success: false,
          status: 'not_found',
          message: 'OTP not found or expired. Please request a new OTP first.'
        };
      } else if (error.code === 20003) {
        throw new Error('Twilio account credentials are invalid. Please check your TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN.');
      } else if (error.code === 60200) {
        throw new Error('Twilio Verify Service configuration error. Please check your Verify Service settings in Twilio Console.');
      } else if (error.code === 60203) {
        // Max attempts exceeded
        return {
          success: false,
          status: 'max_attempts',
          message: 'Maximum verification attempts exceeded. Please request a new OTP.'
        };
      }
      
      throw new Error(`Failed to verify OTP: ${error.message}`);
    }
  }
};
