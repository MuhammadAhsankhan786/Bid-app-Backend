import pool from "../config/db.js";

export const ProductController = {
  // Get all products with filters
  async getProducts(req, res) {
    try {
      const { status, category, search, page = 1, limit = 20 } = req.query;
      
      let query = `
        SELECT 
          p.*,
          u.name as seller_name,
          u.email as seller_email,
          c.name as category_name,
          buyer.name as highest_bidder_name
        FROM products p
        LEFT JOIN users u ON p.seller_id = u.id
        LEFT JOIN categories c ON p.category_id = c.id
        LEFT JOIN users buyer ON p.highest_bidder_id = buyer.id
        WHERE 1=1
      `;
      const params = [];
      let paramCount = 1;

      if (status) {
        query += ` AND p.status = $${paramCount++}`;
        params.push(status);
      }

      if (category) {
        query += ` AND p.category_id = $${paramCount++}`;
        params.push(category);
      }

      if (search) {
        query += ` AND (p.title ILIKE $${paramCount++} OR p.description ILIKE $${paramCount})`;
        params.push(`%${search}%`, `%${search}%`);
        paramCount++;
      }

      query += ` ORDER BY p.created_at DESC LIMIT $${paramCount++} OFFSET $${paramCount}`;
      params.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit));

      const result = await pool.query(query, params);
      const countResult = await pool.query(`
        SELECT COUNT(*) FROM products 
        WHERE ${status ? `status = '${status}'` : '1=1'}
      `);

      res.json({
        products: result.rows,
        pagination: {
          total: parseInt(countResult.rows[0].count),
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(countResult.rows[0].count / limit)
        }
      });
    } catch (error) {
      console.error("Error fetching products:", error);
      res.status(500).json({ error: "Failed to fetch products" });
    }
  },

  // Get pending products
  async getPendingProducts(req, res) {
    try {
      const result = await pool.query(`
        SELECT 
          p.*,
          u.name as seller_name,
          u.email as seller_email,
          c.name as category_name
        FROM products p
        LEFT JOIN users u ON p.seller_id = u.id
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE p.status = 'pending'
        ORDER BY p.created_at DESC
      `);

      res.json(result.rows);
    } catch (error) {
      console.error("Error fetching pending products:", error);
      res.status(500).json({ error: "Failed to fetch pending products" });
    }
  },

  // Get live auctions
  async getLiveAuctions(req, res) {
    try {
      const result = await pool.query(`
        SELECT 
          p.*,
          u.name as seller_name,
          buyer.name as highest_bidder_name,
          c.name as category_name,
          EXTRACT(EPOCH FROM (p.auction_end_time - NOW())) / 3600 as hours_left,
          (SELECT COUNT(*) FROM bids WHERE product_id = p.id) as bid_count
        FROM products p
        LEFT JOIN users u ON p.seller_id = u.id
        LEFT JOIN users buyer ON p.highest_bidder_id = buyer.id
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE p.status = 'approved' 
          AND p.auction_end_time > NOW()
        ORDER BY p.auction_end_time ASC
      `);

      res.json(result.rows.map(product => ({
        ...product,
        status: product.hours_left < 2 ? 'ending' : product.hours_left < 6 ? 'hot' : 'active'
      })));
    } catch (error) {
      console.error("Error fetching live auctions:", error);
      res.status(500).json({ error: "Failed to fetch live auctions" });
    }
  },

  // Get rejected products
  async getRejectedProducts(req, res) {
    try {
      const result = await pool.query(`
        SELECT 
          p.*,
          u.name as seller_name,
          u.email as seller_email,
          c.name as category_name
        FROM products p
        LEFT JOIN users u ON p.seller_id = u.id
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE p.status = 'rejected'
        ORDER BY p.updated_at DESC, p.created_at DESC
      `);

      res.json(result.rows);
    } catch (error) {
      console.error("Error fetching rejected products:", error);
      res.status(500).json({ error: "Failed to fetch rejected products" });
    }
  },

  // Get completed products (auctions that ended)
  async getCompletedProducts(req, res) {
    try {
      const { page = 1, limit = 20 } = req.query;
      const offset = (parseInt(page) - 1) * parseInt(limit);

      const result = await pool.query(`
        SELECT 
          p.*,
          u.name as seller_name,
          buyer.name as highest_bidder_name,
          c.name as category_name,
          (SELECT COUNT(*) FROM bids WHERE product_id = p.id) as bid_count
        FROM products p
        LEFT JOIN users u ON p.seller_id = u.id
        LEFT JOIN users buyer ON p.highest_bidder_id = buyer.id
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE p.status = 'approved' 
          AND p.auction_end_time <= NOW()
        ORDER BY p.auction_end_time DESC
        LIMIT $1 OFFSET $2
      `, [parseInt(limit), offset]);

      const countResult = await pool.query(`
        SELECT COUNT(*) as total
        FROM products
        WHERE status = 'approved' 
          AND auction_end_time <= NOW()
      `);

      res.json({
        products: result.rows,
        pagination: {
          total: parseInt(countResult.rows[0].total),
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(countResult.rows[0].total / limit)
        }
      });
    } catch (error) {
      console.error("Error fetching completed products:", error);
      res.status(500).json({ error: "Failed to fetch completed products" });
    }
  },

  // Approve product
  async approveProduct(req, res) {
    try {
      console.log('🧩 [ApproveProduct] Request received:', {
        productId: req.params.id,
        userId: req.user?.id,
        userRole: req.user?.role
      });

      const { id } = req.params;
      const { auctionEndTime } = req.body;

      // Validate product ID
      if (!id || isNaN(parseInt(id))) {
        return res.status(400).json({ 
          success: false,
          message: "Invalid product ID" 
        });
      }

      // Check if product exists
      const productCheck = await pool.query(
        "SELECT id, title, status FROM products WHERE id = $1",
        [id]
      );

      if (productCheck.rows.length === 0) {
        return res.status(404).json({ 
          success: false,
          message: "Product not found" 
        });
      }

      // Update product status with rejection_reason cleared
      const result = await pool.query(
        `UPDATE products 
         SET status = 'approved', 
             rejection_reason = NULL,
             auction_end_time = COALESCE($2, NOW() + INTERVAL '7 days'),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $1 
         RETURNING *`,
        [id, auctionEndTime]
      );

      if (result.rowCount === 0) {
        return res.status(404).json({ 
          success: false,
          message: "Product not found" 
        });
      }

      console.log('✅ [ApproveProduct] Product approved:', result.rows[0].id);

      res.json({
        success: true,
        message: "Product approved successfully",
        data: result.rows[0]
      });
    } catch (error) {
      console.error("❌ [ApproveProduct] Error:", error);
      res.status(500).json({ 
        success: false,
        message: "Failed to approve product" 
      });
    }
  },

  // Reject product
  async rejectProduct(req, res) {
    try {
      const { id } = req.params;
      const { rejection_reason } = req.body;

      // Validate product ID
      if (!id || isNaN(parseInt(id))) {
        return res.status(400).json({ 
          success: false,
          message: "Invalid product ID" 
        });
      }

      // Check if product exists
      const productCheck = await pool.query(
        "SELECT id, title, status FROM products WHERE id = $1",
        [id]
      );

      if (productCheck.rows.length === 0) {
        return res.status(404).json({ 
          success: false,
          message: "Product not found" 
        });
      }

      // Update product status with rejection reason
      const result = await pool.query(
        `UPDATE products 
         SET status = 'rejected', 
             rejection_reason = $2,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $1 
         RETURNING *`,
        [id, rejection_reason || null]
      );

      if (result.rowCount === 0) {
        return res.status(404).json({ 
          success: false,
          message: "Product not found" 
        });
      }

      console.log('✅ [RejectProduct] Product rejected:', result.rows[0].id);

      res.json({
        success: true,
        message: "Product rejected successfully",
        data: result.rows[0]
      });
    } catch (error) {
      console.error("❌ [RejectProduct] Error:", error);
      res.status(500).json({ 
        success: false,
        message: "Failed to reject product" 
      });
    }
  },

  // Get product by ID (with full details)
  async getProductById(req, res) {
    try {
      const { id } = req.params;
      
      const result = await pool.query(`
        SELECT 
          p.*,
          u.name as seller_name,
          u.email as seller_email,
          u.phone as seller_phone,
          c.name as category_name,
          c.slug as category_slug
        FROM products p
        LEFT JOIN users u ON p.seller_id = u.id
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE p.id = $1
      `, [id]);

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Product not found"
        });
      }

      res.json({
        success: true,
        data: result.rows[0]
      });
    } catch (error) {
      console.error("❌ [GetProductById] Error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch product"
      });
    }
  },

  // Log admin action (optional - don't fail if table doesn't exist)
  async _logAdminAction(req, action, entityType, entityId) {
    try {
      // Check if admin_activity_log table exists
      const tableCheck = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'admin_activity_log'
        )
      `);

      if (tableCheck.rows[0].exists) {
        await pool.query(
          `INSERT INTO admin_activity_log (admin_id, action, entity_type, entity_id)
           VALUES ($1, $2, $3, $4)`,
          [req.user.id, action, entityType, entityId]
        );
      }
    } catch (logError) {
      // Don't fail the request if logging fails
      console.log('Warning: Could not log admin action:', logError.message);
    }
  },

  // ✅ Get Product Documents
  async getProductDocuments(req, res) {
    try {
      const { id } = req.params;

      const result = await pool.query(`
        SELECT 
          d.*,
          p.title as product_title
        FROM documents d
        LEFT JOIN products p ON d.product_id = p.id
        WHERE d.product_id = $1
        ORDER BY d.uploaded_at DESC
      `, [id]);

      res.json({
        success: true,
        data: result.rows
      });
    } catch (error) {
      console.error("Error fetching product documents:", error);
      res.status(500).json({ error: "Failed to fetch product documents" });
    }
  },

  // PUT /admin/products/:id - Update product (Super Admin only)
  async updateProduct(req, res) {
    try {
      const { id } = req.params;
      const { title, description, image_url, startingPrice, category_id } = req.body;
      const userRole = (req.user.role || '').toLowerCase().trim();

      // Permission check: Only Super Admin can edit products from admin panel
      if (userRole !== 'superadmin') {
        return res.status(403).json({
          success: false,
          error: "Only Super Admin can edit products"
        });
      }

      // Check if product exists
      const productCheck = await pool.query(
        "SELECT id FROM products WHERE id = $1",
        [id]
      );

      if (productCheck.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: "Product not found"
        });
      }

      // Build update query
      const updates = [];
      const params = [];
      let paramCount = 1;

      if (title) {
        updates.push(`title = $${paramCount++}`);
        params.push(title);
      }
      if (description !== undefined) {
        updates.push(`description = $${paramCount++}`);
        params.push(description);
      }
      if (image_url !== undefined) {
        const imageUrlValue = Array.isArray(image_url) ? JSON.stringify(image_url) : (image_url || null);
        updates.push(`image_url = $${paramCount++}`);
        params.push(imageUrlValue);
      }
      if (startingPrice !== undefined) {
        updates.push(`starting_price = $${paramCount++}`);
        updates.push(`starting_bid = $${paramCount}`);
        params.push(startingPrice);
        paramCount++;
      }
      if (category_id !== undefined) {
        updates.push(`category_id = $${paramCount++}`);
        params.push(category_id);
      }

      if (updates.length === 0) {
        return res.status(400).json({
          success: false,
          error: "No fields to update"
        });
      }

      params.push(id);
      const result = await pool.query(
        `UPDATE products 
         SET ${updates.join(', ')}
         WHERE id = $${paramCount}
         RETURNING *`,
        params
      );

      if (result.rowCount === 0) {
        return res.status(404).json({
          success: false,
          error: "Product not found"
        });
      }

      res.json({
        success: true,
        message: "Product updated successfully",
        product: result.rows[0]
      });
    } catch (error) {
      console.error("Error updating product:", error);
      res.status(500).json({
        success: false,
        error: "Failed to update product"
      });
    }
  },

  // DELETE /admin/products/:id - Delete product (Super Admin only)
  async deleteProduct(req, res) {
    try {
      const { id } = req.params;
      const userRole = (req.user.role || '').toLowerCase().trim();

      // Permission check: Only Super Admin can delete products
      if (userRole !== 'superadmin') {
        return res.status(403).json({
          success: false,
          error: "Only Super Admin can delete products"
        });
      }

      // Check if product exists
      const productCheck = await pool.query(
        "SELECT id, title FROM products WHERE id = $1",
        [id]
      );

      if (productCheck.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: "Product not found"
        });
      }

      // Delete product
      const result = await pool.query(
        "DELETE FROM products WHERE id = $1 RETURNING id, title",
        [id]
      );

      if (result.rowCount === 0) {
        return res.status(404).json({
          success: false,
          error: "Product not found"
        });
      }

      // Log admin action
      try {
        const tableCheck = await pool.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_name = 'admin_activity_log'
          )
        `);

        if (tableCheck.rows[0].exists) {
          await pool.query(
            `INSERT INTO admin_activity_log (admin_id, action, entity_type, entity_id)
             VALUES ($1, 'Product deleted', 'product', $2)`,
            [req.user.id, id]
          );
        }
      } catch (logError) {
        console.log('Warning: Could not log admin action:', logError.message);
      }

      res.json({
        success: true,
        message: "Product deleted successfully",
        product: { id: result.rows[0].id, title: result.rows[0].title }
      });
    } catch (error) {
      console.error("Error deleting product:", error);
      res.status(500).json({
        success: false,
        error: "Failed to delete product"
      });
    }
  }
};

