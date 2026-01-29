import express from "express";
import { BuyerBiddingHistoryController } from "../controllers/buyerBiddingHistoryController.js";
import { verifyUser } from "../middleware/authMiddleware.js";

const router = express.Router();

// All routes require authentication
router.use(verifyUser);

// GET /api/buyer/bidding-history - Get buyer's complete bidding history
router.get("/", BuyerBiddingHistoryController.getBiddingHistory);

export default router;


