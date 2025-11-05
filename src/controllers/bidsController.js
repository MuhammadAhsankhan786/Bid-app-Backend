import pool from "../config/db.js";

export const BidsController = {
  // POST /api/bids/place
  async placeBid(req, res) {
    try {
      const { productId, amount } = req.body;
      const buyerId = req.user.id;

      if (!productId || !amount) {
        return res.status(400).json({
          success: false,
          message: "Product ID and bid amount are required"
        });
      }

      // Validate buyer role
      if (req.user.role !== 'buyer') {
        return res.status(403).json({
          success: false,
          message: "Only buyers can place bids"
        });
      }

      // Get product details
      const productResult = await pool.query(
        "SELECT * FROM products WHERE id = $1",
        [productId]
      );

      if (productResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Product not found"
        });
      }

      const product = productResult.rows[0];

      // Check if product is approved
      if (product.status !== 'approved') {
        return res.status(400).json({
          success: false,
          message: "Product is not available for bidding"
        });
      }

      // Check if auction has ended
      if (product.auction_end_time && new Date(product.auction_end_time) < new Date()) {
        return res.status(400).json({
          success: false,
          message: "Auction has ended"
        });
      }

      // Check if seller is trying to bid on their own product
      if (product.seller_id === buyerId) {
        return res.status(400).json({
          success: false,
          message: "You cannot bid on your own product"
        });
      }

      // Get current highest bid
      const currentBid = product.current_bid || product.starting_bid || 0;

      // Validate bid amount
      if (parseFloat(amount) <= parseFloat(currentBid)) {
        return res.status(400).json({
          success: false,
          message: `Bid amount must be higher than current bid ($${currentBid})`
        });
      }

      // Start transaction
      await pool.query('BEGIN');

      try {
        // Insert bid
        const bidResult = await pool.query(
          `INSERT INTO bids (product_id, user_id, amount) 
           VALUES ($1, $2, $3) 
           RETURNING *`,
          [productId, buyerId, amount]
        );

        // Update product with new highest bid
        await pool.query(
          `UPDATE products 
           SET current_bid = $1, 
               current_price = $1,
               highest_bidder_id = $2,
               total_bids = total_bids + 1
           WHERE id = $3`,
          [amount, buyerId, productId]
        );

        // Update user bids count
        await pool.query(
          `UPDATE users 
           SET bids_count = bids_count + 1 
           WHERE id = $1`,
          [buyerId]
        );

        await pool.query('COMMIT');

        res.status(201).json({
          success: true,
          message: "Bid placed successfully",
          data: bidResult.rows[0]
        });
      } catch (error) {
        await pool.query('ROLLBACK');
        throw error;
      }
    } catch (error) {
      console.error("Error placing bid:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error"
      });
    }
  },

  // GET /api/bids/:productId
  async getBidsByProduct(req, res) {
    try {
      const { productId } = req.params;

      const result = await pool.query(
        `SELECT 
          b.*,
          u.name as bidder_name,
          u.email as bidder_email,
          u.phone as bidder_phone
        FROM bids b
        LEFT JOIN users u ON b.user_id = u.id
        WHERE b.product_id = $1
        ORDER BY b.amount DESC, b.created_at DESC`,
        [productId]
      );

      res.json({
        success: true,
        data: result.rows
      });
    } catch (error) {
      console.error("Error fetching bids:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error"
      });
    }
  },

  // GET /api/bids/mine
  async getMyBids(req, res) {
    try {
      const userId = req.user.id;

      const result = await pool.query(
        `SELECT 
          b.*,
          p.title as product_title,
          p.image_url as product_image,
          p.status as product_status,
          p.auction_end_time,
          EXTRACT(EPOCH FROM (p.auction_end_time - NOW())) / 3600 as hours_left,
          CASE 
            WHEN p.auction_end_time > NOW() THEN 'live'
            ELSE 'ended'
          END as auction_status
        FROM bids b
        LEFT JOIN products p ON b.product_id = p.id
        WHERE b.user_id = $1
        ORDER BY b.created_at DESC`,
        [userId]
      );

      res.json({
        success: true,
        data: result.rows
      });
    } catch (error) {
      console.error("Error fetching bids:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error"
      });
    }
  }
};

