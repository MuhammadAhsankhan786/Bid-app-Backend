import express from "express";
import { CategoryController } from "../controllers/categoryController.js";
import { verifyAdmin } from "../middleware/authMiddleware.js";

const router = express.Router();

// Public routes
router.get("/", CategoryController.getAllCategories);
router.get("/:id", CategoryController.getCategoryById);

// Admin routes
router.post("/", verifyAdmin, CategoryController.createCategory);
router.put("/:id", verifyAdmin, CategoryController.updateCategory);
router.delete("/:id", verifyAdmin, CategoryController.deleteCategory);

export default router;



