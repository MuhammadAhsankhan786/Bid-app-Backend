import express from "express";
import { AuctionController } from "../controllers/auctionController.js";

const router = express.Router();

// Public route
router.get("/winner/:productId", AuctionController.getWinner);

export default router;

