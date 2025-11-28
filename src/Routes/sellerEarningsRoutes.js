import express from "express";
import { SellerEarningsController } from "../controllers/sellerEarningsController.js";
import { verifyUser } from "../middleware/authMiddleware.js";

const router = express.Router();

// All routes require authentication
router.use(verifyUser);

// GET /api/seller/earnings - Get seller's earnings dashboard
router.get("/", SellerEarningsController.getEarnings);

export default router;

