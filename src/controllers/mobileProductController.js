import pool from "../config/db.js";

export const MobileProductController = {
  // POST /api/products/create
  async createProduct(req, res) {
    try {
      const { title, description, image_url, startingPrice, duration, category_id } = req.body;
      const sellerId = req.user.id;

      if (!title || !startingPrice) {
        return res.status(400).json({
          success: false,
          message: "Title and starting price are required"
        });
      }

      // Validate seller role
      if (req.user.role !== 'seller') {
        return res.status(403).json({
          success: false,
          message: "Only sellers can create products"
        });
      }

      // Calculate auction end time (duration in days, default 7 days)
      const days = duration || 7;
      const auctionEndTime = new Date();
      auctionEndTime.setDate(auctionEndTime.getDate() + days);

      // Create product with status 'pending'
      // Note: Handle image_url as string (can be JSON stringified array or single URL)
      const imageUrlValue = Array.isArray(image_url) ? JSON.stringify(image_url) : (image_url || null);

      const result = await pool.query(
        `INSERT INTO products 
         (seller_id, title, description, image_url, starting_price, starting_bid, 
          current_price, current_bid, status, auction_end_time, category_id) 
         VALUES ($1, $2, $3, $4, $5, $5, $5, $5, 'pending', $6, $7) 
         RETURNING *`,
        [sellerId, title, description || null, imageUrlValue, startingPrice, auctionEndTime, category_id || null]
      );

      res.status(201).json({
        success: true,
        message: "Product created successfully and pending approval",
        data: result.rows[0]
      });
    } catch (error) {
      console.error("Error creating product:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error"
      });
    }
  },

  // GET /api/products/mine
  async getMyProducts(req, res) {
    try {
      const userId = req.user.id;
      const { status } = req.query;

      let query = `
        SELECT p.*, c.name as category_name
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE p.seller_id = $1
      `;
      const params = [userId];

      if (status) {
        query += ` AND p.status = $2`;
        params.push(status);
      }

      query += ` ORDER BY p.created_at DESC`;

      const result = await pool.query(query, params);

      res.json({
        success: true,
        data: result.rows
      });
    } catch (error) {
      console.error("Error fetching products:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error"
      });
    }
  },

  // GET /api/products (public - approved/live products)
  async getAllProducts(req, res) {
    try {
      console.log('📦 GET /api/products - Request received');
      console.log('   Query params:', req.query);
      
      // Check database connection
      try {
        const connectionTest = await pool.query('SELECT NOW() as current_time');
        console.log('✅ Database connection: SUCCESS');
        console.log('   Current DB time:', connectionTest.rows[0].current_time);
      } catch (dbError) {
        console.error('❌ Database connection: FAILED');
        console.error('   Error:', dbError.message);
        console.error('   Stack:', dbError.stack);
        throw dbError;
      }

      const { category, search, page = 1, limit = 20 } = req.query;

      let query = `
        SELECT 
          p.*,
          u.name as seller_name,
          c.name as category_name,
          buyer.name as highest_bidder_name,
          EXTRACT(EPOCH FROM (p.auction_end_time - NOW())) / 3600 as hours_left
        FROM products p
        LEFT JOIN users u ON p.seller_id = u.id
        LEFT JOIN categories c ON p.category_id = c.id
        LEFT JOIN users buyer ON p.highest_bidder_id = buyer.id
        WHERE p.status = 'approved'
      `;
      const params = [];
      let paramCount = 1;

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

      console.log('🔍 Executing query:', query);
      console.log('   Query params:', params);

      const result = await pool.query(query, params);
      console.log(`✅ Query executed: Found ${result.rows.length} products`);
      
      // If no products found, log suggestion to seed data
      if (result.rows.length === 0) {
        console.log('⚠️  No approved products found in database');
        console.log('   Suggestion: Run "npm run seed-products" to insert sample products');
      }

      // Get total count
      const countQuery = `
        SELECT COUNT(*) FROM products 
        WHERE status = 'approved'
        ${category ? `AND category_id = ${category}` : ''}
        ${search ? `AND (title ILIKE '%${search}%' OR description ILIKE '%${search}%')` : ''}
      `;
      const countResult = await pool.query(countQuery);
      const totalCount = parseInt(countResult.rows[0].count);
      console.log(`📊 Total approved products: ${totalCount}`);

      const response = {
        success: true,
        data: result.rows,
        pagination: {
          total: totalCount,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(totalCount / limit)
        }
      };

      console.log('✅ Response sent:', {
        success: response.success,
        productsCount: response.data.length,
        pagination: response.pagination
      });
      
      // Log sample product with current_bid verification
      if (result.rows.length > 0) {
        const sampleProduct = result.rows[0];
        console.log('   Sample Product (first in response):');
        console.log(`      ID: ${sampleProduct.id}`);
        console.log(`      Title: ${sampleProduct.title}`);
        console.log(`      Starting Price: $${sampleProduct.starting_price || 'N/A'}`);
        console.log(`      Current Bid: $${sampleProduct.current_bid || sampleProduct.current_price || sampleProduct.starting_bid || '0'} ${sampleProduct.current_bid !== null && sampleProduct.current_bid !== undefined ? '✓' : '⚠️'}`);
        console.log(`      Status: ${sampleProduct.status}`);
        console.log(`      Seller: ${sampleProduct.seller_name || 'N/A'}`);
        console.log(`      Category: ${sampleProduct.category_name || 'N/A'}`);
        
        // Log full JSON structure for verification
        console.log('   Full product JSON (with current_bid):');
        console.log(JSON.stringify(sampleProduct, null, 2));
      } else {
        console.log('   No products in response');
      }

      res.json(response);
    } catch (error) {
      console.error("❌ Error fetching products:", error);
      console.error("   Error message:", error.message);
      console.error("   Error code:", error.code);
      console.error("   Error stack:", error.stack);
      res.status(500).json({
        success: false,
        message: "Internal server error",
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  // GET /api/products/:id
  async getProductById(req, res) {
    try {
      const { id } = req.params;

      const result = await pool.query(
        `SELECT 
          p.*,
          u.name as seller_name,
          u.email as seller_email,
          u.phone as seller_phone,
          c.name as category_name,
          buyer.name as highest_bidder_name,
          buyer.email as highest_bidder_email,
          EXTRACT(EPOCH FROM (p.auction_end_time - NOW())) / 3600 as hours_left,
          CASE 
            WHEN p.auction_end_time > NOW() THEN 'live'
            ELSE 'ended'
          END as auction_status
        FROM products p
        LEFT JOIN users u ON p.seller_id = u.id
        LEFT JOIN categories c ON p.category_id = c.id
        LEFT JOIN users buyer ON p.highest_bidder_id = buyer.id
        WHERE p.id = $1`,
        [id]
      );

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
      console.error("Error fetching product:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error"
      });
    }
  }
};

