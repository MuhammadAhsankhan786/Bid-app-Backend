import express from "express";
import multer from "multer";
import { BannerController } from "../controllers/bannerController.js";
import { verifyAdmin } from "../middleware/authMiddleware.js";
import { isConfigured as isCloudinaryConfigured } from "../config/cloudinary.js";

const router = express.Router();

// Configure multer for image uploads (same as products)
const useCloudinary = isCloudinaryConfigured();
const storage = useCloudinary ? multer.memoryStorage() : multer.memoryStorage(); // Always use memory for Cloudinary

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(file.originalname.toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files (jpeg, jpg, png, gif, webp) are allowed'));
    }
  }
});

// Public routes - Get all active banners
router.get("/", BannerController.getAllBanners);

// Public route - Get single banner by ID
router.get("/:id", BannerController.getBannerById);

// Admin routes - CRUD operations (Admin, SuperAdmin, Moderator, Viewer roles)
router.post("/", verifyAdmin, upload.single("image"), BannerController.createBanner);
router.put("/:id", verifyAdmin, upload.single("image"), BannerController.updateBanner);
router.delete("/:id", verifyAdmin, BannerController.deleteBanner);

export default router;

