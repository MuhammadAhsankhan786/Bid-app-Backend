import express from "express";
import { MobileProductController } from "../controllers/mobileProductController.js";
import { verifyUser } from "../middleware/authMiddleware.js";

const router = express.Router();

// Public routes
router.get("/", MobileProductController.getAllProducts);
router.get("/:id", MobileProductController.getProductById);

// Protected routes (seller only for create, user for mine)
router.post("/create", verifyUser, MobileProductController.createProduct);
router.get("/mine", verifyUser, MobileProductController.getMyProducts);

export default router;

