import pool from "../config/db.js";
import { fixImageUrlsInResponse } from "../utils/imageUrlFixer.js";

export const MobileOrderController = {
  // POST /api/orders/create
  async createOrder(req, res) {
    try {
      const { productId } = req.body;
      const buyerId = req.user.id;

      if (!productId) {
        return res.status(400).json({
          success: false,
          message: "Product ID is required"
        });
      }

      // Get product details
      const productResult = await pool.query(
        `SELECT 
          p.*,
          seller.id as seller_id,
          seller.name as seller_name
        FROM products p
        LEFT JOIN users seller ON p.seller_id = seller.id
        WHERE p.id = $1`,
        [productId]
      );

      if (productResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Product not found"
        });
      }

      const product = productResult.rows[0];

      // Check if auction has ended
      if (product.auction_end_time && new Date(product.auction_end_time) > new Date()) {
        return res.status(400).json({
          success: false,
          message: "Auction is still live"
        });
      }

      // Check if product is approved
      if (product.status !== 'approved') {
        return res.status(400).json({
          success: false,
          message: "Product is not available for order"
        });
      }

      // Check if user is the highest bidder
      if (product.highest_bidder_id !== buyerId) {
        return res.status(403).json({
          success: false,
          message: "You are not the winning bidder"
        });
      }

      // ============================================================
      // REFERRAL REWARD USAGE RESTRICTION
      // Rewards can ONLY be used for company products (not seller products)
      // ============================================================
      const { useReward } = req.body;
      if (useReward) {
        // Check if product is a seller product (has seller_id)
        if (product.seller_id) {
          return res.status(400).json({
            success: false,
            message: "Referral rewards can only be used for company products, not seller products"
          });
        }

        // Verify user has sufficient reward balance
        const userResult = await pool.query(
          "SELECT reward_balance FROM users WHERE id = $1",
          [buyerId]
        );

        if (userResult.rows.length === 0) {
          return res.status(404).json({
            success: false,
            message: "User not found"
          });
        }

        const rewardBalance = parseFloat(userResult.rows[0].reward_balance) || 0;
        const orderAmount = parseFloat(product.current_bid || product.starting_price);

        if (rewardBalance < orderAmount) {
          return res.status(400).json({
            success: false,
            message: `Insufficient reward balance. You have $${rewardBalance.toFixed(2)}, but order amount is $${orderAmount.toFixed(2)}`
          });
        }

        // Deduct reward balance
        await pool.query(
          `UPDATE users 
           SET reward_balance = reward_balance - $1,
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $2`,
          [orderAmount, buyerId]
        );

        console.log(`💰 [REWARD USAGE] Deducted $${orderAmount} from user ${buyerId} reward balance`);
      }

      // Check if order already exists
      const existingOrder = await pool.query(
        "SELECT id FROM orders WHERE product_id = $1 AND buyer_id = $2",
        [productId, buyerId]
      );

      if (existingOrder.rows.length > 0) {
        return res.status(400).json({
          success: false,
          message: "Order already exists for this product"
        });
      }

      // Generate order number
      const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

      // Create order
      const result = await pool.query(
        `INSERT INTO orders 
         (order_number, product_id, buyer_id, seller_id, amount, payment_status, delivery_status) 
         VALUES ($1, $2, $3, $4, $5, 'pending', 'pending') 
         RETURNING *`,
        [orderNumber, productId, buyerId, product.seller_id, product.current_bid || product.starting_price]
      );

      // Update product status to sold
      await pool.query(
        "UPDATE products SET status = 'sold' WHERE id = $1",
        [productId]
      );

      res.status(201).json({
        success: true,
        message: "Order created successfully",
        data: result.rows[0]
      });
    } catch (error) {
      console.error("Error creating order:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error"
      });
    }
  },

  // GET /api/orders/mine
  async getMyOrders(req, res) {
    try {
      const userId = req.user.id;
      const { status, type } = req.query; // type: 'company_products' or 'seller_products'

      let query = `
        SELECT 
          o.*,
          p.title as product_title,
          p.image_url as product_image,
          p.description as product_description,
          buyer.name as buyer_name,
          buyer.email as buyer_email,
          buyer.phone as buyer_phone,
          seller.name as seller_name,
          seller.email as seller_email,
          seller.phone as seller_phone
        FROM orders o
        LEFT JOIN products p ON o.product_id = p.id
        LEFT JOIN users buyer ON o.buyer_id = buyer.id
        LEFT JOIN users seller ON o.seller_id = seller.id
        WHERE 1=1
      `;
      const params = [];

      // Filter by user role
      if (req.user.role === 'company_products') {
        query += ` AND o.buyer_id = $1`;
        params.push(userId);
      } else if (req.user.role === 'seller_products') {
        query += ` AND o.seller_id = $1`;
        params.push(userId);
      } else {
        // Both buyer and seller orders
        query += ` AND (o.buyer_id = $1 OR o.seller_id = $1)`;
        params.push(userId);
      }

      // Filter by type if specified
      if (type === 'company_products') {
        query += ` AND o.buyer_id = $${params.length + 1}`;
        params.push(userId);
      } else if (type === 'seller_products') {
        query += ` AND o.seller_id = $${params.length + 1}`;
        params.push(userId);
      }

      // Filter by payment or delivery status
      if (status) {
        if (status === 'pending' || status === 'completed' || status === 'failed' || status === 'refunded') {
          query += ` AND o.payment_status = $${params.length + 1}`;
          params.push(status);
        } else if (status === 'shipped' || status === 'in_transit' || status === 'delivered' || status === 'cancelled') {
          query += ` AND o.delivery_status = $${params.length + 1}`;
          params.push(status);
        }
      }

      query += ` ORDER BY o.created_at DESC`;

      const result = await pool.query(query, params);

      // Fix invalid image URLs in response
      const fixedData = fixImageUrlsInResponse(result.rows);

      res.json({
        success: true,
        data: fixedData
      });
    } catch (error) {
      console.error("Error fetching orders:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error"
      });
    }
  }
};

