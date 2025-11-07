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

      const result = await pool.query(query, params);
      const countResult = await pool.query(`
        SELECT COUNT(*) FROM orders 
        WHERE ${paymentStatus ? `payment_status = '${paymentStatus}'` : '1=1'}
          ${deliveryStatus ? `AND delivery_status = '${deliveryStatus}'` : ''}
      `);

      res.json({
        orders: result.rows,
        pagination: {
          total: parseInt(countResult.rows[0].count),
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(countResult.rows[0].count / limit)
        }
      });
    } catch (error) {
      console.error("Error fetching orders:", error);
      res.status(500).json({ error: "Failed to fetch orders" });
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
  }
};

