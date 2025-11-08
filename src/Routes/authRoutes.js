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
// POST /api/auth/login-phone - Admin Panel Phone-based Login (Mock OTP)
router.post("/login-phone", AuthController.loginPhone);

// ==================== PROFILE ROUTES (PROTECTED) ====================
// GET /api/auth/profile - Get user profile
router.get("/profile", verifyUser, AuthController.getProfile);

// PATCH /api/auth/profile - Update user profile
router.patch("/profile", verifyUser, AuthController.updateProfile);

export default router;

