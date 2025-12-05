import pool from "../config/db.js";
import { uploadToCloudinary, isConfigured as isCloudinaryConfigured } from "../config/cloudinary.js";

export const BannerController = {
  // GET /api/banners
  // Get all active banners (public endpoint)
  // If admin token is present and valid, returns all banners (including inactive)
  async getAllBanners(req, res) {
    try {
      // Check if user is admin by verifying token (but don't fail if no token - it's a public route)
      let isAdmin = false;
      const token = req.headers.authorization?.split(" ")[1];
      
      if (token && process.env.JWT_SECRET) {
        try {
          const jwt = await import("jsonwebtoken");
          const decoded = jwt.default.verify(token, process.env.JWT_SECRET);
          // Check if token has admin scope or user has admin role
          if (decoded && (decoded.scope === 'admin' || ['admin', 'superadmin', 'moderator', 'viewer'].includes(decoded.role?.toLowerCase()))) {
            isAdmin = true;
          }
        } catch (tokenError) {
          // Token invalid, expired, or missing - treat as public user (don't fail)
          // This is a public route, so we don't reject requests with invalid tokens
          isAdmin = false;
          // Silently ignore token errors for public routes
        }
      }
      
      let query;
      if (isAdmin) {
        // Admin can see all banners (including inactive)
        query = `SELECT 
          id,
          image_url as "imageUrl",
          title,
          link,
          is_active as "isActive",
          display_order as "displayOrder",
          created_at as "createdAt",
          updated_at as "updatedAt"
        FROM banners 
        ORDER BY display_order ASC, created_at DESC`;
      } else {
        // Public users only see active banners
        query = `SELECT 
          id,
          image_url as "imageUrl",
          title,
          link,
          is_active as "isActive",
          display_order as "displayOrder",
          created_at as "createdAt",
          updated_at as "updatedAt"
        FROM banners 
        WHERE is_active = true 
        ORDER BY display_order ASC, created_at DESC`;
      }

      const result = await pool.query(query);

      res.json({
        success: true,
        data: result.rows
      });
    } catch (error) {
      console.error("❌ Error fetching banners:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch banners"
      });
    }
  },

  // GET /api/banners/:id
  // Get single banner by ID
  async getBannerById(req, res) {
    try {
      const { id } = req.params;
      const result = await pool.query(
        `SELECT 
          id,
          image_url as "imageUrl",
          title,
          link,
          is_active as "isActive",
          display_order as "displayOrder",
          created_at as "createdAt",
          updated_at as "updatedAt"
        FROM banners 
        WHERE id = $1 AND is_active = true`,
        [id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Banner not found"
        });
      }

      res.json({
        success: true,
        data: result.rows[0]
      });
    } catch (error) {
      console.error("❌ Error fetching banner:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch banner"
      });
    }
  },

  // POST /api/banners (Admin only)
  // Create new banner
  async createBanner(req, res) {
    try {
      const { title, link, displayOrder, isActive } = req.body;
      let imageUrl = req.body.imageUrl;

      // If image file is uploaded, upload to Cloudinary
      if (req.file) {
        const useCloudinary = isCloudinaryConfigured();
        
        if (useCloudinary) {
          try {
            const uploadResult = await uploadToCloudinary(req.file.buffer, {
              folder: "banners",
              resource_type: "image",
            });
            imageUrl = uploadResult.secure_url;
            console.log('✅ [CreateBanner] Image uploaded to Cloudinary:', {
              public_id: uploadResult.public_id,
              url: imageUrl
            });
          } catch (cloudinaryError) {
            console.error('❌ [CreateBanner] Cloudinary upload failed:', cloudinaryError);
            return res.status(500).json({
              success: false,
              message: `Failed to upload image to Cloudinary: ${cloudinaryError.message}`
            });
          }
        } else {
          // Fallback to local storage (if needed)
          return res.status(400).json({
            success: false,
            message: "Cloudinary not configured. Please configure Cloudinary for image uploads."
          });
        }
      }

      if (!imageUrl) {
        return res.status(400).json({
          success: false,
          message: "Image URL or file is required"
        });
      }

      const result = await pool.query(
        `INSERT INTO banners (image_url, title, link, display_order, is_active) 
         VALUES ($1, $2, $3, $4, $5) 
         RETURNING 
           id,
           image_url as "imageUrl",
           title,
           link,
           is_active as "isActive",
           display_order as "displayOrder",
           created_at as "createdAt",
           updated_at as "updatedAt"`,
        [
          imageUrl,
          title || null,
          link || null,
          displayOrder || 0,
          isActive !== undefined ? isActive : true
        ]
      );

      res.status(201).json({
        success: true,
        message: "Banner created successfully",
        data: result.rows[0]
      });
    } catch (error) {
      console.error("❌ Error creating banner:", error);
      res.status(500).json({
        success: false,
        message: "Failed to create banner"
      });
    }
  },

  // PUT /api/banners/:id (Admin only)
  // Update banner
  async updateBanner(req, res) {
    try {
      const { id } = req.params;
      const { title, link, isActive, displayOrder } = req.body;
      let imageUrl = req.body.imageUrl;

      // Check if banner exists
      const existing = await pool.query(
        "SELECT id FROM banners WHERE id = $1",
        [id]
      );

      if (existing.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Banner not found"
        });
      }

      // If new image file is uploaded, upload to Cloudinary
      if (req.file) {
        const useCloudinary = isCloudinaryConfigured();
        
        if (useCloudinary) {
          try {
            const uploadResult = await uploadToCloudinary(req.file.buffer, {
              folder: "banners",
              resource_type: "image",
            });
            imageUrl = uploadResult.secure_url;
            console.log('✅ [UpdateBanner] Image uploaded to Cloudinary:', {
              public_id: uploadResult.public_id,
              url: imageUrl
            });
          } catch (cloudinaryError) {
            console.error('❌ [UpdateBanner] Cloudinary upload failed:', cloudinaryError);
            return res.status(500).json({
              success: false,
              message: `Failed to upload image to Cloudinary: ${cloudinaryError.message}`
            });
          }
        } else {
          return res.status(400).json({
            success: false,
            message: "Cloudinary not configured. Please configure Cloudinary for image uploads."
          });
        }
      }

      // Build update query dynamically
      const updates = [];
      const values = [];
      let paramCount = 1;

      if (imageUrl !== undefined) {
        updates.push(`image_url = $${paramCount++}`);
        values.push(imageUrl);
      }
      if (title !== undefined) {
        updates.push(`title = $${paramCount++}`);
        values.push(title);
      }
      if (link !== undefined) {
        updates.push(`link = $${paramCount++}`);
        values.push(link);
      }
      if (isActive !== undefined) {
        updates.push(`is_active = $${paramCount++}`);
        values.push(isActive);
      }
      if (displayOrder !== undefined) {
        updates.push(`display_order = $${paramCount++}`);
        values.push(displayOrder);
      }

      if (updates.length === 0) {
        return res.status(400).json({
          success: false,
          message: "No fields to update"
        });
      }

      // Add updated_at and id
      updates.push(`updated_at = CURRENT_TIMESTAMP`);
      values.push(id);

      const result = await pool.query(
        `UPDATE banners 
         SET ${updates.join(", ")} 
         WHERE id = $${paramCount}
         RETURNING 
           id,
           image_url as "imageUrl",
           title,
           link,
           is_active as "isActive",
           display_order as "displayOrder",
           created_at as "createdAt",
           updated_at as "updatedAt"`,
        values
      );

      res.json({
        success: true,
        message: "Banner updated successfully",
        data: result.rows[0]
      });
    } catch (error) {
      console.error("❌ Error updating banner:", error);
      res.status(500).json({
        success: false,
        message: "Failed to update banner"
      });
    }
  },

  // DELETE /api/banners/:id (Admin only)
  // Delete banner
  async deleteBanner(req, res) {
    try {
      const { id } = req.params;

      // Check if banner exists
      const existing = await pool.query(
        "SELECT id, image_url FROM banners WHERE id = $1",
        [id]
      );

      if (existing.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Banner not found"
        });
      }

      // Delete banner from database
      await pool.query("DELETE FROM banners WHERE id = $1", [id]);

      // Note: Cloudinary image deletion can be added here if needed
      // For now, we'll keep the image in Cloudinary (can be cleaned up manually)

      res.json({
        success: true,
        message: "Banner deleted successfully"
      });
    } catch (error) {
      console.error("❌ Error deleting banner:", error);
      res.status(500).json({
        success: false,
        message: "Failed to delete banner"
      });
    }
  }
};

