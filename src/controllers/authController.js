import jwt from "jsonwebtoken";
import { TwilioService } from "../services/twilioService.js";
import pool from "../config/db.js";
import bcrypt from "bcrypt";
import { generateAccessToken, generateRefreshToken } from "../utils/tokenUtils.js";

/**
 * Normalize Iraq phone number
 * Supports: +964, 964, 00964, or leading 0 (e.g., 07701234567)
 */
function normalizeIraqPhone(phone) {
  if (!phone) return null;
  
  // Remove spaces and special characters except +
  let cleaned = phone.replace(/[\s-]/g, '');
  
  // If starts with 00964, replace with +964 (check this FIRST before checking single 0)
  if (cleaned.startsWith('00964')) {
    cleaned = '+964' + cleaned.substring(5); // Remove '00964' (5 chars), keep rest
  }
  // If starts with 0, replace with +964 (e.g., 07701234567 → +9647701234567)
  else if (cleaned.startsWith('0')) {
    cleaned = '+964' + cleaned.substring(1);
  }
  // If starts with 964, add +
  else if (cleaned.startsWith('964')) {
    cleaned = '+' + cleaned;
  }
  // If doesn't start with +964, return null
  else if (!cleaned.startsWith('+964')) {
    return null;
  }
  
  return cleaned;
}

/**
 * Validate Iraq phone number
 * Must start with +964, 964, 00964, or 0
 * Format: +964 followed by 9-10 digits
 */
function isValidIraqPhone(phone) {
  const normalized = normalizeIraqPhone(phone);
  if (!normalized) return false;
  
  // Iraq phone format: +964 followed by 9-10 digits
  const phoneRegex = /^\+964[0-9]{9,10}$/;
  return phoneRegex.test(normalized);
}

