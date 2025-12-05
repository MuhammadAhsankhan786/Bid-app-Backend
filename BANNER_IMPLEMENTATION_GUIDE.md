# Banner Implementation Guide (Cloudinary Support)

## Overview
Banner carousel ab backend API se banners fetch karta hai aur Cloudinary URLs support karta hai (same as product images).

## Backend Implementation

### 1. Database Schema (MySQL)

```sql
CREATE TABLE banners (
  id INT PRIMARY KEY AUTO_INCREMENT,
  image_url VARCHAR(500) NOT NULL,  -- Cloudinary URL
  title VARCHAR(255),
  link VARCHAR(500),  -- Optional: Where to navigate on click
  is_active BOOLEAN DEFAULT TRUE,
  display_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### 2. Create Banner Routes (`src/Routes/bannerRoutes.js`)

```javascript
import express from "express";
import { BannerController } from "../controllers/bannerController.js";
import { verifyAdmin } from "../middleware/authMiddleware.js";

const router = express.Router();

// Public route - Get all active banners
router.get("/", BannerController.getAllBanners);

// Admin routes
router.post("/", verifyAdmin, BannerController.createBanner);
router.put("/:id", verifyAdmin, BannerController.updateBanner);
router.delete("/:id", verifyAdmin, BannerController.deleteBanner);

export default router;
```

### 3. Create Banner Controller (`src/controllers/bannerController.js`)

```javascript
import { db } from "../config/database.js";
import { uploadToCloudinary } from "../config/cloudinary.js";

export const BannerController = {
  // GET /api/banners - Get all active banners
  getAllBanners: async (req, res) => {
    try {
      const [banners] = await db.query(
        `SELECT 
          id,
          image_url as imageUrl,
          title,
          link,
          is_active as isActive,
          display_order as displayOrder
        FROM banners 
        WHERE is_active = TRUE 
        ORDER BY display_order ASC, created_at DESC`
      );

      res.json({
        success: true,
        data: banners,
      });
    } catch (error) {
      console.error("❌ Error fetching banners:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch banners",
      });
    }
  },

  // POST /api/banners - Create new banner (Admin only)
  createBanner: async (req, res) => {
    try {
      const { title, link, displayOrder } = req.body;
      let imageUrl = req.body.imageUrl;

      // If image file is uploaded, upload to Cloudinary
      if (req.file) {
        const uploadResult = await uploadToCloudinary(req.file.buffer, {
          folder: "banners",
          resource_type: "image",
        });
        imageUrl = uploadResult.secure_url;
      }

      if (!imageUrl) {
        return res.status(400).json({
          success: false,
          message: "Image URL or file is required",
        });
      }

      const [result] = await db.query(
        `INSERT INTO banners (image_url, title, link, display_order) 
         VALUES (?, ?, ?, ?)`,
        [imageUrl, title || null, link || null, displayOrder || 0]
      );

      const [banner] = await db.query(
        `SELECT 
          id,
          image_url as imageUrl,
          title,
          link,
          is_active as isActive,
          display_order as displayOrder
        FROM banners 
        WHERE id = ?`,
        [result.insertId]
      );

      res.status(201).json({
        success: true,
        data: banner[0],
        message: "Banner created successfully",
      });
    } catch (error) {
      console.error("❌ Error creating banner:", error);
      res.status(500).json({
        success: false,
        message: "Failed to create banner",
      });
    }
  },

  // PUT /api/banners/:id - Update banner (Admin only)
  updateBanner: async (req, res) => {
    try {
      const { id } = req.params;
      const { title, link, isActive, displayOrder } = req.body;
      let imageUrl = req.body.imageUrl;

      // If new image file is uploaded, upload to Cloudinary
      if (req.file) {
        const uploadResult = await uploadToCloudinary(req.file.buffer, {
          folder: "banners",
          resource_type: "image",
        });
        imageUrl = uploadResult.secure_url;
      }

      // Build update query dynamically
      const updates = [];
      const values = [];

      if (imageUrl !== undefined) {
        updates.push("image_url = ?");
        values.push(imageUrl);
      }
      if (title !== undefined) {
        updates.push("title = ?");
        values.push(title);
      }
      if (link !== undefined) {
        updates.push("link = ?");
        values.push(link);
      }
      if (isActive !== undefined) {
        updates.push("is_active = ?");
        values.push(isActive);
      }
      if (displayOrder !== undefined) {
        updates.push("display_order = ?");
        values.push(displayOrder);
      }

      if (updates.length === 0) {
        return res.status(400).json({
          success: false,
          message: "No fields to update",
        });
      }

      values.push(id);

      await db.query(
        `UPDATE banners SET ${updates.join(", ")} WHERE id = ?`,
        values
      );

      const [banner] = await db.query(
        `SELECT 
          id,
          image_url as imageUrl,
          title,
          link,
          is_active as isActive,
          display_order as displayOrder
        FROM banners 
        WHERE id = ?`,
        [id]
      );

      res.json({
        success: true,
        data: banner[0],
        message: "Banner updated successfully",
      });
    } catch (error) {
      console.error("❌ Error updating banner:", error);
      res.status(500).json({
        success: false,
        message: "Failed to update banner",
      });
    }
  },

  // DELETE /api/banners/:id - Delete banner (Admin only)
  deleteBanner: async (req, res) => {
    try {
      const { id } = req.params;

      await db.query("DELETE FROM banners WHERE id = ?", [id]);

      res.json({
        success: true,
        message: "Banner deleted successfully",
      });
    } catch (error) {
      console.error("❌ Error deleting banner:", error);
      res.status(500).json({
        success: false,
        message: "Failed to delete banner",
      });
    }
  },
};
```

### 4. Register Banner Routes in `src/index.js` or `src/app.js`

```javascript
import bannerRoutes from "./Routes/bannerRoutes.js";

