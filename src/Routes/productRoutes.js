import express from "express";
import { MobileProductController } from "../controllers/mobileProductController.js";
import { verifyUser } from "../middleware/authMiddleware.js";

const router = express.Router();

// Public routes
router.get("/", MobileProductController.getAllProducts);

// Protected routes - MUST come before /:id route to avoid route conflicts
router.get("/mine", verifyUser, MobileProductController.getMyProducts);
router.get("/seller/products", verifyUser, MobileProductController.getSellerProducts); // Alias for /mine with status filter
router.post("/create", verifyUser, MobileProductController.createProduct);
router.post("/seller/products", verifyUser, MobileProductController.createProduct); // Alias for /create
router.put("/:id", verifyUser, MobileProductController.updateProduct);
router.delete("/:id", verifyUser, MobileProductController.deleteProduct);

// Dynamic routes - MUST come last
router.get("/:id", MobileProductController.getProductById);

export default router;

