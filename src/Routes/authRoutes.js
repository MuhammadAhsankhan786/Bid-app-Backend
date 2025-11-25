import express from "express";
import { AuthController } from "../controllers/authController.js";
import { verifyUser } from "../middleware/authMiddleware.js";

const router = express.Router();

// ==================== MOBILE APP AUTHENTICATION ====================
// POST /api/auth/send-otp - Send OTP to phone (mobile app)
router.post("/send-otp", AuthController.sendOTP);

// POST /api/auth/verify-otp - Verify OTP and get token (mobile app)
router.post("/verify-otp", AuthController.verifyOTP);

// POST /api/auth/register - Register new user (mobile app)
router.post("/register", AuthController.register);

// POST /api/auth/login - Login with phone/email + password (mobile app)
router.post("/login", AuthController.login);

// ==================== ADMIN PANEL AUTHENTICATION ====================
// POST /api/auth/admin-login - Admin Panel Direct Login (NO OTP)
router.post("/admin-login", AuthController.adminLogin);

// POST /api/auth/login-phone - Legacy endpoint (deprecated for admin panel)
router.post("/login-phone", AuthController.loginPhone);

// ==================== TOKEN REFRESH ====================
// POST /api/auth/refresh - Refresh access token
router.post("/refresh", AuthController.refreshToken);

// ==================== PROFILE ROUTES (PROTECTED) ====================
// GET /api/auth/profile - Get user profile
router.get("/profile", verifyUser, AuthController.getProfile);

// PATCH /api/auth/profile - Update user profile
router.patch("/profile", verifyUser, AuthController.updateProfile);

// ==================== CHANGE PHONE ROUTES (PROTECTED) ====================
// POST /api/auth/change-phone/send-otp - Send OTP to new phone number
router.post("/change-phone/send-otp", verifyUser, AuthController.sendChangePhoneOTP);

// POST /api/auth/change-phone/verify - Verify OTP and update phone number
router.post("/change-phone/verify", verifyUser, AuthController.verifyChangePhone);

export default router;

