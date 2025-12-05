import pool from "../config/db.js";
import { fixImageUrlsInResponse } from "../utils/imageUrlFixer.js";

export const BuyerBiddingHistoryController = {
  // GET /api/buyer/bidding-history
  // Get buyer's complete bidding history with filters
  async getBiddingHistory(req, res) {
    try {
      console.log("=".repeat(60));
      console.log("🔵 API HIT: /buyer/bidding-history");
      console.log("=".repeat(60));
      
      const userId = req.user.id;
      const { status, page = 1, limit = 20 } = req.query;
      
      console.log("📋 Request Details:");
      console.log("   UserID:", userId);
      console.log("   Status filter:", status || "all");
      console.log("   Page:", page);
      console.log("   Limit:", limit);

      let query = `
        SELECT 
          b.id as bid_id,
          b.amount::numeric as amount,
          b.created_at as bid_date,
          p.id as product_id,
          p.title as product_title,
          p.image_url as product_image,
          p.status as product_status,
          p.auction_end_time,
          COALESCE(p.current_bid::numeric, 0) as current_highest_bid,
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

      // Get ALL bids for analytics (without pagination)
      let analyticsQuery = `
        SELECT 
          b.amount::numeric as amount,
          CASE 
            WHEN p.auction_end_time > NOW() THEN 'active'
            WHEN p.auction_end_time <= NOW() AND p.highest_bidder_id = b.user_id THEN 'won'
            WHEN p.auction_end_time <= NOW() AND p.highest_bidder_id != b.user_id THEN 'lost'
            ELSE 'ended'
          END as bid_status
        FROM bids b
        LEFT JOIN products p ON b.product_id = p.id
        WHERE b.user_id = $1
      `;
      const analyticsParams = [userId];
      let analyticsParamCount = 2;

      // Apply same status filter for analytics
      if (status) {
        if (status === 'active') {
          analyticsQuery += ` AND p.auction_end_time > NOW()`;
        } else if (status === 'won') {
          analyticsQuery += ` AND p.auction_end_time <= NOW() AND p.highest_bidder_id = $${analyticsParamCount}`;
          analyticsParams.push(userId);
          analyticsParamCount++;
        } else if (status === 'lost') {
          analyticsQuery += ` AND p.auction_end_time <= NOW() AND p.highest_bidder_id != $${analyticsParamCount} AND p.highest_bidder_id IS NOT NULL`;
          analyticsParams.push(userId);
          analyticsParamCount++;
        } else if (status === 'ended') {
          analyticsQuery += ` AND p.auction_end_time <= NOW()`;
        }
      }

      const analyticsResult = await pool.query(analyticsQuery, analyticsParams);
      const allBidsForAnalytics = analyticsResult.rows;

      // Calculate analytics from ALL bids (not just current page)
      // Ensure all amounts are converted to numbers
      const totalAmountBid = allBidsForAnalytics.reduce((sum, bid) => {
        const amount = typeof bid.amount === 'string' ? parseFloat(bid.amount) : (bid.amount || 0);
        return sum + (isNaN(amount) ? 0 : amount);
      }, 0);
      const activeBids = allBidsForAnalytics.filter(bid => bid.bid_status === 'active').length;
      const wonBids = allBidsForAnalytics.filter(bid => bid.bid_status === 'won').length;
      const lostBids = allBidsForAnalytics.filter(bid => bid.bid_status === 'lost').length;
      const endedBids = allBidsForAnalytics.filter(bid => bid.bid_status === 'ended').length;
      const winRate = totalCount > 0 
        ? parseFloat(((wonBids / totalCount) * 100).toFixed(2))
        : 0.0;

      // Add pagination
      const offset = (parseInt(page) - 1) * parseInt(limit);
      query += ` LIMIT $${paramCount++} OFFSET $${paramCount}`;
      params.push(parseInt(limit), offset);

      const result = await pool.query(query, params);
      
      console.log("📊 Query Results:");
      console.log("   Rows returned:", result.rows.length);
      console.log("   Total count (from count query):", totalCount);

      // Fix image URLs and convert numeric fields to numbers
      const fixedData = fixImageUrlsInResponse(result.rows).map(bid => ({
        ...bid,
        amount: parseFloat(bid.amount) || 0,
        current_highest_bid: bid.current_highest_bid ? parseFloat(bid.current_highest_bid) : null,
        hours_left: bid.hours_left ? parseFloat(bid.hours_left) : null
      }));
      
      console.log("✅ Data processed:");
      console.log("   Fixed data count:", fixedData.length);
      if (fixedData.length > 0) {
        console.log("   Sample bid:", {
          bid_id: fixedData[0].bid_id,
          product_title: fixedData[0].product_title,
          amount: fixedData[0].amount,
          amount_type: typeof fixedData[0].amount,
          bid_status: fixedData[0].bid_status
        });
      }

      // Calculate analytics from ALL bids - ensure all values are numbers (not strings)
      const analytics = {
        total_bids: Number(parseInt(totalCount)) || 0,
        total_amount_bid: Number(parseFloat(totalAmountBid)) || 0.0,
        active_bids: Number(parseInt(activeBids)) || 0,
        won_bids: Number(parseInt(wonBids)) || 0,
        lost_bids: Number(parseInt(lostBids)) || 0,
        ended_bids: Number(parseInt(endedBids)) || 0,
        win_rate: Number(parseFloat(winRate)) || 0.0
      };
      
      // Double-check: Ensure all analytics values are actual numbers, not strings
      Object.keys(analytics).forEach(key => {
        const value = analytics[key];
        if (typeof value === 'string') {
          analytics[key] = key.includes('rate') || key.includes('amount') 
            ? parseFloat(value) || 0.0 
            : parseInt(value) || 0;
        }
      });

      const response = {
        success: true,
        data: fixedData,
        analytics: analytics,
        pagination: {
          total: totalCount,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(totalCount / limit)
        }
      };
      
      console.log("📤 Response Summary:");
      console.log("   Success: true");
      console.log("   Data items:", fixedData.length);
      console.log("   Analytics:", {
        total_bids: analytics.total_bids,
        total_amount: analytics.total_amount_bid,
        active: analytics.active_bids,
        won: analytics.won_bids,
        lost: analytics.lost_bids,
        win_rate: analytics.win_rate
      });
      console.log("   Pagination:", response.pagination);
      console.log("=".repeat(60));
      
      res.json(response);
    } catch (error) {
      console.error("=".repeat(60));
      console.error("❌ ERROR in /buyer/bidding-history:");
      console.error("   UserID:", req.user?.id || "unknown");
      console.error("   Error:", error.message);
      console.error("   Stack:", error.stack);
      console.error("=".repeat(60));
      
      res.status(500).json({
        success: false,
        message: "Internal server error"
      });
    }
  }
};


