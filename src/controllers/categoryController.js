import pool from "../config/db.js";
import jwt from "jsonwebtoken";

export const CategoryController = {
  // GET /api/categories
  // Get all categories (public endpoint - returns active only)
  // If admin token is present and valid, returns all categories (including inactive)
  async getAllCategories(req, res) {
    try {
      // Check if user is admin by verifying token (but don't fail if no token - it's a public route)
      let isAdmin = false;
      const token = req.headers.authorization?.split(" ")[1];
      
      if (token && process.env.JWT_SECRET) {
        try {
          const decoded = jwt.verify(token, process.env.JWT_SECRET);
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
        // Admin can see all categories (including inactive)
        query = `SELECT id, name, slug, description, active, created_at, updated_at
                 FROM categories 
                 ORDER BY name ASC`;
      } else {
        // Public users only see active categories
        query = `SELECT id, name, slug, description, active, created_at, updated_at
                 FROM categories 
                 WHERE active = true 
                 ORDER BY name ASC`;
      }

      const result = await pool.query(query);

      res.json({
        success: true,
        data: result.rows
      });
    } catch (error) {
      console.error("Error fetching categories:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch categories"
      });
    }
  },

  // GET /api/categories/:id
  // Get single category by ID
  async getCategoryById(req, res) {
    try {
      const { id } = req.params;
      const result = await pool.query(
        `SELECT id, name, slug, description, active, created_at 
         FROM categories 
         WHERE id = $1 AND active = true`,
        [id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Category not found"
        });
      }

      res.json({
        success: true,
        data: result.rows[0]
      });
    } catch (error) {
      console.error("Error fetching category:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch category"
      });
    }
  },

  // POST /api/admin/categories (Admin only)
  // Create new category
  async createCategory(req, res) {
    try {
      const { name, slug, description } = req.body;

      if (!name || !slug) {
        return res.status(400).json({
          success: false,
          message: "Name and slug are required"
        });
      }

      // Check if slug already exists
      const existing = await pool.query(
        "SELECT id FROM categories WHERE slug = $1",
        [slug]
      );

      if (existing.rows.length > 0) {
        return res.status(400).json({
          success: false,
          message: "Category with this slug already exists"
        });
      }

      const result = await pool.query(
        `INSERT INTO categories (name, slug, description, active) 
         VALUES ($1, $2, $3, true) 
         RETURNING id, name, slug, description, active, created_at`,
        [name, slug, description || null]
      );

      res.status(201).json({
        success: true,
        message: "Category created successfully",
        data: result.rows[0]
      });
    } catch (error) {
      console.error("Error creating category:", error);
      res.status(500).json({
        success: false,
        message: "Failed to create category"
      });
    }
  },

  // PUT /api/categories/:id (Admin only)
  // Update category
  async updateCategory(req, res) {
    try {
      const { id } = req.params;
      const { name, slug, description, active } = req.body;

      if (!name) {
        return res.status(400).json({
          success: false,
          message: "Name is required"
        });
      }

      // Check if category exists
      const existing = await pool.query(
        "SELECT id FROM categories WHERE id = $1",
        [id]
      );

      if (existing.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Category not found"
        });
      }

      // Check if slug already exists (for another category)
      if (slug) {
        const slugCheck = await pool.query(
          "SELECT id FROM categories WHERE slug = $1 AND id != $2",
          [slug, id]
        );

        if (slugCheck.rows.length > 0) {
          return res.status(400).json({
            success: false,
            message: "Category with this slug already exists"
          });
        }
      }

      const result = await pool.query(
        `UPDATE categories 
         SET name = $1, 
             slug = COALESCE($2, slug),
             description = COALESCE($3, description),
             active = COALESCE($4, active),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $5
         RETURNING id, name, slug, description, active, created_at, updated_at`,
        [name, slug || null, description || null, active !== undefined ? active : null, id]
      );

      res.json({
        success: true,
        message: "Category updated successfully",
        data: result.rows[0]
      });
    } catch (error) {
      console.error("Error updating category:", error);
      res.status(500).json({
        success: false,
        message: "Failed to update category"
      });
    }
  },

  // DELETE /api/categories/:id (Admin only)
  // Soft delete category (set active = false)
  async deleteCategory(req, res) {
    try {
      const { id } = req.params;

      // Check if category exists
      const existing = await pool.query(
        "SELECT id, name FROM categories WHERE id = $1",
        [id]
      );

      if (existing.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Category not found"
        });
      }

      // Check if category is used by any products
      const productsCheck = await pool.query(
        "SELECT COUNT(*) as count FROM products WHERE category_id = $1",
        [id]
      );

      if (parseInt(productsCheck.rows[0].count) > 0) {
        // Soft delete - set active = false
        await pool.query(
          `UPDATE categories 
           SET active = false, updated_at = CURRENT_TIMESTAMP
           WHERE id = $1`,
          [id]
        );

        res.json({
          success: true,
          message: "Category deactivated (has associated products)",
          data: { id, name: existing.rows[0].name, active: false }
        });
      } else {
        // Hard delete - no products using it
        await pool.query("DELETE FROM categories WHERE id = $1", [id]);

        res.json({
          success: true,
          message: "Category deleted successfully",
          data: { id, name: existing.rows[0].name }
        });
      }
    } catch (error) {
      console.error("Error deleting category:", error);
      res.status(500).json({
        success: false,
        message: "Failed to delete category"
      });
    }
  }
};



