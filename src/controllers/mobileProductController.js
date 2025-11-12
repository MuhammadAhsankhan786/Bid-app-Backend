import pool from "../config/db.js";
import { fixImageUrlsInResponse, fixImageUrlInItem } from "../utils/imageUrlFixer.js";

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
      console.log('📦 GET /api/products/mine - Request received');
      console.log('   Headers:', JSON.stringify(req.headers, null, 2));
      
      // Check if user is authenticated
      if (!req.user || !req.user.id) {
        console.error('❌ Authentication error: req.user is missing');
        console.error('   req.user:', req.user);
        return res.status(401).json({
          success: false,
          message: "Unauthorized - User not authenticated"
        });
      }

      const userId = req.user.id;
      const { status } = req.query;

      console.log('   User ID:', userId);
      console.log('   Status filter:', status || 'none');
      console.log('   User role:', req.user.role);
      console.log('   User status:', req.user.status);

      // Test database connection first
      try {
        const connectionTest = await pool.query('SELECT NOW() as current_time');
        console.log('✅ Database connection: SUCCESS');
      } catch (dbError) {
        console.error('❌ Database connection: FAILED');
        console.error('   Error:', dbError.message);
        console.error('   Code:', dbError.code);
        throw dbError;
      }

      // Build query - handle case where categories table might not exist
      let query = `
        SELECT 
          p.id, p.seller_id, p.title, p.description, p.image_url, p.status,
          p.created_at, p.category_id, p.highest_bidder_id, p.auction_end_time,
          COALESCE(p.starting_price, 0) as starting_price,
          COALESCE(p.starting_bid, 0) as starting_bid,
          COALESCE(p.current_price, 0) as current_price,
          COALESCE(p.current_bid, 0) as current_bid,
          COALESCE(p.total_bids, 0) as total_bids,
          COALESCE(c.name, 'Uncategorized') as category_name
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

      console.log('🔍 Executing query:', query);
      console.log('   Query params:', params);

      const result = await pool.query(query, params);
      console.log(`✅ Query executed: Found ${result.rows.length} products for seller ${userId}`);

      // Fix invalid image URLs in response - wrap in try-catch for safety
      let fixedData;
      try {
        fixedData = fixImageUrlsInResponse(result.rows);
        console.log('✅ Image URLs fixed successfully');
      } catch (fixError) {
        console.error('⚠️ Error fixing image URLs, using raw data:', fixError.message);
        console.error('   Fix error stack:', fixError.stack);
        fixedData = result.rows; // Use raw data if fix fails
      }

      console.log('📤 Sending response with', fixedData?.length || 0, 'products');
      res.json({
        success: true,
        data: fixedData || []
      });
    } catch (error) {
      console.error("❌ Error fetching my products:", error);
      console.error("   Error message:", error.message);
      console.error("   Error code:", error.code);
      console.error("   Error stack:", error.stack);
      
      // Return more specific error messages
      let errorMessage = "Internal server error";
      if (error.code === '42703') {
        errorMessage = "Database column error - please check schema";
      } else if (error.code === '42P01') {
        errorMessage = "Database table not found - please run migrations";
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      res.status(500).json({
        success: false,
        message: errorMessage,
        error: process.env.NODE_ENV === 'development' ? {
          message: error.message,
          code: error.code,
          stack: error.stack
        } : undefined
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
          p.id, p.seller_id, p.title, p.description, p.image_url, p.status,
          p.created_at, p.category_id, p.highest_bidder_id, p.auction_end_time,
          p.starting_price, p.starting_bid,
          COALESCE(NULLIF(p.current_bid, 0), NULLIF(p.current_price, 0), p.starting_bid, p.starting_price, 0) as current_bid,
          COALESCE(NULLIF(p.current_price, 0), NULLIF(p.current_bid, 0), p.starting_price, p.starting_bid, 0) as current_price,
          COALESCE(p.total_bids, (SELECT COUNT(*) FROM bids WHERE product_id = p.id), 0) as total_bids,
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

      if (category && category !== 'All' && category !== 'all') {
        // Handle category filter - can be ID (number) or name/slug (string)
        const categoryNum = parseInt(category);
        if (!isNaN(categoryNum) && categoryNum.toString() === category.toString()) {
          // Category is a number (ID)
          query += ` AND p.category_id = $${paramCount++}`;
          params.push(categoryNum);
        } else {
          // Category is a string (name) - match by name
          query += ` AND LOWER(c.name) = LOWER($${paramCount})`;
          params.push(category);
          paramCount++;
        }
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

      // Get total count (using same filters as main query)
      let countQuery = `
        SELECT COUNT(*) as count
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE p.status = 'approved'
      `;
      const countParams = [];
      let countParamCount = 1;

      if (category && category !== 'All' && category !== 'all') {
        // Handle category filter - same logic as main query
        const categoryNum = parseInt(category);
        if (!isNaN(categoryNum) && categoryNum.toString() === category.toString()) {
          // Category is a number (ID)
          countQuery += ` AND p.category_id = $${countParamCount++}`;
          countParams.push(categoryNum);
        } else {
          // Category is a string (name) - match by name
          countQuery += ` AND LOWER(c.name) = LOWER($${countParamCount})`;
          countParams.push(category);
          countParamCount++;
        }
      }

      if (search) {
        countQuery += ` AND (p.title ILIKE $${countParamCount++} OR p.description ILIKE $${countParamCount})`;
        countParams.push(`%${search}%`, `%${search}%`);
        countParamCount++;
      }

      console.log('🔍 Executing count query:', countQuery);
      console.log('   Count params:', countParams);

      const countResult = await pool.query(countQuery, countParams);
      const totalCount = parseInt(countResult.rows[0].count);
      console.log(`📊 Total approved products: ${totalCount}`);

      // Fix invalid image URLs in response
      const fixedData = fixImageUrlsInResponse(result.rows);
      
      const response = {
        success: true,
        data: fixedData,
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
      
      // Return more specific error messages
      let errorMessage = "Internal server error";
      if (error.code === '42703') {
        errorMessage = "Database column error - please check schema";
      } else if (error.code === '42P01') {
        errorMessage = "Database table not found";
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      res.status(500).json({
        success: false,
        message: errorMessage,
        error: process.env.NODE_ENV === 'development' ? {
          message: error.message,
          code: error.code,
          stack: error.stack
        } : undefined
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

      // Fix invalid image URL in response
      const fixedProduct = fixImageUrlInItem(result.rows[0]);

      res.json({
        success: true,
        data: fixedProduct
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