// Add this with other routes
app.use("/api/banners", bannerRoutes);
```

### 5. Upload Banner with Image (Using Multer)

Banner upload ke liye same multer setup use karein jo product images ke liye hai:

```javascript
// In bannerRoutes.js, add multer middleware
import multer from "multer";
import { uploadToCloudinary } from "../config/cloudinary.js";

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Update routes
router.post("/", verifyAdmin, upload.single("image"), BannerController.createBanner);
router.put("/:id", verifyAdmin, upload.single("image"), BannerController.updateBanner);
```

## API Response Format

### GET /api/banners
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "imageUrl": "https://res.cloudinary.com/your-cloud/image/upload/v1234567890/banners/banner1.jpg",
      "title": "Summer Sale",
      "link": "/products?category=electronics",
      "isActive": true,
      "displayOrder": 1
    },
    {
      "id": 2,
      "imageUrl": "https://res.cloudinary.com/your-cloud/image/upload/v1234567890/banners/banner2.jpg",
      "title": "New Arrivals",
      "link": "/products?category=fashion",
      "isActive": true,
      "displayOrder": 2
    }
  ]
}
```

## Flutter App Integration

Flutter app already configured hai! Banner carousel automatically:
- ✅ Backend API se banners fetch karta hai
- ✅ Cloudinary URLs handle karta hai (ImageUrlHelper use karta hai)
- ✅ Cached network images use karta hai (offline support)
- ✅ Fallback banners use karta hai agar API fail ho

## Testing

### 1. Create Banner via API
```bash
POST /api/banners
Headers: Authorization: Bearer <admin_token>
Body (form-data):
  - image: <file>
  - title: "Summer Sale"
  - link: "/products?category=electronics"
  - displayOrder: 1
```

### 2. Get All Banners
```bash
GET /api/banners
```

## Benefits

1. **Cloudinary Integration**: Same as product images
2. **Dynamic Management**: Admin panel se banners update kar sakte hain
3. **No App Updates**: Banners change karne ke liye app update ki zaroorat nahi
4. **CDN Performance**: Cloudinary CDN se fast loading
5. **Image Optimization**: Cloudinary automatically optimizes images

## Notes

- Banner images Cloudinary mein `banners/` folder mein store hongi
- Flutter app automatically Cloudinary URLs handle karta hai
- Agar Cloudinary configure nahi hai, to local storage use hoga (same as products)

