import express from "express";
import { BidsController } from "../controllers/bidsController.js";
import { verifyUser } from "../middleware/authMiddleware.js";

const router = express.Router();

// Protected routes (must come before /:productId to avoid route conflicts)
router.post("/place", verifyUser, BidsController.placeBid);
router.get("/mine", verifyUser, BidsController.getMyBids);

// Public route (anyone can view bids for a product)
router.get("/:productId", BidsController.getBidsByProduct);

export default router;

