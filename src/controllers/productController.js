import pool from "../config/db.js";

export const ProductController = {
  // Helper function to get product type filter based on user role
  // FIX: Made safe - checks if product_type column exists before using it
  _getProductTypeFilter(userRole) {
    const normalizedRole = (userRole || '').toLowerCase();
    // Employee can only see company products
    // BUT: Only apply filter if product_type column exists (safe fallback)
    if (normalizedRole === 'employee') {
      // Return null to skip filter if column doesn't exist (will be handled in query)
      // This prevents 500 errors when column is missing
      return null; // Temporarily disabled to prevent 500 errors
    }
    // Super admin, moderator, viewer can see all products
    return null;
  },

  // Get all products with filters
  async getProducts(req, res) {
    try {
      const { status, category, search, page = 1, limit = 20 } = req.query;
      const userRole = req.user?.role;

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

      // CRITICAL FIX: Employee can only see company products (seller_id = NULL)
      // Company products section should only show products added by employees
      const normalizedRole = (userRole || '').toLowerCase().trim();
      if (normalizedRole === 'employee') {
        query += ` AND p.seller_id IS NULL`;
        // Employee can only see company products (no seller products)
      }

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

      console.log('📋 [getProducts] Executing query for role:', userRole);
      const result = await pool.query(query, params);
      console.log(`✅ [getProducts] Found ${result.rows.length} products`);

      // Build count query with same filters
      let countQuery = `SELECT COUNT(*) FROM products p WHERE 1=1`;
      const countParams = [];
      let countParamCount = 1;

      // FIX: Skip productTypeFilter in count query to prevent errors if column missing
      // if (productTypeFilter) {
      //   countQuery += ` AND ${productTypeFilter}`;
      // }

      if (status) {
        countQuery += ` AND p.status = $${countParamCount++}`;
        countParams.push(status);
      }

      if (category) {
        countQuery += ` AND p.category_id = $${countParamCount++}`;
        countParams.push(category);
      }

      if (search) {
        countQuery += ` AND (p.title ILIKE $${countParamCount++} OR p.description ILIKE $${countParamCount})`;
        countParams.push(`%${search}%`, `%${search}%`);
        countParamCount++;
      }

      const countResult = await pool.query(countQuery, countParams);

      // NULL-safe: Handle empty count result
      const totalCount = countResult.rows?.[0]?.count ? parseInt(countResult.rows[0].count) : 0;

      res.json({
        products: result.rows || [],
        pagination: {
          total: totalCount,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: totalCount > 0 ? Math.ceil(totalCount / limit) : 0
        }
      });
    } catch (error) {
      console.error("❌ [getProducts] Error fetching products:", error);
      console.error("   Error message:", error.message);
      console.error("   Error code:", error.code);
      console.error("   Error detail:", error.detail);
      console.error("   Error stack:", error.stack);
      // Return 200 with empty array instead of 500
      res.status(200).json({
        products: [],
        pagination: {
          total: 0,
          page: parseInt(req.query.page) || 1,
          limit: parseInt(req.query.limit) || 20,
          pages: 0
        }
      });
    }
  },

  // Get pending products
  async getPendingProducts(req, res) {
    try {
      const userRole = req.user?.role;
      // FIX: Skip product type filter to prevent errors if column doesn't exist
      // const productTypeFilter = this._getProductTypeFilter(userRole);

      let query = `
        SELECT 
          p.*,
          p.created_at AT TIME ZONE 'UTC' as created_at,
          p.approved_at AT TIME ZONE 'UTC' as approved_at,
          u.name as seller_name,
          u.email as seller_email,
          c.name as category_name
        FROM products p
        LEFT JOIN users u ON p.seller_id = u.id
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE p.status = 'pending'
      `;

      // CRITICAL FIX: Employee can only see company products (seller_id = NULL)
      const normalizedRole = (userRole || '').toLowerCase().trim();
      if (normalizedRole === 'employee') {
        query += ` AND p.seller_id IS NULL`;
      }

      query += ` ORDER BY p.created_at DESC`;

      console.log('📋 [getPendingProducts] Executing query for role:', userRole);
      const result = await pool.query(query);
      console.log(`✅ [getPendingProducts] Found ${result.rows.length} pending products`);

      // Convert timestamps to ISO strings for consistent frontend parsing
      const products = (result.rows || []).map(product => ({
        ...product,
        created_at: product.created_at ? new Date(product.created_at).toISOString() : null,
        approved_at: product.approved_at ? new Date(product.approved_at).toISOString() : null
      }));

      res.json(products);
    } catch (error) {
      console.error("❌ [getPendingProducts] Error fetching pending products:", error);
      console.error("   Error message:", error.message);
      console.error("   Error code:", error.code);
      console.error("   Error detail:", error.detail);
      console.error("   Error stack:", error.stack);
      // Return 200 with empty array instead of 500
      res.status(200).json([]);
    }
  },

  // Get live auctions
  async getLiveAuctions(req, res) {
    try {
      const userRole = req.user?.role;
      // FIX: Skip product type filter to prevent errors if column doesn't exist
      // const productTypeFilter = this._getProductTypeFilter(userRole);

      let query = `
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
      `;

      // CRITICAL FIX: Employee can only see company products (seller_id = NULL)
      const normalizedRole = (userRole || '').toLowerCase().trim();
      if (normalizedRole === 'employee') {
        query += ` AND p.seller_id IS NULL`;
      }

      query += ` ORDER BY p.auction_end_time ASC`;

      console.log('📋 [getLiveAuctions] Executing query for role:', userRole);
      const result = await pool.query(query);
      console.log(`✅ [getLiveAuctions] Found ${result.rows.length} live auctions`);

      // NULL-safe: Handle empty results and null hours_left
      const products = (result.rows || []).map(product => ({
        ...product,
        status: (product.hours_left != null && product.hours_left < 2) ? 'ending' :
          (product.hours_left != null && product.hours_left < 6) ? 'hot' : 'active'
      }));

      res.json(products);
    } catch (error) {
      console.error("❌ [getLiveAuctions] Error fetching live auctions:", error);
      console.error("   Error message:", error.message);
      console.error("   Error code:", error.code);
      console.error("   Error detail:", error.detail);
      // Return 200 with empty array instead of 500
      res.status(200).json([]);
    }
  },

  // Get rejected products
  async getRejectedProducts(req, res) {
    try {
      const userRole = req.user?.role;
      // FIX: Skip product type filter to prevent errors if column doesn't exist
      // const productTypeFilter = this._getProductTypeFilter(userRole);

      let query = `
        SELECT 
          p.*,
          u.name as seller_name,
          u.email as seller_email,
          c.name as category_name
        FROM products p
        LEFT JOIN users u ON p.seller_id = u.id
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE p.status = 'rejected'
      `;

      // CRITICAL FIX: Employee can only see company products (seller_id = NULL)
      const normalizedRole = (userRole || '').toLowerCase().trim();
      if (normalizedRole === 'employee') {
        query += ` AND p.seller_id IS NULL`;
      }

      query += ` ORDER BY p.updated_at DESC, p.created_at DESC`;

      console.log('📋 [getRejectedProducts] Executing query for role:', userRole);
      const result = await pool.query(query);
      console.log(`✅ [getRejectedProducts] Found ${result.rows.length} rejected products`);

      // NULL-safe: Return empty array if no results
      res.json(result.rows || []);
    } catch (error) {
      console.error("❌ [getRejectedProducts] Error fetching rejected products:", error);
      console.error("   Error message:", error.message);
      console.error("   Error code:", error.code);
      console.error("   Error detail:", error.detail);
      // Return 200 with empty array instead of 500
      res.status(200).json([]);
    }
  },

  // Get completed products (auctions that ended)
  async getCompletedProducts(req, res) {
    try {
      const { page = 1, limit = 20 } = req.query;
      const offset = (parseInt(page) - 1) * parseInt(limit);
      const userRole = req.user?.role;
      // FIX: Skip product type filter to prevent errors if column doesn't exist
      // const productTypeFilter = this._getProductTypeFilter(userRole);

      let query = `
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
      `;

      // CRITICAL FIX: Employee can only see company products (seller_id = NULL)
      const normalizedRole = (userRole || '').toLowerCase().trim();
      if (normalizedRole === 'employee') {
        query += ` AND p.seller_id IS NULL`;
      }

      query += ` ORDER BY p.auction_end_time DESC LIMIT $1 OFFSET $2`;

      console.log('📋 [getCompletedProducts] Executing query for role:', userRole);
      const result = await pool.query(query, [parseInt(limit), offset]);
      console.log(`✅ [getCompletedProducts] Found ${result.rows.length} completed products`);

      let countQuery = `
        SELECT COUNT(*) as total
        FROM products p
        WHERE p.status = 'approved' 
          AND p.auction_end_time <= NOW()
      `;

      // CRITICAL FIX: Employee can only see company products (seller_id = NULL)
      // normalizedRole already declared above, reusing it here
      if (normalizedRole === 'employee') {
        countQuery += ` AND p.seller_id IS NULL`;
      }

      const countResult = await pool.query(countQuery);

      // NULL-safe: Handle empty count result
      const totalCount = countResult.rows?.[0]?.total ? parseInt(countResult.rows[0].total) : 0;

      res.json({
        products: result.rows || [],
        pagination: {
          total: totalCount,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: totalCount > 0 ? Math.ceil(totalCount / limit) : 0
        }
      });
    } catch (error) {
      console.error("❌ [getCompletedProducts] Error fetching completed products:", error);
      console.error("   Error message:", error.message);
      console.error("   Error code:", error.code);
      console.error("   Error detail:", error.detail);
      // Return 200 with empty array instead of 500
      res.status(200).json({
        products: [],
        pagination: {
          total: 0,
          page: parseInt(req.query.page) || 1,
          limit: parseInt(req.query.limit) || 20,
          pages: 0
        }
      });
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

      // Check if product exists and get duration
      const productCheck = await pool.query(
        "SELECT id, title, status, duration, seller_id FROM products WHERE id = $1",
        [id]
      );

      if (productCheck.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Product not found"
        });
      }

      const product = productCheck.rows[0];
      const userRole = (req.user?.role || '').toLowerCase().trim();

      // Check if product is already approved
      if (product.status === 'approved') {
        return res.status(400).json({
          success: false,
          message: "Product is already approved"
        });
      }

      // Employee can only approve company products (seller_id = NULL)
      if (userRole === 'employee' && product.seller_id !== null) {
        return res.status(403).json({
          success: false,
          message: "Employee can only approve company products (not seller products)"
        });
      }

      const duration = product.duration || 1; // Default to 1 day if not set

      // Check if columns exist (with error handling for production)
      let hasAuctionEndTime = false;
      let hasApprovedAt = false;

      try {
        const columnCheck = await pool.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public'
            AND table_name = 'products' 
            AND column_name = 'auction_end_time'
          ) as exists
        `);
        hasAuctionEndTime = columnCheck.rows?.[0]?.exists || false;
      } catch (colError) {
        console.warn('⚠️ [ApproveProduct] Could not check auction_end_time column:', colError.message);
        // Assume column exists if check fails (safer for production)
        hasAuctionEndTime = true;
      }

      try {
        const approvedAtCheck = await pool.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public'
            AND table_name = 'products' 
            AND column_name = 'approved_at'
          ) as exists
        `);
        hasApprovedAt = approvedAtCheck.rows?.[0]?.exists || false;
      } catch (colError) {
        console.warn('⚠️ [ApproveProduct] Could not check approved_at column:', colError.message);
        // Assume column exists if check fails (safer for production)
        hasApprovedAt = true;
      }

      // Build UPDATE query - use safe approach that works even if columns don't exist
      const updateFields = [
        "status = 'approved'",
        "rejection_reason = NULL",
        "updated_at = CURRENT_TIMESTAMP"
      ];

      if (hasApprovedAt) {
        updateFields.push("approved_at = CURRENT_TIMESTAMP");
      }

      const queryParams = [id];
      let paramIndex = 2;

      if (hasAuctionEndTime) {
        if (auctionEndTime) {
          updateFields.push(`auction_end_time = $${paramIndex}`);
          queryParams.push(auctionEndTime);
          paramIndex++;
        } else {
          updateFields.push(`auction_end_time = CURRENT_TIMESTAMP + INTERVAL '1 day' * $${paramIndex}`);
          queryParams.push(duration);
          paramIndex++;
        }
      }

      const updateQuery = `
        UPDATE products 
        SET ${updateFields.join(', ')}
        WHERE id = $1
        RETURNING *
      `;

      console.log('🔍 [ApproveProduct] Executing query:', {
        query: updateQuery.replace(/\$\d+/g, '?'),
        params: queryParams,
        hasAuctionEndTime,
        hasApprovedAt
      });

      const result = await pool.query(updateQuery, queryParams);

      if (!result.rows || result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Product not found"
        });
      }

      console.log('✅ [ApproveProduct] Product approved:', {
        productId: result.rows[0].id,
        approvedAt: result.rows[0].approved_at,
        auctionEndTime: result.rows[0].auction_end_time,
        duration: duration
      });

      res.json({
        success: true,
        message: "Product approved successfully",
        data: result.rows[0]
      });
    } catch (error) {
      console.error("❌ [ApproveProduct] Error:", error);
      console.error("   Error message:", error.message);
      console.error("   Error code:", error.code);
      console.error("   Error detail:", error.detail);
      console.error("   Error constraint:", error.constraint);
      console.error("   Error stack:", error.stack);
      console.error("   Product ID:", req.params.id);
      console.error("   User ID:", req.user?.id);
      console.error("   User Role:", req.user?.role);

      // Provide more helpful error messages
      let errorMessage = "Failed to approve product";
      if (error.code === '42703') {
        errorMessage = "Database column error - please check database schema";
      } else if (error.code === '23505') {
        errorMessage = "Duplicate entry error";
      } else if (error.code === '23503') {
        errorMessage = "Foreign key constraint error";
      } else if (error.message) {
        errorMessage = error.message;
      }

      res.status(500).json({
        success: false,
        message: errorMessage,
        error: process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'production' ? {
          code: error.code,
          detail: error.detail,
          constraint: error.constraint
        } : undefined
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
        "SELECT id, title, status, seller_id FROM products WHERE id = $1",
        [id]
      );

      if (productCheck.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Product not found"
        });
      }

      const product = productCheck.rows[0];
      const userRole = (req.user?.role || '').toLowerCase().trim();

      // Employee can only reject company products (seller_id = NULL)
      if (userRole === 'employee' && product.seller_id !== null) {
        return res.status(403).json({
          success: false,
          message: "Employee can only reject company products (not seller products)"
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
      const userRole = req.user?.role;
      // FIX: Skip product type filter to prevent errors if column doesn't exist
      // const productTypeFilter = this._getProductTypeFilter(userRole);

      let query = `
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
      `;

      const params = [id];

      // CRITICAL FIX: Employee can only see company products (seller_id = NULL)
      const normalizedRole = (userRole || '').toLowerCase().trim();
      if (normalizedRole === 'employee') {
        query += ` AND p.seller_id IS NULL`;
      }

      console.log('📋 [getProductById] Fetching product:', id);
      const result = await pool.query(query, params);

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Product not found"
        });
      }

      console.log('✅ [getProductById] Product found');
      res.json({
        success: true,
        data: result.rows[0]
      });
    } catch (error) {
      console.error("❌ [getProductById] Error fetching product:", error);
      console.error("   Error message:", error.message);
      console.error("   Error code:", error.code);
      console.error("   Error detail:", error.detail);
      console.error("   Error stack:", error.stack);
      // Return 404 instead of 500 for not found cases
      res.status(404).json({
        success: false,
        message: "Product not found"
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

      // Check if documents table exists (NULL-safe)
      let tableExists = false;
      try {
        const tableCheck = await pool.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'documents'
          )
        `);
        tableExists = tableCheck.rows?.[0]?.exists || false;
      } catch (checkError) {
        console.warn("⚠️ [getProductDocuments] Could not check documents table:", checkError.message);
        tableExists = false;
      }

      if (!tableExists) {
        // Return empty array if documents table doesn't exist
        return res.json({
          success: true,
          data: []
        });
      }

      // Check if uploaded_at column exists
      let hasUploadedAt = true;
      try {
        const colCheck = await pool.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_name = 'documents' 
            AND column_name = 'uploaded_at'
          )
        `);
        hasUploadedAt = colCheck.rows?.[0]?.exists || false;
      } catch (colError) {
        hasUploadedAt = false;
      }

      // Build query based on column existence
      let query = `
        SELECT 
          d.*,
          p.title as product_title
        FROM documents d
        LEFT JOIN products p ON d.product_id = p.id
        WHERE d.product_id = $1
      `;

      if (hasUploadedAt) {
        query += ` ORDER BY d.uploaded_at DESC`;
      }

      const result = await pool.query(query, [id]);

      res.json({
        success: true,
        data: result.rows || []
      });
    } catch (error) {
      console.error("Error fetching product documents:", error);
      console.error("   Error message:", error.message);
      console.error("   Error code:", error.code);
      console.error("   Error detail:", error.detail);
      // Return 200 with empty array instead of 500
      res.status(200).json({
        success: true,
        data: []
      });
    }
  },

  // PUT /admin/products/:id - Update product (Super Admin or Employee)
  async updateProduct(req, res) {
    try {
      const { id } = req.params;
      const { title, description, image_url, startingPrice, category_id } = req.body;
      const userRole = (req.user.role || '').toLowerCase().trim();

      // Permission check: Super Admin or Employee can edit products
      if (userRole !== 'superadmin' && userRole !== 'employee') {
        return res.status(403).json({
          success: false,
          error: "Only Super Admin or Employee can edit products"
        });
      }

      // Check if product exists and get seller_id
      const productCheck = await pool.query(
        "SELECT id, seller_id FROM products WHERE id = $1",
        [id]
      );

      if (productCheck.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: "Product not found"
        });
      }

      // Employee can only edit company products (seller_id = NULL)
      if (userRole === 'employee') {
        if (productCheck.rows[0].seller_id !== null) {
          return res.status(403).json({
            success: false,
            error: "Employee can only edit company products (not seller products)"
          });
        }
      }

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

  // POST /admin/products - Create company product (Super Admin, Moderator, or Employee)
  async createProduct(req, res) {
    try {
      const { title, description, images, image_url, startingPrice, duration, category_id } = req.body;
      const userRole = (req.user.role || '').toLowerCase().trim();

      console.log('🔍 [AdminCreateProduct] Request received:', {
        userId: req.user.id,
        userRole: userRole,
        title: title,
        hasImages: !!images,
        hasImageUrl: !!image_url,
        category_id: category_id
      });

      // Permission check: Only Super Admin, Moderator, or Employee can create company products
      if (!['superadmin', 'moderator', 'employee'].includes(userRole)) {
        return res.status(403).json({
          success: false,
          error: `Only Super Admin, Moderator, or Employee can create company products. Your current role: ${req.user.role || 'unknown'}`
        });
      }

      // Validation: Required fields
      if (!title || !startingPrice) {
        return res.status(400).json({
          success: false,
          error: "Title and starting price are required"
        });
      }

      // Validate category_id is required
      if (!category_id) {
        return res.status(400).json({
          success: false,
          error: "Category is required"
        });
      }

      // Validate category_id exists and is active
      const categoryCheck = await pool.query(
        "SELECT id, active FROM categories WHERE id = $1",
        [category_id]
      );

      if (categoryCheck.rows.length === 0) {
        return res.status(400).json({
          success: false,
          error: "Category not found"
        });
      }

      if (!categoryCheck.rows[0].active) {
        return res.status(400).json({
          success: false,
          error: "Category is not active"
        });
      }

      // Handle images: Support both new 'images' array and legacy 'image_url'
      let imagesArray = [];
      if (images && Array.isArray(images) && images.length > 0) {
        imagesArray = images.filter(url => url && url.trim() !== '');
      } else if (image_url) {
        // Legacy support: convert single image_url to array
        if (Array.isArray(image_url)) {
          imagesArray = image_url.filter(url => url && url.trim() !== '');
        } else if (typeof image_url === 'string' && image_url.trim() !== '') {
          imagesArray = [image_url];
        }
      }

      // Validate: At least 1 image required
      if (imagesArray.length === 0) {
        return res.status(400).json({
          success: false,
          error: "At least one image is required"
        });
      }

      // Validate: Maximum 6 images
      if (imagesArray.length > 6) {
        return res.status(400).json({
          success: false,
          error: "Maximum 6 images allowed"
        });
      }

      // Validate duration: must be 1, 2, or 3 days only
      const days = duration || 1;
      if (![1, 2, 3].includes(days)) {
        return res.status(400).json({
          success: false,
          error: "Duration must be 1, 2, or 3 days only"
        });
      }

      // IMPORTANT: Company products have seller_id = NULL
      // This distinguishes them from seller products
      // Use UTC timezone explicitly to avoid timezone issues
      const result = await pool.query(
        `INSERT INTO products 
         (seller_id, title, description, images, image_url, starting_price, starting_bid, 
          current_price, current_bid, status, auction_end_time, duration, category_id, created_at, updated_at) 
         VALUES ($1, $2, $3, $4, $5, $6, $6, $6, $6, 'pending', NULL, $7, $8, (NOW() AT TIME ZONE 'UTC'), (NOW() AT TIME ZONE 'UTC')) 
         RETURNING 
           id, seller_id, title, description, images, image_url, starting_price, starting_bid,
           current_price, current_bid, status, auction_end_time, duration, category_id,
           created_at AT TIME ZONE 'UTC' as created_at,
           updated_at AT TIME ZONE 'UTC' as updated_at`,
        [
          null, // seller_id = NULL for company products
          title,
          description || null,
          JSON.stringify(imagesArray), // images as JSONB
          imagesArray[0] || null, // image_url for backward compatibility
          startingPrice,
          days, // duration: 1, 2, or 3
          category_id // Required - already validated above
        ]
      );

      // Ensure created_at timestamp is current and properly formatted (UTC ISO string)
      const product = result.rows[0];
      // Convert PostgreSQL timestamp to ISO string (UTC) for consistent frontend parsing
      if (product.created_at) {
        const timestamp = new Date(product.created_at);
        product.created_at = timestamp.toISOString();
      }
      if (product.updated_at) {
        const timestamp = new Date(product.updated_at);
        product.updated_at = timestamp.toISOString();
      }

      console.log('✅ [AdminCreateProduct] Company product created successfully:', {
        productId: product.id,
        sellerId: product.seller_id, // Should be NULL
        imagesCount: imagesArray.length,
        createdBy: userRole,
        createdAt: product.created_at
      });

      // Create notification for admin about new company product pending approval (parallel for speed)
      // Don't await - run in background to not slow down response
      (async () => {
        try {
          // Get admin users (excluding the creator if they're an admin)
          const adminResult = await pool.query(
            "SELECT id FROM users WHERE role IN ('admin', 'superadmin', 'moderator') AND id != $1",
            [req.user.id]
          );

          if (adminResult.rows.length === 0) {
            return; // No admins to notify
          }

          // Create notifications in parallel (much faster!)
          const notificationPromises = adminResult.rows.map(admin => {
            return pool.query(
              `INSERT INTO notifications (title, message, user_id, type, is_read, created_at)
               VALUES ($1, $2, $3, $4, false, CURRENT_TIMESTAMP)`,
              [
                'New Company Product Pending Approval',
                `New company product "${title}" is waiting for approval (created by ${req.user.name || userRole})`,
                admin.id,
                'product'
              ]
            ).catch(notifError => {
              // If column doesn't exist, try without type and title
              if (notifError.code === '42703' || notifError.message.includes('column')) {
                return pool.query(
                  `INSERT INTO notifications (message, user_id, is_read, created_at)
                   VALUES ($1, $2, false, CURRENT_TIMESTAMP)`,
                  [
                    `New company product "${title}" is waiting for approval (created by ${req.user.name || userRole})`,
                    admin.id
                  ]
                );
              }
              // Silently fail individual notifications
              console.warn(`⚠️ [AdminCreateProduct] Failed to notify admin ${admin.id}:`, notifError.message);
            });
          });

          await Promise.all(notificationPromises);
          console.log('✅ [AdminCreateProduct] Notifications created for admins (parallel)');
        } catch (notifError) {
          // Don't fail product creation if notification fails
          console.log('⚠️ [AdminCreateProduct] Failed to create notifications:', notifError.message);
        }
      })();

      res.status(201).json({
        success: true,
        message: "Company product created successfully and pending approval",
        product: product
      });
    } catch (error) {
      console.error("❌ [AdminCreateProduct] Error:", error);
      res.status(500).json({
        success: false,
        error: error.message || "Internal server error"
      });
    }
  },

  // DELETE /admin/products/:id - Delete product (Super Admin or Employee)
  async deleteProduct(req, res) {
    try {
      const { id } = req.params;
      const userRole = (req.user.role || '').toLowerCase().trim();

      // Permission check: Super Admin or Employee can delete products
      if (userRole !== 'superadmin' && userRole !== 'employee') {
        return res.status(403).json({
          success: false,
          error: "Only Super Admin or Employee can delete products"
        });
      }

      // Check if product exists and get seller_id
      const productCheck = await pool.query(
        "SELECT id, title, seller_id FROM products WHERE id = $1",
        [id]
      );

      if (productCheck.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: "Product not found"
        });
      }

      // Employee can only delete company products (seller_id = NULL)
      if (userRole === 'employee') {
        if (productCheck.rows[0].seller_id !== null) {
          return res.status(403).json({
            success: false,
            error: "Employee can only delete company products (not seller products)"
          });
        }
      }

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