export const AuthController = {
  /**
   * POST /api/auth/admin-login
   * 
   * ADMIN PANEL LOGIN ENDPOINT (NO OTP)
   * ====================================
   * This endpoint is used by the Admin Panel for direct phone-based login.
   * 
   * NO OTP REQUIRED:
   * - Direct login with phone + role
   * - Does NOT use Twilio Verify
   * - Does NOT send OTP
   * - Does NOT verify OTP
   * - Only for admin roles: superadmin, admin, moderator, viewer
   */
  async adminLogin(req, res) {
    try {
      console.log('📱 Admin Login Request:', {
        body: req.body,
        phone: req.body?.phone,
        role: req.body?.role,
      });

      const { phone, role } = req.body;

      if (!phone || !role) {
        console.log('❌ Missing phone or role:', { phone: !!phone, role: !!role });
        return res.status(400).json({ 
          success: false, 
          message: "Phone number and role are required" 
        });
      }

      // Normalize phone first
      const normalizedPhone = normalizeIraqPhone(phone);
      console.log('📱 Phone normalization:', { original: phone, normalized: normalizedPhone });
      
      // Validate phone format
      if (!normalizedPhone) {
        console.log('❌ Phone normalization failed:', { original: phone });
        return res.status(400).json({ 
          success: false, 
          message: `Invalid phone number format. Use Iraq format: +964XXXXXXXXXX (9-10 digits after +964). Received: ${phone}` 
        });
      }
      
      // Validate normalized phone format
      if (!isValidIraqPhone(phone)) {
        console.log('❌ Invalid phone format:', { original: phone, normalized: normalizedPhone });
        return res.status(400).json({ 
          success: false, 
          message: `Invalid phone number format. Use Iraq format: +964XXXXXXXXXX (9-10 digits after +964). Received: ${phone}` 
        });
      }

      // Validate role
      const normalizedRole = role.toLowerCase();
      const adminRoles = ['superadmin', 'admin', 'moderator', 'viewer'];
      if (!adminRoles.includes(normalizedRole)) {
        return res.status(400).json({ 
          success: false, 
          message: `Invalid role. Must be one of: ${adminRoles.join(', ')}` 
        });
      }
      
      // Special handling for viewer role - can login with any Iraq phone number
      if (normalizedRole === 'viewer') {
        // Check if user exists, if not create viewer user
        const viewerResult = await pool.query(
          `SELECT id, name, email, phone, role, status 
           FROM users 
           WHERE phone = $1`,
          [normalizedPhone]
        );
        
        let viewerUser;
        if (viewerResult.rows.length === 0) {
          // Create viewer user if doesn't exist
          const viewerEmail = `viewer${normalizedPhone.replace(/\+/g, '')}@bidmaster.com`;
          const insertResult = await pool.query(
            `INSERT INTO users (name, email, phone, role, status, created_at)
             VALUES ($1, $2, $3, 'viewer', 'approved', CURRENT_TIMESTAMP)
             ON CONFLICT (phone) DO UPDATE SET
               role = 'viewer',
               status = 'approved'
             RETURNING id, name, email, phone, role, status`,
            [`Viewer ${normalizedPhone}`, viewerEmail, normalizedPhone]
          );
          
          viewerUser = insertResult.rows[0];
          console.log(`✅ Viewer user auto-created: ${normalizedPhone}`);
        } else {
          viewerUser = viewerResult.rows[0];
          
          // Update existing user to viewer role if needed
          if (viewerUser.role !== 'viewer') {
            await pool.query(
              `UPDATE users SET role = 'viewer' WHERE id = $1`,
              [viewerUser.id]
            );
            viewerUser.role = 'viewer';
          }
        }
        
        // Check if user is blocked
        if (viewerUser.status === 'blocked') {
          return res.status(403).json({ 
            success: false, 
            message: "Account is blocked" 
          });
        }
        
        // Generate tokens
        const tokenPayload = { 
          id: viewerUser.id, 
          phone: viewerUser.phone, 
          role: 'viewer',
          scope: 'admin'
        };
        const accessToken = generateAccessToken(tokenPayload);
        const refreshToken = generateRefreshToken(tokenPayload);
        
        await pool.query(
          "UPDATE users SET refresh_token = $1 WHERE id = $2",
          [refreshToken, viewerUser.id]
        );
        
        console.log('✅ Viewer login successful (any Iraq number)');
        
        return res.json({
          success: true,
          message: "Login successful",
          accessToken,
          refreshToken,
          token: accessToken,
          role: 'viewer',
          user: {
            id: viewerUser.id,
            name: viewerUser.name,
            email: viewerUser.email,
            phone: viewerUser.phone,
            role: 'viewer',
            status: viewerUser.status
          }
        });
      }

      // Check if user exists in database with matching phone and role
      // Also try normalized version of original phone (handles spaces)
      const originalNormalized = normalizeIraqPhone(phone);
      
      // First try exact match with normalized phone and role
      let userResult = await pool.query(
        `SELECT id, name, email, phone, role, status 
         FROM users 
         WHERE phone = $1 AND role = $2`,
        [normalizedPhone, normalizedRole]
      );
      
      // If not found, try with original phone format
      if (userResult.rows.length === 0 && phone !== normalizedPhone) {
        userResult = await pool.query(
          `SELECT id, name, email, phone, role, status 
           FROM users 
           WHERE phone = $1 AND role = $2`,
          [phone, normalizedRole]
        );
      }
      
      // If still not found, try with originalNormalized
      if (userResult.rows.length === 0 && originalNormalized !== normalizedPhone) {
        userResult = await pool.query(
          `SELECT id, name, email, phone, role, status 
           FROM users 
           WHERE phone = $1 AND role = $2`,
          [originalNormalized, normalizedRole]
        );
      }
      
      // Debug: Log what we're searching for
      console.log('🔍 Admin login search:', {
        normalizedPhone,
        originalPhone: phone,
        originalNormalized,
        role: normalizedRole,
        found: userResult.rows.length > 0
      });
      
      console.log('🔍 Database query:', {
        normalizedPhone,
        originalPhone: phone,
        role: normalizedRole,
        foundUsers: userResult.rows.length
      });

      if (userResult.rows.length === 0) {
        return res.status(404).json({ 
          success: false, 
          message: "Phone number not found or role mismatch. Please check your credentials." 
        });
      }

      const user = userResult.rows[0];

      // Check if user is blocked
      if (user.status === 'blocked') {
        return res.status(403).json({ 
          success: false, 
          message: "Account is blocked" 
        });
      }

      // Normalize role - keep original role (superadmin, admin, moderator are separate roles)
      let userRole = user.role?.toLowerCase();

      // Admin panel always gets "admin" scope
      const scope = 'admin';

      // Generate access and refresh tokens with admin scope
      const tokenPayload = { 
        id: user.id, 
        phone: user.phone, 
        role: userRole,
        scope: scope
      };
      const accessToken = generateAccessToken(tokenPayload);
      const refreshToken = generateRefreshToken(tokenPayload);

      // Save refresh token to database
      await pool.query(
        "UPDATE users SET refresh_token = $1 WHERE id = $2",
        [refreshToken, user.id]
      );

      console.log('✅ Admin login successful (no OTP required)');

      res.json({
        success: true,
        message: "Login successful",
        accessToken,
        refreshToken,
        token: accessToken, // Keep for backward compatibility
        role: userRole,
        user: {
          id: user.id,
          name: user.name || "Super Admin",
          email: user.email || "admin@bidmaster.dev",
          phone: user.phone,
          role: userRole,
          status: user.status,
          city: user.city || "Baghdad"
        }
      });
    } catch (error) {
      console.error("Error during admin login:", error);
      res.status(500).json({ 
        success: false, 
        message: "Internal server error" 
      });
    }
  },

  /**
   * POST /api/auth/login-phone
   * 
   * DEPRECATED: This endpoint is no longer used by Admin Panel
   * Admin Panel now uses /api/auth/admin-login (no OTP)
   * 
   * This endpoint may still be used by legacy systems but should be migrated to admin-login
   */
  async loginPhone(req, res) {
    try {
      console.log('📱 Login Phone Request:', {
        body: req.body,
        phone: req.body?.phone,
        otp: req.body?.otp,
      });

      const { phone, otp } = req.body;

      if (!phone || !otp) {
        console.log('❌ Missing phone or OTP:', { phone: !!phone, otp: !!otp });
        return res.status(400).json({ 
          success: false, 
          message: "Phone number and OTP are required" 
        });
      }

      // Normalize phone first
      const normalizedPhone = normalizeIraqPhone(phone);
      console.log('📱 Phone normalization:', { original: phone, normalized: normalizedPhone });
      
      // Validate phone format
      if (!normalizedPhone) {
        console.log('❌ Phone normalization failed:', { original: phone });
        return res.status(400).json({ 
          success: false, 
          message: `Invalid phone number format. Use Iraq format: +964XXXXXXXXXX (9-10 digits after +964). Received: ${phone}` 
        });
      }
      
      // Validate normalized phone format
      if (!isValidIraqPhone(phone)) {
        console.log('❌ Invalid phone format:', { original: phone, normalized: normalizedPhone });
        return res.status(400).json({ 
          success: false, 
          message: `Invalid phone number format. Use Iraq format: +964XXXXXXXXXX (9-10 digits after +964). Received: ${phone}` 
        });
      }

      // ============================================================
      // OTP VERIFICATION USING TWILIO VERIFY API
      // ============================================================
      try {
        const verificationResult = await TwilioService.verifyOTP(normalizedPhone, otp);
        
        if (!verificationResult.success || verificationResult.status !== 'approved') {
          return res.status(401).json({ 
            success: false, 
            message: verificationResult.message || 'Invalid OTP. Please check and try again.' 
          });
        }
        
        console.log('✅ OTP verified successfully via Twilio Verify');
      } catch (error) {
        console.error('❌ Twilio Verify error:', error.message);
        return res.status(401).json({ 
          success: false, 
          message: error.message || 'OTP verification failed. Please try again.' 
        });
      }

      // Check if user exists in database
      const userResult = await pool.query(
        `SELECT id, name, email, phone, role, status 
         FROM users 
         WHERE phone = $1 OR phone = $2`,
        [normalizedPhone, phone]
      );
      
      console.log('🔍 Database query:', {
        normalizedPhone,
        originalPhone: phone,
        foundUsers: userResult.rows.length
      });

      if (userResult.rows.length === 0) {
        return res.status(404).json({ 
          success: false, 
          message: "Phone number not registered. Please contact administrator or register first." 
        });
      }

      const user = userResult.rows[0];

      // Check if user is blocked
      if (user.status === 'blocked') {
        return res.status(403).json({ 
          success: false, 
          message: "Account is blocked" 
        });
      }

      // For loginPhone endpoint (legacy), keep original role
      // Note: This endpoint is deprecated for admin panel, but may still be used
      let userRole = user.role?.toLowerCase();
      
      // Determine scope based on user role: admin roles get "admin" scope, others get "mobile"
      const adminRoles = ['superadmin', 'admin', 'moderator', 'viewer'];
      const scope = adminRoles.includes(userRole) ? 'admin' : 'mobile';

      // Generate access and refresh tokens with appropriate scope
      const tokenPayload = { 
        id: user.id, 
        phone: user.phone, 
        role: userRole,
        scope: scope
      };
      const accessToken = generateAccessToken(tokenPayload);
      const refreshToken = generateRefreshToken(tokenPayload);

      // Save refresh token to database
      await pool.query(
        "UPDATE users SET refresh_token = $1 WHERE id = $2",
        [refreshToken, user.id]
      );

      res.json({
        success: true,
        message: "Login successful",
        accessToken,
        refreshToken,
        token: accessToken, // Keep for backward compatibility
        role: userRole,
        user: {
          id: user.id,
          name: user.name || "Super Admin",
          email: user.email || "admin@bidmaster.dev",
          phone: user.phone,
          role: userRole,
          status: user.status,
          city: user.city || "Baghdad"
        }
      });
    } catch (error) {
      console.error("Error during phone login:", error);
      res.status(500).json({ 
        success: false, 
        message: "Internal server error" 
      });
    }
  },

  /**
   * POST /api/auth/send-otp
   * 
   * SEND OTP ENDPOINT (Flutter Mobile App Only)
   * ============================================
   * 
   * OTP SYSTEM:
   * - Uses Twilio Verify API to send OTP via SMS
   * - Uses Twilio verifications.create() to send OTP
   * - Does NOT return OTP in response
   * - Does NOT store OTP in-memory
   * - No mock OTP logic
   * 
   * NOTE: Admin Panel does NOT use this endpoint
   * Admin Panel uses /api/auth/admin-login (no OTP)
   */
  async sendOTP(req, res) {
    console.log("⚠️ SEND OTP ROUTE HIT");
    try {
      const { phone } = req.body;
      
      // ============================================================
      // OTP BYPASS FOR DEVELOPMENT (OTP_BYPASS=true)
      // ============================================================
      const OTP_BYPASS = process.env.OTP_BYPASS === 'true';
      
      if (OTP_BYPASS) {
        console.log('⚠️ OTP DISABLED — DEVELOPMENT MODE ACTIVE');
        console.log('   Skipping Twilio OTP send');
        console.log('   Phone:', phone);
        
        if (!phone) {
          return res.status(400).json({ 
            success: false,
            message: "Phone number is required" 
          });
        }
        
        // Normalize phone for consistency
        const normalizedPhone = normalizeIraqPhone(phone);
        
        // Return success with mock OTP (dev mode only)
        return res.json({
          success: true,
          message: "OTP disabled (dev mode)",
          otp: "0000"
        });
      }
      
      // 🔍 DEBUG: Log Twilio configuration
      console.log('🔍 [OTP SEND] Twilio Configuration Check:');
      console.log('   Using Twilio Service:', process.env.TWILIO_VERIFY_SID || 'NOT SET');
      console.log('   Using Twilio Account:', process.env.TWILIO_ACCOUNT_SID || 'NOT SET');
      console.log('   Twilio Auth Token:', process.env.TWILIO_AUTH_TOKEN ? 'SET (hidden)' : 'NOT SET');
      
      if (!phone) {
        return res.status(400).json({ 
          success: false,
          message: "Phone number is required" 
        });
      }
      
      // Normalize and validate
      const normalizedPhone = normalizeIraqPhone(phone);
      
      if (!isValidIraqPhone(phone)) {
        return res.status(400).json({ 
          success: false,
          message: "Invalid phone number format. Use Iraq format: +964XXXXXXXXXX" 
        });
      }
      
      // ============================================================
      // SEND OTP USING TWILIO VERIFY API
      // ============================================================
      try {
        await TwilioService.sendOTP(normalizedPhone);
        console.log(`✅ OTP sent successfully to ${normalizedPhone} via Twilio Verify`);
      } catch (error) {
        console.error(`❌ Failed to send OTP via Twilio Verify:`, error.message);
        
        // Return appropriate status code based on error type
        const statusCode = error.message.includes('not found') || error.message.includes('not configured') ? 400 : 500;
        
        return res.status(statusCode).json({ 
          success: false,
          message: error.message || "Failed to send OTP. Please try again." 
        });
      }
      
      // Return success response (DO NOT return OTP)
      res.json({
        success: true,
        message: "OTP sent successfully"
      });
    } catch (error) {
      console.error("Error sending OTP:", error);
      res.status(500).json({ 
        success: false,
        message: "Internal server error" 
      });
    }
  },
  
  /**
   * POST /api/auth/verify-otp
   * 
   * VERIFY OTP ENDPOINT (Flutter Mobile App Only)
   * =============================================
   * 
   * OTP SYSTEM:
   * - Uses Twilio Verify API for OTP verification
   * - Uses Twilio verificationChecks.create() to verify OTP
   * - Does NOT use in-memory storage
   * - No mock OTP logic
   * 
   * NOTE: Admin Panel does NOT use this endpoint
   * Admin Panel uses /api/auth/admin-login (no OTP)
   */
  async verifyOTP(req, res) {
    console.log("⚠️ VERIFY OTP ROUTE HIT");
    try {
      console.log('🔍 [VERIFY OTP] Request received');
      console.log('   Body:', { phone: req.body?.phone, otp: req.body?.otp ? '***' : 'missing', referral_code: req.body?.referral_code || 'none' });
      
      const { phone, otp, referral_code } = req.body;
      
      if (!phone || !otp) {
        console.error('❌ [VERIFY OTP] Missing phone or OTP');
        return res.status(400).json({ 
          success: false,
          message: "Phone and OTP are required" 
        });
      }
      
      // Normalize phone
      const normalizedPhone = normalizeIraqPhone(phone);
      console.log('📱 [VERIFY OTP] Phone normalization:', { original: phone, normalized: normalizedPhone });
      
      if (!normalizedPhone) {
        console.error('❌ [VERIFY OTP] Invalid phone format');
        return res.status(400).json({ 
          success: false,
          message: "Invalid phone number format" 
        });
      }
      
      // ============================================================
      // OTP BYPASS FOR DEVELOPMENT (OTP_BYPASS=true)
      // ============================================================
      const OTP_BYPASS = process.env.OTP_BYPASS === 'true';
      
      if (OTP_BYPASS) {
        console.log('⚠️ OTP DISABLED — DEVELOPMENT MODE ACTIVE');
        console.log('   Skipping Twilio OTP verification');
        console.log('   Accepting any OTP for development');
        console.log('   Phone:', normalizedPhone);
        console.log('   OTP provided:', otp ? '***' : 'missing');
        // Skip Twilio verification - accept any OTP
      } else {
        // ============================================================
        // VERIFY OTP USING TWILIO VERIFY API
        // ============================================================
        try {
          const verificationResult = await TwilioService.verifyOTP(normalizedPhone, otp);
          
          if (!verificationResult.success || verificationResult.status !== 'approved') {
            return res.status(401).json({ 
              success: false,
              message: verificationResult.message || 'Invalid OTP. Please check and try again.' 
            });
          }
          
          console.log('✅ OTP verified successfully via Twilio Verify');
        } catch (error) {
          console.error('❌ Twilio Verify error:', error.message);
          return res.status(401).json({ 
            success: false,
            message: error.message || 'OTP verification failed. Please try again.' 
          });
        }
      }
      
      // Fetch user from database to get role
      // If user doesn't exist, auto-create a buyer user (similar to admin-login creating viewer)
      console.log('🔍 [VERIFY OTP] Checking database for user:', normalizedPhone);
      
      let user;
      try {
        const userResult = await pool.query(
          "SELECT id, name, email, phone, role, status FROM users WHERE phone = $1",
          [normalizedPhone]
        );
        
        console.log('🔍 [VERIFY OTP] Database query result:', { 
          found: userResult.rows.length > 0,
          userId: userResult.rows[0]?.id 
        });
        
        if (userResult.rows.length === 0) {
          // Auto-create buyer user if doesn't exist (mobile app users are typically buyers)
          console.log('🔍 [VERIFY OTP] User not found, creating new buyer user');
          const buyerEmail = `buyer${normalizedPhone.replace(/\+/g, '')}@bidmaster.com`;
          
          // ============================================================
          // REFERRAL SYSTEM: Handle referral code
          // ============================================================
          let referralCode = null;
          let referredBy = null;
          let referralTransactionId = null;
          
          // Generate referral code for new user
          const { generateReferralCode } = await import("../utils/referralUtils.js");
          referralCode = await generateReferralCode();
          console.log(`✅ Generated referral code for new user: ${referralCode}`);
          
          // Process referral if code provided
          if (referral_code && typeof referral_code === 'string' && referral_code.trim().length > 0) {
            const {
              findInviterByCode,
              checkFraudProtection,
              createReferralTransaction,
              getReferralRewardAmount
            } = await import("../utils/referralUtils.js");
            
            const inviter = await findInviterByCode(referral_code.trim());
            
            if (inviter) {
              // Check fraud protection
              const fraudCheck = await checkFraudProtection(
                inviter.id,
                normalizedPhone,
                req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress
              );
              
              if (fraudCheck.allowed) {
                referredBy = inviter.referral_code;
                const rewardAmount = await getReferralRewardAmount();
                
                console.log(`💰 [REFERRAL] Processing referral reward:`);
                console.log(`   Inviter ID: ${inviter.id}`);
                console.log(`   Inviter Name: ${inviter.name}`);
                console.log(`   Inviter Code: ${inviter.referral_code}`);
                console.log(`   Invitee Phone: ${normalizedPhone}`);
                console.log(`   Reward Amount: $${rewardAmount}`);
                
                // Create referral transaction (pending status)
                const transaction = await createReferralTransaction(
                  inviter.id,
                  normalizedPhone,
                  rewardAmount
                );
                referralTransactionId = transaction.id;
                
                console.log(`✅ Referral transaction created: ${transaction.id} for inviter ${inviter.id}`);
              } else {
                console.log(`⚠️ Referral fraud check failed: ${fraudCheck.reason}`);
              }
            } else {
              console.log(`⚠️ Invalid referral code provided: ${referral_code}`);
            }
          }
          
          try {
            // Try INSERT first (if phone has unique constraint)
            const insertResult = await pool.query(
              `INSERT INTO users (name, email, phone, role, status, referral_code, referred_by, created_at)
               VALUES ($1, $2, $3, 'buyer', 'approved', $4, $5, CURRENT_TIMESTAMP)
               RETURNING id, name, email, phone, role, status, referral_code, referred_by`,
              [`Buyer ${normalizedPhone}`, buyerEmail, normalizedPhone, referralCode, referredBy]
            );
            
            user = insertResult.rows[0];
            console.log(`✅ Buyer user auto-created via verifyOTP: ${normalizedPhone}`);
            
            // ============================================================
            // REFERRAL SYSTEM: Award reward if referral transaction exists
            // ============================================================
            if (referralTransactionId && user.id) {
              const { awardReferralReward } = await import("../utils/referralUtils.js");
              
              try {
                const awardResult = await awardReferralReward(referralTransactionId, user.id);
                
                if (!awardResult.alreadyAwarded) {
                  console.log(`💰 [REFERRAL REWARD] Successfully awarded:`);
                  console.log(`   Amount: $${awardResult.transaction.amount}`);
                  console.log(`   Inviter ID: ${awardResult.transaction.inviter_user_id}`);
                  console.log(`   Invitee ID: ${user.id}`);
                  console.log(`   Transaction ID: ${referralTransactionId}`);
                  console.log(`   New Inviter Balance: $${awardResult.inviterBalance}`);
                  console.log(`   Status: ${awardResult.transaction.status}`);
                } else {
                  console.log(`⚠️ Referral reward already awarded for transaction ${referralTransactionId}`);
                }
              } catch (awardError) {
                console.error(`❌ Error awarding referral reward:`, awardError);
                // Don't fail user creation if award fails - log and continue
              }
            }
          } catch (insertError) {
            // If unique constraint violation, try to fetch existing user
            if (insertError.code === '23505') { // Unique violation
              console.log('⚠️ [VERIFY OTP] Phone already exists, fetching user');
              const existingResult = await pool.query(
                "SELECT id, name, email, phone, role, status FROM users WHERE phone = $1",
                [normalizedPhone]
              );
              if (existingResult.rows.length > 0) {
                user = existingResult.rows[0];
                console.log(`✅ Found existing user: ${user.id}`);
              } else {
                throw insertError;
              }
            } else {
              throw insertError;
            }
          }
        } else {
          user = userResult.rows[0];
          console.log(`✅ Found existing user: ${user.id}, role: ${user.role}`);
        }
      } catch (dbError) {
        console.error('❌ [VERIFY OTP] Database error:', dbError.message);
        console.error('   Error code:', dbError.code);
        console.error('   Error detail:', dbError.detail);
        throw dbError;
      }
      
      // Check if user is blocked
      if (user.status === 'blocked') {
        return res.status(403).json({ 
          success: false,
          error: "Account is blocked" 
        });
      }
      
      // For Flutter app (verifyOTP), ALWAYS use 'mobile' scope
      // This endpoint is specifically for Flutter app, so scope should always be 'mobile'
      let userRole = user.role?.toLowerCase();
      
      // CRITICAL FIX: Flutter app verifyOTP always gets 'mobile' scope
      // Even if user has admin role, Flutter app login should give mobile scope
      // Admin roles should use admin-login endpoint, but if they use verifyOTP, give mobile scope
      const scope = 'mobile';
      
      // Log warning if admin role user is using Flutter app login
      const adminRoles = ['superadmin', 'admin', 'moderator', 'viewer'];
      if (adminRoles.includes(userRole)) {
        console.log(`⚠️ Warning: Admin role user (${userRole}) using Flutter app login via verifyOTP.`);
        console.log(`   They should use admin-login endpoint, but allowing with mobile scope for compatibility.`);
      }
      
      // If user has admin role but using Flutter app, we'll still give mobile scope
      // This allows backward compatibility
      
      // Generate access and refresh tokens with appropriate scope
      console.log('🔍 [VERIFY OTP] Generating tokens for user:', user.id);
      
      let accessToken, refreshToken;
      try {
        const tokenPayload = { 
          id: user.id,
          phone: normalizedPhone, 
          role: userRole,
          scope: scope
        };
        accessToken = generateAccessToken(tokenPayload);
        refreshToken = generateRefreshToken(tokenPayload);
        console.log('✅ [VERIFY OTP] Tokens generated successfully');
      } catch (tokenError) {
        console.error('❌ [VERIFY OTP] Token generation error:', tokenError.message);
        throw new Error('Failed to generate authentication tokens');
      }

      // Save refresh token to database
      try {
        await pool.query(
          "UPDATE users SET refresh_token = $1 WHERE id = $2",
          [refreshToken, user.id]
        );
        console.log('✅ [VERIFY OTP] Refresh token saved to database');
      } catch (updateError) {
        console.error('❌ [VERIFY OTP] Failed to save refresh token:', updateError.message);
        // Don't throw - tokens are still valid even if refresh token save fails
      }
      
      // ✅ CONFIRMATION: OTP VERIFIED SUCCESSFULLY
      console.log('========================================');
      console.log('✅ OTP VERIFICATION: SUCCESS');
      console.log('✅ Phone:', normalizedPhone);
      console.log('✅ User ID:', user.id);
      console.log('✅ Role:', userRole);
      console.log('✅ Token Generated: YES');
      console.log('✅ Response Sending: YES');
      console.log('========================================');
      
      // Fetch user with referral info
      const userWithReferral = await pool.query(
        "SELECT id, name, email, phone, role, status, referral_code, reward_balance FROM users WHERE id = $1",
        [user.id]
      );
      
      const fullUser = userWithReferral.rows[0] || user;
      
      res.json({
        success: true,
        accessToken,
        refreshToken,
        token: accessToken, // Keep for backward compatibility
        role: userRole,
        user: {
          id: fullUser.id,
          name: fullUser.name,
          email: fullUser.email,
          phone: fullUser.phone,
          role: userRole,
          status: fullUser.status,
          referral_code: fullUser.referral_code,
          reward_balance: parseFloat(fullUser.reward_balance) || 0
        }
      });
    } catch (error) {
      console.error("========================================");
      console.error("❌ [VERIFY OTP] ERROR OCCURRED");
      console.error("   Error message:", error.message);
      console.error("   Error stack:", error.stack);
      console.error("   Error code:", error.code);
      console.error("========================================");
      
      // Return detailed error for debugging (in development)
      const errorResponse = {
        success: false,
        error: "Internal server error",
        message: error.message || "An error occurred during OTP verification"
      };
      
      // In production, hide error details
      if (process.env.NODE_ENV === 'production') {
        errorResponse.message = "Internal server error";
        delete errorResponse.error;
      }
      
      res.status(500).json(errorResponse);
    }
  },

  // POST /api/auth/register
  async register(req, res) {
    try {
      const { name, phone, email, password, role = 'buyer' } = req.body;

      if (!name || !phone || !password) {
        return res.status(400).json({ 
          success: false, 
          message: "Name, phone, and password are required" 
        });
      }

      // Validate role
      if (!['buyer', 'seller'].includes(role)) {
        return res.status(400).json({ 
          success: false, 
          message: "Role must be 'buyer' or 'seller'" 
        });
      }

      // Normalize and validate phone
      const normalizedPhone = normalizeIraqPhone(phone);
      if (!isValidIraqPhone(phone)) {
        return res.status(400).json({ 
          success: false, 
          message: "Only Iraq numbers allowed" 
        });
      }

      // Check if user already exists
      const existingUser = await pool.query(
        "SELECT id FROM users WHERE phone = $1 OR email = $2",
        [normalizedPhone, email || null]
      );

      if (existingUser.rows.length > 0) {
        return res.status(400).json({ 
          success: false, 
          message: "User with this phone or email already exists" 
        });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create user
      const result = await pool.query(
        `INSERT INTO users (name, email, phone, password, role, status) 
         VALUES ($1, $2, $3, $4, $5, 'pending') 
         RETURNING id, name, email, phone, role, status, created_at`,
        [name, email || null, normalizedPhone, hashedPassword, role]
      );

      const user = result.rows[0];

      // Generate access and refresh tokens
      const tokenPayload = { 
        id: user.id, 
        phone: user.phone, 
        role: user.role 
      };
      const accessToken = generateAccessToken(tokenPayload);
      const refreshToken = generateRefreshToken(tokenPayload);

      // Save refresh token to database
      await pool.query(
        "UPDATE users SET refresh_token = $1 WHERE id = $2",
        [refreshToken, user.id]
      );

      res.status(201).json({
        success: true,
        message: "User registered successfully",
        accessToken,
        refreshToken,
        token: accessToken, // Keep for backward compatibility
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role,
          status: user.status
        }
      });
    } catch (error) {
      console.error("Error registering user:", error);
      res.status(500).json({ 
        success: false, 
        message: "Internal server error" 
      });
    }
  },

  // POST /api/auth/login
  async login(req, res) {
    try {
      const { phone, email, password } = req.body;

      if (!password || (!phone && !email)) {
        return res.status(400).json({ 
          success: false, 
          message: "Phone or email and password are required" 
        });
      }

      // Find user by phone or email
      let user;
      if (phone) {
        const normalizedPhone = normalizeIraqPhone(phone);
        if (!isValidIraqPhone(phone)) {
          return res.status(400).json({ 
            success: false, 
            message: "Invalid phone number format" 
          });
        }
        const result = await pool.query(
          "SELECT * FROM users WHERE phone = $1 AND role != 'admin'",
          [normalizedPhone]
        );
        user = result.rows[0];
      } else {
        const result = await pool.query(
          "SELECT * FROM users WHERE email = $1 AND role != 'admin'",
          [email]
        );
        user = result.rows[0];
      }

      if (!user) {
        return res.status(401).json({ 
          success: false, 
          message: "Invalid credentials" 
        });
      }

      // Check if user is blocked
      if (user.status === 'blocked') {
        return res.status(403).json({ 
          success: false, 
          message: "Account is blocked" 
        });
      }

      // Verify password
      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) {
        return res.status(401).json({ 
          success: false, 
          message: "Invalid credentials" 
        });
      }

      // Generate access and refresh tokens
      const tokenPayload = { 
        id: user.id, 
        phone: user.phone, 
        role: user.role 
      };
      const accessToken = generateAccessToken(tokenPayload);
      const refreshToken = generateRefreshToken(tokenPayload);

      // Save refresh token to database
      await pool.query(
        "UPDATE users SET refresh_token = $1 WHERE id = $2",
        [refreshToken, user.id]
      );

      res.json({
        success: true,
        message: "Login successful",
        accessToken,
        refreshToken,
        token: accessToken, // Keep for backward compatibility
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role,
          status: user.status
        }
      });
    } catch (error) {
      console.error("Error during login:", error);
      res.status(500).json({ 
        success: false, 
        message: "Internal server error" 
      });
    }
  },

  // GET /api/auth/profile
  async getProfile(req, res) {
    try {
      const userId = req.user.id;

      const result = await pool.query(
        `SELECT id, name, email, phone, role, status, bids_count, created_at 
         FROM users WHERE id = $1`,
        [userId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ 
          success: false, 
          message: "User not found" 
        });
      }

      res.json({
        success: true,
        data: result.rows[0]
      });
    } catch (error) {
      console.error("Error fetching profile:", error);
      res.status(500).json({ 
        success: false, 
        message: "Internal server error" 
      });
    }
  },

  // PATCH /api/auth/profile
  async updateProfile(req, res) {
    try {
      const userId = req.user.id;
      const { name, phone, role } = req.body;

      if (!name && !phone && !role) {
        return res.status(400).json({ 
          success: false, 
          message: "At least one field (name, phone, or role) is required" 
        });
      }

      const updates = [];
      const params = [];
      let paramCount = 1;

      if (name) {
        updates.push(`name = $${paramCount++}`);
        params.push(name);
      }

      if (phone) {
        const normalizedPhone = normalizeIraqPhone(phone);
        if (!isValidIraqPhone(phone)) {
          return res.status(400).json({ 
            success: false, 
            message: "Invalid phone number format" 
          });
        }

        // Check if phone is already taken by another user
        const existingUser = await pool.query(
          "SELECT id FROM users WHERE phone = $1 AND id != $2",
          [normalizedPhone, userId]
        );

        if (existingUser.rows.length > 0) {
          return res.status(400).json({ 
            success: false, 
            message: "Phone number already in use" 
          });
        }

        updates.push(`phone = $${paramCount++}`);
        params.push(normalizedPhone);
      }

      if (role) {
        const normalizedRole = role.toLowerCase().trim();
        // Only allow buyer/seller roles to be set by users themselves
        if (normalizedRole !== 'buyer' && normalizedRole !== 'seller') {
          return res.status(400).json({ 
            success: false, 
            message: "Role must be 'buyer' or 'seller'" 
          });
        }
        
        updates.push(`role = $${paramCount++}`);
        params.push(normalizedRole);
      }

      params.push(userId);
      const query = `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramCount} 
                     RETURNING id, name, email, phone, role, status, created_at`;

      const result = await pool.query(query, params);

      if (result.rows.length === 0) {
        return res.status(404).json({ 
          success: false, 
          message: "User not found" 
        });
      }

      const updatedUser = result.rows[0];
      
      // Generate new tokens when role is updated
      let responseData = {
        success: true,
        message: "Profile updated successfully",
        data: updatedUser
      };

      if (role) {
        // Get scope from current token (preserve scope)
        const scope = req.user.scope || 'mobile';
        
        // Normalize role for token
        let tokenRole = updatedUser.role?.toLowerCase();
        if (tokenRole === 'admin') {
          tokenRole = 'superadmin';
        }

        // Generate new tokens with updated role
        const tokenPayload = {
          id: updatedUser.id,
          phone: updatedUser.phone,
          role: tokenRole,
          scope: scope
        };
        
        const newAccessToken = generateAccessToken(tokenPayload);
        const newRefreshToken = generateRefreshToken(tokenPayload);

        // Update refresh token in database
        await pool.query(
          "UPDATE users SET refresh_token = $1 WHERE id = $2",
          [newRefreshToken, updatedUser.id]
        );

        // Include new tokens in response
        responseData.accessToken = newAccessToken;
        responseData.refreshToken = newRefreshToken;
        responseData.role = tokenRole;
      }

      res.json(responseData);
    } catch (error) {
      console.error("Error updating profile:", error);
      res.status(500).json({ 
        success: false, 
        message: "Internal server error" 
      });
    }
  },

  // POST /api/auth/refresh
  async refreshToken(req, res) {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(400).json({
          success: false,
          error: "refresh_token_required",
          message: "Refresh token is required"
        });
      }

      // Verify refresh token
      const { verifyRefreshToken } = await import("../utils/tokenUtils.js");
      const decoded = verifyRefreshToken(refreshToken);

      if (!decoded || !decoded.id) {
        return res.status(401).json({
          success: false,
          error: "invalid_refresh_token",
          message: "Invalid or expired refresh token"
        });
      }

      // Check if refresh token exists in database
      const userResult = await pool.query(
        "SELECT id, name, email, phone, role, status, refresh_token FROM users WHERE id = $1",
        [decoded.id]
      );

      if (userResult.rows.length === 0) {
        return res.status(401).json({
          success: false,
          error: "user_not_found",
          message: "User not found"
        });
      }

      const user = userResult.rows[0];

      // Verify refresh token matches stored token
      if (user.refresh_token !== refreshToken) {
        return res.status(401).json({
          success: false,
          error: "invalid_refresh_token",
          message: "Refresh token mismatch"
        });
      }

      // Check if user is blocked
      if (user.status === 'blocked') {
        return res.status(403).json({
          success: false,
          error: "account_blocked",
          message: "Account is blocked"
        });
      }

      // Normalize role
      let userRole = user.role?.toLowerCase();
      if (userRole === 'admin') {
        userRole = 'superadmin';
      }

      // Preserve scope from the old refresh token
      const scope = decoded.scope || 'mobile';

      // Generate new tokens (token rotation) with preserved scope
      const tokenPayload = {
        id: user.id,
        phone: user.phone,
        role: userRole,
        scope: scope
      };
      const newAccessToken = generateAccessToken(tokenPayload);
      const newRefreshToken = generateRefreshToken(tokenPayload);

      // Update refresh token in database (rotation)
      await pool.query(
        "UPDATE users SET refresh_token = $1 WHERE id = $2",
        [newRefreshToken, user.id]
      );

      res.json({
        success: true,
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        role: userRole
      });
    } catch (error) {
      console.error("Error refreshing token:", error);
      res.status(500).json({
        success: false,
        error: "internal_error",
        message: "Internal server error"
      });
    }
  },

  // POST /api/auth/logout
  async logout(req, res) {
    try {
      // Clear refresh token from database if user is authenticated
      if (req.user && req.user.id) {
        await pool.query(
          "UPDATE users SET refresh_token = NULL WHERE id = $1",
          [req.user.id]
        );
      }

      res.json({
        success: true,
        message: "Logged out successfully"
      });
    } catch (error) {
      console.error("Error during logout:", error);
      res.status(500).json({ 
        success: false, 
        message: "Internal server error" 
      });
    }
  },

  /**
   * POST /api/auth/change-phone/send-otp
   * 
   * SEND OTP FOR PHONE CHANGE
   * ==========================
   * Sends OTP to the new phone number for verification
   * Works for both Flutter app users and Admin panel users
   */
  async sendChangePhoneOTP(req, res) {
    try {
      const { newPhone } = req.body;
      const userId = req.user.id;

      if (!newPhone) {
        return res.status(400).json({ 
          success: false,
          message: "New phone number is required" 
        });
      }

      // Normalize and validate new phone
      const normalizedNewPhone = normalizeIraqPhone(newPhone);
      
      if (!isValidIraqPhone(newPhone)) {
        return res.status(400).json({ 
          success: false,
          message: "Invalid phone number format. Use Iraq format: +964XXXXXXXXXX" 
        });
      }

      // Check if new phone is already in use by another user
      const existingUser = await pool.query(
        "SELECT id FROM users WHERE phone = $1 AND id != $2",
        [normalizedNewPhone, userId]
      );

      if (existingUser.rows.length > 0) {
        return res.status(400).json({ 
          success: false,
          message: "This phone number is already in use by another account" 
        });
      }

      // Send OTP to new phone using Twilio Verify
      try {
        await TwilioService.sendOTP(normalizedNewPhone);
        console.log(`✅ Change phone OTP sent successfully to ${normalizedNewPhone} via Twilio Verify`);
      } catch (error) {
        console.error(`❌ Failed to send change phone OTP via Twilio Verify:`, error.message);
        return res.status(500).json({ 
          success: false,
          message: error.message || "Failed to send OTP. Please try again." 
        });
      }

      res.json({
        success: true,
        message: "OTP sent successfully to new phone number"
      });
    } catch (error) {
      console.error("Error sending change phone OTP:", error);
      res.status(500).json({ 
        success: false,
        message: "Internal server error" 
      });
    }
  },

  /**
   * POST /api/auth/change-phone/verify
   * 
   * VERIFY OTP AND UPDATE PHONE
   * ============================
   * Verifies OTP for new phone and updates user's phone number
   * Works for both Flutter app users and Admin panel users
   */
  async verifyChangePhone(req, res) {
    try {
      const { newPhone, otp } = req.body;
      const userId = req.user.id;

      if (!newPhone || !otp) {
        return res.status(400).json({ 
          success: false,
          message: "New phone number and OTP are required" 
        });
      }

      // Normalize new phone
      const normalizedNewPhone = normalizeIraqPhone(newPhone);
      
      if (!isValidIraqPhone(newPhone)) {
        return res.status(400).json({ 
          success: false,
          message: "Invalid phone number format" 
        });
      }

      // Verify OTP using Twilio Verify
      try {
        const verificationResult = await TwilioService.verifyOTP(normalizedNewPhone, otp);
        
        if (!verificationResult.success || verificationResult.status !== 'approved') {
          return res.status(401).json({ 
            success: false,
            message: verificationResult.message || 'Invalid OTP. Please check and try again.' 
          });
        }
        
        console.log('✅ Change phone OTP verified successfully via Twilio Verify');
      } catch (error) {
        console.error('❌ Twilio Verify error:', error.message);
        return res.status(401).json({ 
          success: false,
          message: error.message || 'OTP verification failed. Please try again.' 
        });
      }

      // Check if new phone is already in use
      const existingUser = await pool.query(
        "SELECT id FROM users WHERE phone = $1 AND id != $2",
        [normalizedNewPhone, userId]
      );

      if (existingUser.rows.length > 0) {
        return res.status(400).json({ 
          success: false,
          message: "This phone number is already in use by another account" 
        });
      }

      // Update user's phone number
      const result = await pool.query(
        `UPDATE users 
         SET phone = $1 
         WHERE id = $2 
         RETURNING id, name, email, phone, role, status`,
        [normalizedNewPhone, userId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ 
          success: false,
          message: "User not found" 
        });
      }

      const updatedUser = result.rows[0];

      // Generate new tokens with updated phone
      const tokenPayload = {
        id: updatedUser.id,
        phone: updatedUser.phone,
        role: updatedUser.role?.toLowerCase() || 'buyer',
        scope: req.user.scope || 'mobile'
      };
      
      const newAccessToken = generateAccessToken(tokenPayload);
      const newRefreshToken = generateRefreshToken(tokenPayload);

      // Update refresh token in database
      await pool.query(
        "UPDATE users SET refresh_token = $1 WHERE id = $2",
        [newRefreshToken, updatedUser.id]
      );

      console.log(`✅ Phone number updated successfully for user ${userId}: ${normalizedNewPhone}`);

      res.json({
        success: true,
        message: "Phone number updated successfully",
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        user: {
          id: updatedUser.id,
          name: updatedUser.name,
          email: updatedUser.email,
          phone: updatedUser.phone,
          role: updatedUser.role,
          status: updatedUser.status
        }
      });
    } catch (error) {
      console.error("Error verifying change phone:", error);
      res.status(500).json({ 
        success: false,
        message: "Internal server error" 
      });
    }
  }
};
