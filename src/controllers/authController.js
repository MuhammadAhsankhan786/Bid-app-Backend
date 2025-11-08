import jwt from "jsonwebtoken";
import { TwilioService } from "../services/twilioService.js";
import pool from "../config/db.js";
import bcrypt from "bcrypt";

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
  // POST /api/auth/login-phone (Admin Panel - Mock OTP)
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

      // Verify mock OTP (1234)
      if (otp !== '1234') {
        return res.status(401).json({ 
          success: false, 
          message: "Invalid OTP. Use 1234 for testing." 
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

      // Generate JWT token with user ID and role
      const token = jwt.sign(
        { 
          id: user.id, 
          phone: user.phone, 
          role: userRole 
        },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || "24h" }
      );

      // Return user data with default values for null fields (dev mode support)
      res.json({
        success: true,
        message: "Login successful",
        token,
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

  // POST /api/auth/send-otp (kept for mobile app compatibility)
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
      
      // Generate random 6-digit OTP
      const otp = TwilioService.generateOTP();
      const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes from now
      
      // Store OTP in-memory with expiry
      otpStore[normalizedPhone] = {
        otp: otp,
        expiresAt: expiresAt
      };
      
      // Console.log OTP for dev/testing
      console.log(`[OTP] OTP for ${normalizedPhone}: ${otp} (expires in 5 minutes)`);
      
      // Send OTP via Twilio (real SMS)
      try {
        await TwilioService.sendOTP(normalizedPhone, otp);
      } catch (error) {
        // Log error but don't fail - OTP is logged for testing
        console.error(`[ERROR] Failed to send OTP via Twilio: ${error.message}`);
      }
      
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
  
  // POST /api/auth/verify-otp
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
      
      // Check OTP from in-memory store
      const storedOTP = otpStore[normalizedPhone];
      
      if (!storedOTP) {
        return res.status(401).json({ error: "Invalid or expired OTP" });
      }
      
      // Check if expired
      if (Date.now() > storedOTP.expiresAt) {
        delete otpStore[normalizedPhone];
        return res.status(401).json({ error: "Invalid or expired OTP" });
      }
      
      // Check if OTP matches
      if (storedOTP.otp !== otp) {
        return res.status(401).json({ error: "Invalid or expired OTP" });
      }
      
      // OTP is valid - generate JWT token
      const token = jwt.sign(
        { phone: normalizedPhone },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || "24h" }
      );
      
      // Delete OTP from store after successful verification
      delete otpStore[normalizedPhone];
      
      res.json({
        success: true,
        token,
        user: { phone: normalizedPhone }
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

      // Generate JWT token
      const token = jwt.sign(
        { id: user.id, phone: user.phone, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || "30d" }
      );

      res.status(201).json({
        success: true,
        message: "User registered successfully",
        token,
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

      // Generate JWT token
      const token = jwt.sign(
        { id: user.id, phone: user.phone, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || "30d" }
      );

      res.json({
        success: true,
        message: "Login successful",
        token,
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
      const { name, phone } = req.body;

      if (!name && !phone) {
        return res.status(400).json({ 
          success: false, 
          message: "At least one field (name or phone) is required" 
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

      res.json({
        success: true,
        message: "Profile updated successfully",
        data: result.rows[0]
      });
    } catch (error) {
      console.error("Error updating profile:", error);
      res.status(500).json({ 
        success: false, 
        message: "Internal server error" 
      });
    }
  },

  // POST /api/auth/logout
  async logout(req, res) {
    try {
      // Since we're using JWT tokens (stateless), logout is handled client-side
      // This endpoint exists for consistency and future token blacklisting if needed
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

