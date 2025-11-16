import express from "express";
import { MobileProductController } from "../controllers/mobileProductController.js";
import { verifyUser } from "../middleware/authMiddleware.js";

const router = express.Router();

// Public routes
router.get("/", MobileProductController.getAllProducts);

// Protected routes - MUST come before /:id route to avoid route conflicts
router.get("/mine", verifyUser, MobileProductController.getMyProducts);
router.post("/create", verifyUser, MobileProductController.createProduct);
router.put("/:id", verifyUser, MobileProductController.updateProduct);
router.delete("/:id", verifyUser, MobileProductController.deleteProduct);

// Dynamic routes - MUST come last
router.get("/:id", MobileProductController.getProductById);

export default router;

