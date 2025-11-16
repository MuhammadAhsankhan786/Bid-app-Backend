import jwt from "jsonwebtoken";
import { TwilioService } from "../services/twilioService.js";
import pool from "../config/db.js";
import bcrypt from "bcrypt";
import { generateAccessToken, generateRefreshToken } from "../utils/tokenUtils.js";

// In-memory OTP store with 5-minute expiry
const otpStore = {};

/**
 * Normalize Iraq phone number
 * Supports: +964, 964, 00964, or leading 0 (e.g., 07701234567)
 */
function normalizeIraqPhone(phone) {
  if (!phone) return null;
  
  // Remove spaces and special characters except +
  let cleaned = phone.replace(/[\s-]/g, '');
  
  // If starts with 0, replace with +964 (e.g., 07701234567 → +9647701234567)
  if (cleaned.startsWith('0')) {
    cleaned = '+964' + cleaned.substring(1);
  }
  // If starts with 00964, replace with +964
  else if (cleaned.startsWith('00964')) {
    cleaned = '+964' + cleaned.substring(5);
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
   * POST /api/auth/login-phone
   * 
   * ADMIN PANEL LOGIN ENDPOINT
   * ===========================
   * This endpoint is used by the Admin Panel for phone-based login.
   * 
   * OTP SYSTEM:
   * - Uses ADMIN_MOCK_OTP_ENABLED and ADMIN_MOCK_OTP_VALUE environment variables
   * - Admin Panel OTP is completely independent from Mobile App OTP
   * - Does NOT use otpStore (mobile OTP storage)
   * - Does NOT use MOCK_OTP or MOCK_OTP_VALUE (those are for mobile app only)
   * 
   * Environment Variables:
   * - ADMIN_MOCK_OTP_ENABLED: Set to 'true' to enable mock OTP for admin panel
   * - ADMIN_MOCK_OTP_VALUE: The mock OTP value (default: '123456')
   */
  async loginPhone(req, res) {
    try {
      console.log('📱 Login Phone Request:', {
        body: req.body,
        phone: req.body?.phone,
        otp: req.body?.otp,
        phoneType: typeof req.body?.phone,
        otpType: typeof req.body?.otp,
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
      // ADMIN PANEL OTP VERIFICATION
      // ============================================================
      // Admin Panel uses its own dedicated mock OTP system
      // This is completely independent from Mobile App OTP (otpStore)
      // 
      // Admin Panel OTP Variables:
      // - ADMIN_MOCK_OTP_ENABLED: Enable/disable admin mock OTP
      // - ADMIN_MOCK_OTP_VALUE: Admin mock OTP value (default: '123456')
      //
      // NOTE: Admin Panel does NOT use:
      // - MOCK_OTP (mobile app only)
      // - MOCK_OTP_VALUE (mobile app only)
      // - otpStore (mobile app OTP storage)
      // ============================================================
      
      const ADMIN_MOCK_OTP_ENABLED = process.env.ADMIN_MOCK_OTP_ENABLED === 'true';
      const ADMIN_MOCK_OTP_VALUE = process.env.ADMIN_MOCK_OTP_VALUE || '123456';
      
      if (ADMIN_MOCK_OTP_ENABLED) {
        // Admin Panel Mock Mode: Validate against ADMIN_MOCK_OTP_VALUE
        if (otp !== ADMIN_MOCK_OTP_VALUE) {
          return res.status(401).json({ 
            success: false, 
            message: `Invalid OTP. Use ${ADMIN_MOCK_OTP_VALUE} for admin panel testing.` 
          });
        }
      } else {
        // Admin Panel Real Mode: Currently not implemented
        // In production, you would integrate with a real admin OTP service here
        return res.status(401).json({ 
          success: false, 
          message: "Admin panel OTP verification is disabled. Please enable ADMIN_MOCK_OTP_ENABLED for testing." 
        });
      }

      // Check if user exists in database (support both admin and mobile users)
      // Try both normalized and original phone formats
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

      // Normalize role (map legacy 'admin' to 'superadmin')
      let userRole = user.role?.toLowerCase();
      if (userRole === 'admin') {
        userRole = 'superadmin';
      }

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

      // Return user data with default values for null fields (dev mode support)
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
   * MOBILE APP OTP ENDPOINT
   * ========================
   * This endpoint is used by the Mobile App (Flutter) for OTP-based authentication.
   * 
   * OTP SYSTEM:
   * - Uses MOCK_OTP and MOCK_OTP_VALUE environment variables
   * - Mobile App OTP is completely independent from Admin Panel OTP
   * - Uses otpStore (in-memory storage) for OTP management
   * - Does NOT use ADMIN_MOCK_OTP_ENABLED or ADMIN_MOCK_OTP_VALUE (those are for admin panel only)
   * 
   * Environment Variables:
   * - MOCK_OTP: Set to 'true' to enable mock OTP for mobile app
   * - MOCK_OTP_VALUE: The mock OTP value (default: '1234')
   * 
   * When MOCK_OTP=true:
   * - Returns MOCK_OTP_VALUE in response for auto-fill
   * - Stores MOCK_OTP_VALUE in otpStore for verification
   * 
   * When MOCK_OTP=false:
   * - Generates random 6-digit OTP
   * - Stores OTP in otpStore for verification
   * - Attempts to send via Twilio SMS (if configured)
   */
  async sendOTP(req, res) {
    try {
      const { phone } = req.body;
      
      if (!phone) {
        return res.status(400).json({ error: "Phone number is required" });
      }
      
      // Normalize and validate
      const normalizedPhone = normalizeIraqPhone(phone);
      
      if (!isValidIraqPhone(phone)) {
        return res.status(400).json({ error: "Only Iraq numbers allowed" });
      }
      
      // ============================================================
      // MOBILE APP OTP GENERATION
      // ============================================================
      // Mobile App uses MOCK_OTP and MOCK_OTP_VALUE
      // This is completely independent from Admin Panel OTP
      // ============================================================
      
      const MOCK_OTP_ENABLED = process.env.MOCK_OTP === 'true';
      const MOCK_OTP_VALUE = process.env.MOCK_OTP_VALUE || '1234';
      
      let otp;
      if (MOCK_OTP_ENABLED) {
        // Mock Mode: Use MOCK_OTP_VALUE
        otp = MOCK_OTP_VALUE;
        console.log(`[MOBILE OTP] Mock mode enabled. OTP for ${normalizedPhone}: ${otp}`);
      } else {
        // Real Mode: Generate random 6-digit OTP
        otp = TwilioService.generateOTP();
        console.log(`[MOBILE OTP] Real OTP generated for ${normalizedPhone}: ${otp} (expires in 5 minutes)`);
        
        // Send OTP via Twilio (real SMS)
        try {
          await TwilioService.sendOTP(normalizedPhone, otp);
        } catch (error) {
          // Log error but don't fail - OTP is logged for testing
          console.error(`[ERROR] Failed to send OTP via Twilio: ${error.message}`);
        }
      }
      
      // Store OTP in-memory with expiry (used by verify-otp endpoint)
      const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes from now
      otpStore[normalizedPhone] = {
        otp: otp,
        expiresAt: expiresAt
      };
      
      // Return OTP in response for auto-fill (development/testing)
      // In production, remove this and rely on SMS only
      res.json({
        success: true,
        message: "OTP sent successfully",
        otp: otp // Include OTP for auto-fill in development
      });
    } catch (error) {
      console.error("Error sending OTP:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },
  
  /**
   * POST /api/auth/verify-otp
   * 
   * MOBILE APP OTP VERIFICATION ENDPOINT
   * ====================================
   * This endpoint is used by the Mobile App (Flutter) to verify OTP.
   * 
   * OTP SYSTEM:
   * - Uses MOCK_OTP and MOCK_OTP_VALUE environment variables
   * - Mobile App OTP is completely independent from Admin Panel OTP
   * - Uses otpStore (in-memory storage) for OTP verification
   * - Does NOT use ADMIN_MOCK_OTP_ENABLED or ADMIN_MOCK_OTP_VALUE (those are for admin panel only)
   * 
   * Environment Variables:
   * - MOCK_OTP: Set to 'true' to enable mock OTP for mobile app
   * - MOCK_OTP_VALUE: The mock OTP value (default: '1234')
   * 
   * When MOCK_OTP=true:
   * - Accepts MOCK_OTP_VALUE from otpStore (stored by send-otp)
   * 
   * When MOCK_OTP=false:
   * - Verifies against random OTP stored in otpStore (generated by send-otp)
   */
  async verifyOTP(req, res) {
    try {
      const { phone, otp } = req.body;
      
      if (!phone || !otp) {
        return res.status(400).json({ error: "Phone and OTP are required" });
      }
      
      // Normalize phone
      const normalizedPhone = normalizeIraqPhone(phone);
      
      if (!normalizedPhone) {
        return res.status(400).json({ error: "Invalid phone number format" });
      }
      
      // ============================================================
      // MOBILE APP OTP VERIFICATION
      // ============================================================
      // Mobile App uses otpStore (in-memory storage)
      // This is completely independent from Admin Panel OTP
      // ============================================================
      
      // Check OTP from in-memory store (populated by send-otp endpoint)
      const storedOTP = otpStore[normalizedPhone];
      
      if (!storedOTP) {
        return res.status(401).json({ error: "Invalid or expired OTP. Please request a new OTP." });
      }
      
      // Check if expired
      if (Date.now() > storedOTP.expiresAt) {
        delete otpStore[normalizedPhone];
        return res.status(401).json({ error: "OTP expired. Please request a new OTP." });
      }
      
      // Check if OTP matches (works for both mock and real OTP)
      if (storedOTP.otp !== otp) {
        return res.status(401).json({ error: "Invalid OTP. Please check and try again." });
      }
      
      // Delete OTP after successful verification
      delete otpStore[normalizedPhone];
      
      // Fetch user from database to get role
      const userResult = await pool.query(
        "SELECT id, name, email, phone, role, status FROM users WHERE phone = $1",
        [normalizedPhone]
      );
      
      if (userResult.rows.length === 0) {
        // User doesn't exist - this shouldn't happen if OTP was sent
        return res.status(404).json({ 
          success: false,
          error: "User not found. Please register first." 
        });
      }
      
      const user = userResult.rows[0];
      
      // Check if user is blocked
      if (user.status === 'blocked') {
        return res.status(403).json({ 
          success: false,
          error: "Account is blocked" 
        });
      }
      
      // Normalize role (map legacy 'admin' to 'superadmin')
      let userRole = user.role?.toLowerCase();
      if (userRole === 'admin') {
        userRole = 'superadmin';
      }
      
      // Determine scope based on user role: admin roles get "admin" scope, others get "mobile"
      const adminRoles = ['superadmin', 'admin', 'moderator', 'viewer'];
      const scope = adminRoles.includes(userRole) ? 'admin' : 'mobile';
      
      // Generate access and refresh tokens with appropriate scope
      const tokenPayload = { 
        id: user.id,
        phone: normalizedPhone, 
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
      
      // Delete OTP from store after successful verification
      delete otpStore[normalizedPhone];
      
      res.json({
        success: true,
        accessToken,
        refreshToken,
        token: accessToken, // Keep for backward compatibility
        role: userRole,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: userRole,
          status: user.status
        }
      });
    } catch (error) {
      console.error("Error verifying OTP:", error);
      res.status(500).json({ error: "Internal server error" });
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

      // 🔧 FIX: Allow users to update their role (buyer/seller only, not admin roles)
      if (role) {
        const normalizedRole = role.toLowerCase().trim();
        // Only allow buyer/seller roles to be set by users themselves
        // Admin roles (superadmin, admin, moderator, viewer) cannot be self-assigned
        if (normalizedRole !== 'buyer' && normalizedRole !== 'seller') {
          return res.status(400).json({ 
            success: false, 
            message: "Role must be 'buyer' or 'seller'" 
          });
        }
        
        // Get current role before update
        const currentUser = await pool.query('SELECT role FROM users WHERE id = $1', [userId]);
        const currentRole = currentUser.rows[0]?.role;
        
        console.log('🔧 [DEEP TRACE] User updating role:');
        console.log('   User ID:', userId);
        console.log('   Current role:', currentRole);
        console.log('   New role:', normalizedRole);
        
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
      
      // CRITICAL: Log the updated role to verify database update
      if (role) {
        console.log('✅ [DEEP TRACE] Profile update completed:');
        console.log('   User ID:', updatedUser.id);
        console.log('   Updated role in database:', updatedUser.role);
        console.log('   Expected role:', role.toLowerCase().trim());
        
        if (updatedUser.role?.toLowerCase() !== role.toLowerCase().trim()) {
          console.log('⚠️⚠️⚠️ WARNING: Database role does not match expected role!');
          console.log('   Database has:', updatedUser.role);
          console.log('   Expected:', role.toLowerCase().trim());
        } else {
          console.log('✅ Database role matches expected role');
        }
      }

      // 🔧 FIX: Generate new tokens when role is updated
      let responseData = {
        success: true,
        message: "Profile updated successfully",
        data: updatedUser
      };

      if (role) {
        // Get scope from current token (preserve scope)
        const scope = req.user.scope || 'mobile'; // Default to mobile for backward compatibility
        
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
          scope: scope // Preserve scope from original token
        };
        
        const newAccessToken = generateAccessToken(tokenPayload);
        const newRefreshToken = generateRefreshToken(tokenPayload);

        // Update refresh token in database
        await pool.query(
          "UPDATE users SET refresh_token = $1 WHERE id = $2",
          [newRefreshToken, updatedUser.id]
        );

        console.log('✅ New tokens generated with updated role:', tokenRole);
        console.log('   Token scope preserved:', scope);

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
      const scope = decoded.scope || 'mobile'; // Default to mobile for backward compatibility

      // Generate new tokens (token rotation) with preserved scope
      const tokenPayload = {
        id: user.id,
        phone: user.phone,
        role: userRole,
        scope: scope // Preserve scope from original token
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
  }
};

