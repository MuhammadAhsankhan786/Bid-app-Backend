import pool from "../config/db.js";

export const AuctionController = {
  // GET /api/auction/winner/:productId
  async getWinner(req, res) {
    try {
      const { productId } = req.params;

      // Get product with winner information
      const productResult = await pool.query(
        `SELECT 
          p.*,
          winner.id as winner_id,
          winner.name as winner_name,
          winner.email as winner_email,
          winner.phone as winner_phone,
          seller.name as seller_name,
          seller.email as seller_email,
          seller.phone as seller_phone
        FROM products p
        LEFT JOIN users winner ON p.highest_bidder_id = winner.id
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

      // Check if there's a winner
      if (!product.highest_bidder_id) {
        return res.json({
          success: true,
          message: "No bids placed on this auction",
          data: {
            product: {
              id: product.id,
              title: product.title,
              status: product.status
            },
            winner: null
          }
        });
      }

      res.json({
        success: true,
        data: {
          product: {
            id: product.id,
            title: product.title,
            final_bid: product.current_bid,
            auction_end_time: product.auction_end_time
          },
          winner: {
            id: product.winner_id,
            name: product.winner_name,
            email: product.winner_email,
            phone: product.winner_phone
          },
          seller: {
            id: product.seller_id,
            name: product.seller_name,
            email: product.seller_email,
            phone: product.seller_phone
          }
        }
      });
    } catch (error) {
      console.error("Error fetching winner:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error"
      });
    }
  }
};

