import pool from "../config/db.js";
import { fixImageUrlsInResponse, fixImageUrlInItem } from "../utils/imageUrlFixer.js";

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

      // Fix invalid image URL in product data
      const fixedProduct = fixImageUrlInItem(product);

      res.json({
        success: true,
        data: {
          product: {
            id: fixedProduct.id,
            title: fixedProduct.title,
            final_bid: fixedProduct.current_bid,
            auction_end_time: fixedProduct.auction_end_time,
            image_url: fixedProduct.image_url
          },
          winner: {
            id: fixedProduct.winner_id,
            name: fixedProduct.winner_name,
            email: fixedProduct.winner_email,
            phone: fixedProduct.winner_phone
          },
          seller: {
            id: fixedProduct.seller_id,
            name: fixedProduct.seller_name,
            email: fixedProduct.seller_email,
            phone: fixedProduct.seller_phone
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
  },

  // ✅ Get Active Auctions (Admin)
  async getActiveAuctions(req, res) {
    try {
      const result = await pool.query(`
        SELECT 
          p.id as product_id,
          p.title,
          p.description,
          p.starting_bid,
          p.current_bid,
          p.image_url,
          p.status,
          p.auction_end_time,
          u.name as seller_name,
          u.email as seller_email,
          buyer.name as highest_bidder_name,
          buyer.email as highest_bidder_email,
          COUNT(b.id) as total_bids,
          EXTRACT(EPOCH FROM (p.auction_end_time - NOW())) / 3600 as hours_left
        FROM products p
        LEFT JOIN users u ON p.seller_id = u.id
        LEFT JOIN users buyer ON p.highest_bidder_id = buyer.id
        LEFT JOIN bids b ON b.product_id = p.id
        WHERE p.status = 'approved' 
          AND p.auction_end_time > NOW()
        GROUP BY p.id, u.name, u.email, buyer.name, buyer.email
        ORDER BY p.auction_end_time ASC
      `);

      // Fix invalid image URLs in response
      const fixedData = fixImageUrlsInResponse(result.rows);

      res.json({
        success: true,
        data: fixedData
      });
    } catch (error) {
      console.error("Error fetching active auctions:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error"
      });
    }
  },

  // ✅ Get Bids for Auction (Admin)
  async getAuctionBids(req, res) {
    try {
      const { id } = req.params; // auction/product id

      const result = await pool.query(`
        SELECT 
          b.id,
          b.amount,
          b.created_at,
          u.id as user_id,
          u.name as bidder_name,
          u.email as bidder_email,
          u.phone as bidder_phone,
          p.title as product_title,
          p.current_bid as highest_bid
        FROM bids b
        LEFT JOIN users u ON b.user_id = u.id
        LEFT JOIN products p ON b.product_id = p.id
        WHERE b.product_id = $1
        ORDER BY b.amount DESC, b.created_at DESC
      `, [id]);

      res.json({
        success: true,
        data: result.rows
      });
    } catch (error) {
      console.error("Error fetching auction bids:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error"
      });
    }
  }
};

