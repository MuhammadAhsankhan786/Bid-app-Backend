import express from "express";
import { ReferralController } from "../controllers/referralController.js";
import { verifyUser } from "../middleware/authMiddleware.js";

const router = express.Router();

// All routes require authentication
router.use(verifyUser);

// User referral endpoints
router.get("/my-code", ReferralController.getMyReferralCode);
router.get("/history", ReferralController.getReferralHistory);

export default router;



