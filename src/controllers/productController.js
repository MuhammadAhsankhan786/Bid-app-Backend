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
          EXTRACT(EPOCH FROM (p.auction_end_time - NOW())) / 3600 as hours_left
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

  // Approve product
  async approveProduct(req, res) {
    try {
      const { id } = req.params;
      const { auctionEndTime } = req.body;

      const result = await pool.query(
        `UPDATE products 
         SET status = 'approved', 
             auction_end_time = COALESCE($2, NOW() + INTERVAL '7 days')
         WHERE id = $1 
         RETURNING *`,
        [id, auctionEndTime]
      );

      if (result.rowCount === 0) {
        return res.status(404).json({ error: "Product not found" });
      }

      // Log admin action
      await pool.query(
        `INSERT INTO admin_activity_log (admin_id, action, entity_type, entity_id)
         VALUES ($1, 'Product approved', 'product', $2)`,
        [req.user.id, id]
      );

      res.json({ success: true, product: result.rows[0] });
    } catch (error) {
      console.error("Error approving product:", error);
      res.status(500).json({ error: "Failed to approve product" });
    }
  },

  // Reject product
  async rejectProduct(req, res) {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      const result = await pool.query(
        `UPDATE products SET status = 'rejected' WHERE id = $1 RETURNING *`,
        [id]
      );

      if (result.rowCount === 0) {
        return res.status(404).json({ error: "Product not found" });
      }

      // Log admin action
      await pool.query(
        `INSERT INTO admin_activity_log (admin_id, action, entity_type, entity_id, details)
         VALUES ($1, 'Product rejected', 'product', $2, $3)`,
        [req.user.id, id, JSON.stringify({ reason: reason || 'No reason provided' })]
      );

      res.json({ success: true, product: result.rows[0] });
    } catch (error) {
      console.error("Error rejecting product:", error);
      res.status(500).json({ error: "Failed to reject product" });
    }
  },

  // Get product by ID
  async getProductById(req, res) {
    try {
      const { id } = req.params;
      
      const result = await pool.query(`
        SELECT 
          p.*,
          u.name as seller_name,
          u.email as seller_email,
          c.name as category_name
        FROM products p
        LEFT JOIN users u ON p.seller_id = u.id
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE p.id = $1
      `, [id]);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Product not found" });
      }

      res.json(result.rows[0]);
    } catch (error) {
      console.error("Error fetching product:", error);
      res.status(500).json({ error: "Failed to fetch product" });
    }
  }
};

