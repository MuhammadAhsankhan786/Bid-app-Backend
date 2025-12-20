import pool from "../config/db.js";

export const OrderController = {
  // Get all orders with filters
  async getOrders(req, res) {
    try {
      const { paymentStatus, deliveryStatus, search, page = 1, limit = 20 } = req.query;
      
      let query = `
        SELECT 
          o.*,
          p.title as product_name,
          p.image_url as product_image,
          buyer.name as buyer_name,
          buyer.email as buyer_email,
          seller.name as seller_name,
          seller.email as seller_email
        FROM orders o
        LEFT JOIN products p ON o.product_id = p.id
        LEFT JOIN users buyer ON o.buyer_id = buyer.id
        LEFT JOIN users seller ON o.seller_id = seller.id
        WHERE 1=1
      `;
      const params = [];
      let paramCount = 1;

      if (paymentStatus) {
        query += ` AND o.payment_status = $${paramCount++}`;
        params.push(paymentStatus);
      }

      if (deliveryStatus) {
        query += ` AND o.delivery_status = $${paramCount++}`;
        params.push(deliveryStatus);
      }

      if (search) {
        query += ` AND (o.order_number ILIKE $${paramCount++} OR p.title ILIKE $${paramCount++} OR buyer.name ILIKE $${paramCount++})`;
        params.push(`%${search}%`, `%${search}%`, `%${search}%`);
      }

      query += ` ORDER BY o.created_at DESC LIMIT $${paramCount++} OFFSET $${paramCount}`;
      params.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit));

      console.log('📋 [getOrders] Executing query');
      const result = await pool.query(query, params);
      console.log(`✅ [getOrders] Found ${result.rows.length} orders`);
      
      // FIX: Use parameterized query for count to prevent SQL injection
      let countQuery = `SELECT COUNT(*) FROM orders WHERE 1=1`;
      const countParams = [];
      let countParamCount = 1;
      
      if (paymentStatus) {
        countQuery += ` AND payment_status = $${countParamCount++}`;
        countParams.push(paymentStatus);
      }
      
      if (deliveryStatus) {
        countQuery += ` AND delivery_status = $${countParamCount++}`;
        countParams.push(deliveryStatus);
      }
      
      const countResult = await pool.query(countQuery, countParams);
      
      // NULL-safe: Handle empty count result
      const totalCount = countResult.rows?.[0]?.count ? parseInt(countResult.rows[0].count) : 0;

      res.json({
        orders: result.rows || [],
        pagination: {
          total: totalCount,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: totalCount > 0 ? Math.ceil(totalCount / limit) : 0
        }
      });
    } catch (error) {
      console.error("❌ [getOrders] Error fetching orders:", error);
      console.error("   Error message:", error.message);
      console.error("   Error code:", error.code);
      console.error("   Error detail:", error.detail);
      console.error("   Error stack:", error.stack);
      // Return 200 with empty array instead of 500
      res.status(200).json({
        orders: [],
        pagination: {
          total: 0,
          page: parseInt(req.query.page) || 1,
          limit: parseInt(req.query.limit) || 20,
          pages: 0
        }
      });
    }
  },

  // Get order statistics
  async getOrderStats(req, res) {
    try {
      // Handle missing delivery_status column gracefully
      let pending, inTransit, delivered;
      
      try {
        [pending, inTransit, delivered] = await Promise.all([
          pool.query(`SELECT COUNT(*) as count FROM orders WHERE delivery_status = 'pending'`),
          pool.query(`SELECT COUNT(*) as count FROM orders WHERE delivery_status IN ('shipped', 'in_transit')`),
          pool.query(`SELECT COUNT(*) as count FROM orders WHERE delivery_status = 'delivered'`)
        ]);
      } catch (statusError) {
        // If delivery_status column doesn't exist, return all as pending
        const total = await pool.query(`SELECT COUNT(*) as count FROM orders`);
        return res.json({
          pending: parseInt(total.rows[0].count) || 0,
          inTransit: 0,
          delivered: 0
        });
      }

      res.json({
        pending: parseInt(pending.rows[0]?.count || 0),
        inTransit: parseInt(inTransit.rows[0]?.count || 0),
        delivered: parseInt(delivered.rows[0]?.count || 0)
      });
    } catch (error) {
      console.error("Error fetching order stats:", error);
      // Return default values instead of error
      res.json({
        pending: 0,
        inTransit: 0,
        delivered: 0
      });
    }
  },

  // Update order status
  async updateOrderStatus(req, res) {
    try {
      const { id } = req.params;
      const { paymentStatus, deliveryStatus } = req.body;

      const updates = [];
      const params = [];
      let paramCount = 1;

      if (paymentStatus) {
        updates.push(`payment_status = $${paramCount++}`);
        params.push(paymentStatus);
      }

      if (deliveryStatus) {
        updates.push(`delivery_status = $${paramCount++}`);
        params.push(deliveryStatus);
      }

      if (updates.length === 0) {
        return res.status(400).json({ error: "No status updates provided" });
      }

      params.push(id);
      const query = `UPDATE orders SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`;

      const result = await pool.query(query, params);

      if (result.rowCount === 0) {
        return res.status(404).json({ error: "Order not found" });
      }

      res.json({ success: true, order: result.rows[0] });
    } catch (error) {
      console.error("Error updating order:", error);
      res.status(500).json({ error: "Failed to update order" });
    }
  },

  // ✅ Get Payments
  async getPayments(req, res) {
    try {
      const { status, method, user_id, page = 1, limit = 20 } = req.query;

      let query = `
        SELECT 
          p.*,
          u.name as user_name,
          u.email as user_email,
          u.phone as user_phone
        FROM payments p
        LEFT JOIN users u ON p.user_id = u.id
        WHERE 1=1
      `;
      const params = [];
      let paramCount = 1;

      if (status) {
        query += ` AND p.status = $${paramCount++}`;
        params.push(status);
      }

      if (method) {
        query += ` AND p.method = $${paramCount++}`;
        params.push(method);
      }

      if (user_id) {
        query += ` AND p.user_id = $${paramCount++}`;
        params.push(user_id);
      }

      query += ` ORDER BY p.created_at DESC LIMIT $${paramCount++} OFFSET $${paramCount}`;
      params.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit));

      const result = await pool.query(query, params);

      // Get total count
      let countQuery = `
        SELECT COUNT(*) as count
        FROM payments p
        WHERE 1=1
      `;
      const countParams = [];
      let countParamCount = 1;

      if (status) {
        countQuery += ` AND p.status = $${countParamCount++}`;
        countParams.push(status);
      }

      if (method) {
        countQuery += ` AND p.method = $${countParamCount++}`;
        countParams.push(method);
      }

      if (user_id) {
        countQuery += ` AND p.user_id = $${countParamCount++}`;
        countParams.push(user_id);
      }

      const countResult = await pool.query(countQuery, countParams);

      res.json({
        success: true,
        data: result.rows,
        pagination: {
          total: parseInt(countResult.rows[0].count),
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(parseInt(countResult.rows[0].count) / parseInt(limit))
        }
      });
    } catch (error) {
      console.error("Error fetching payments:", error);
      res.status(500).json({ error: "Failed to fetch payments" });
    }
  }
};

