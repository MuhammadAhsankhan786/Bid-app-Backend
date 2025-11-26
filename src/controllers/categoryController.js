import pool from "../config/db.js";

export const CategoryController = {
  // GET /api/categories
  // Get all active categories (public endpoint)
  async getAllCategories(req, res) {
    try {
      const result = await pool.query(
        `SELECT id, name, slug, description, active, created_at 
         FROM categories 
         WHERE active = true 
         ORDER BY name ASC`
      );

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
  }
};

