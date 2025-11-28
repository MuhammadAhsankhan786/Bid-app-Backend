import pool from "../config/db.js";
import { fixImageUrlsInResponse } from "../utils/imageUrlFixer.js";

export const BuyerBiddingHistoryController = {
  // GET /api/buyer/bidding-history
  // Get buyer's complete bidding history with filters
  async getBiddingHistory(req, res) {
    try {
      const userId = req.user.id;
      const { status, page = 1, limit = 20 } = req.query;

      let query = `
        SELECT 
          b.id as bid_id,
          b.amount,
          b.created_at as bid_date,
          p.id as product_id,
          p.title as product_title,
          p.image_url as product_image,
          p.status as product_status,
          p.auction_end_time,
          p.current_bid as current_highest_bid,
          p.highest_bidder_id,
          CASE 
            WHEN p.auction_end_time > NOW() THEN 'active'
            WHEN p.auction_end_time <= NOW() AND p.highest_bidder_id = b.user_id THEN 'won'
            WHEN p.auction_end_time <= NOW() AND p.highest_bidder_id != b.user_id THEN 'lost'
            ELSE 'ended'
          END as bid_status,
          EXTRACT(EPOCH FROM (p.auction_end_time - NOW())) / 3600 as hours_left
        FROM bids b
        LEFT JOIN products p ON b.product_id = p.id
        WHERE b.user_id = $1
      `;
      const params = [userId];
      let paramCount = 2;

      // Filter by status if provided
      if (status) {
        if (status === 'active') {
          query += ` AND p.auction_end_time > NOW()`;
        } else if (status === 'won') {
          query += ` AND p.auction_end_time <= NOW() AND p.highest_bidder_id = $${paramCount}`;
          params.push(userId);
          paramCount++;
        } else if (status === 'lost') {
          query += ` AND p.auction_end_time <= NOW() AND p.highest_bidder_id != $${paramCount} AND p.highest_bidder_id IS NOT NULL`;
          params.push(userId);
          paramCount++;
        } else if (status === 'ended') {
          query += ` AND p.auction_end_time <= NOW()`;
        }
      }

      query += ` ORDER BY b.created_at DESC`;

      // Get total count for pagination
      let countQuery = `
        SELECT COUNT(*) as total
        FROM bids b
        LEFT JOIN products p ON b.product_id = p.id
        WHERE b.user_id = $1
      `;
      const countParams = [userId];
      let countParamCount = 2;

      if (status) {
        if (status === 'active') {
          countQuery += ` AND p.auction_end_time > NOW()`;
        } else if (status === 'won') {
          countQuery += ` AND p.auction_end_time <= NOW() AND p.highest_bidder_id = $${countParamCount}`;
          countParams.push(userId);
          countParamCount++;
        } else if (status === 'lost') {
          countQuery += ` AND p.auction_end_time <= NOW() AND p.highest_bidder_id != $${countParamCount} AND p.highest_bidder_id IS NOT NULL`;
          countParams.push(userId);
          countParamCount++;
        } else if (status === 'ended') {
          countQuery += ` AND p.auction_end_time <= NOW()`;
        }
      }

      const countResult = await pool.query(countQuery, countParams);
      const totalCount = parseInt(countResult.rows[0].total);

      // Add pagination
      const offset = (parseInt(page) - 1) * parseInt(limit);
      query += ` LIMIT $${paramCount++} OFFSET $${paramCount}`;
      params.push(parseInt(limit), offset);

      const result = await pool.query(query, params);

      // Fix image URLs
      const fixedData = fixImageUrlsInResponse(result.rows);

      // Calculate analytics
      const analytics = {
        total_bids: totalCount,
        total_amount_bid: fixedData.reduce((sum, bid) => sum + (parseFloat(bid.amount) || 0), 0),
        active_bids: fixedData.filter(bid => bid.bid_status === 'active').length,
        won_bids: fixedData.filter(bid => bid.bid_status === 'won').length,
        lost_bids: fixedData.filter(bid => bid.bid_status === 'lost').length,
        win_rate: totalCount > 0 
          ? ((fixedData.filter(bid => bid.bid_status === 'won').length / totalCount) * 100).toFixed(2)
          : 0
      };

      res.json({
        success: true,
        data: fixedData,
        analytics: analytics,
        pagination: {
          total: totalCount,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(totalCount / limit)
        }
      });
    } catch (error) {
      console.error("Error fetching bidding history:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error"
      });
    }
  }
};

