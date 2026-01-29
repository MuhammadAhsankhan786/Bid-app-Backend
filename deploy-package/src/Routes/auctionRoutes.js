import express from "express";
import { AuctionController } from "../controllers/auctionController.js";
import { verifyUser } from "../middleware/authMiddleware.js";

const router = express.Router();

// Public route
router.get("/winner/:productId", AuctionController.getWinner);

// Protected route - Seller-verified winner details
router.get("/seller/:productId/winner", verifyUser, AuctionController.getSellerWinner);

export default router;

