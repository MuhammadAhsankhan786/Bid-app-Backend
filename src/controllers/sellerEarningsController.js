import pool from "../config/db.js";
import { fixImageUrlsInResponse } from "../utils/imageUrlFixer.js";

export const SellerEarningsController = {
  // GET /api/seller/earnings
  // Get seller's earnings dashboard
  async getEarnings(req, res) {
    try {
      const userId = req.user.id;
      const userRole = req.user.role?.toLowerCase();

      // Verify user is seller
      if (userRole !== 'seller_products') {
        return res.status(403).json({
          success: false,
          message: "Only sellers can access earnings"
        });
      }

      // Calculate total earnings from sold products
      const earningsResult = await pool.query(
        `SELECT 
          COALESCE(SUM(CASE WHEN status = 'sold' THEN current_bid ELSE 0 END), 0) as total_earnings,
          COALESCE(SUM(CASE WHEN status = 'approved' AND auction_end_time < NOW() AND highest_bidder_id IS NOT NULL THEN current_bid ELSE 0 END), 0) as pending_earnings,
          COUNT(CASE WHEN status = 'sold' THEN 1 END) as sold_count,
          COUNT(CASE WHEN status = 'approved' AND auction_end_time < NOW() AND highest_bidder_id IS NOT NULL THEN 1 END) as pending_count
        FROM products 
        WHERE seller_id = $1`,
        [userId]
      );

      const totalEarnings = parseFloat(earningsResult.rows[0].total_earnings) || 0;
      const pendingEarnings = parseFloat(earningsResult.rows[0].pending_earnings) || 0;
      const soldCount = parseInt(earningsResult.rows[0].sold_count) || 0;
      const pendingCount = parseInt(earningsResult.rows[0].pending_count) || 0;

      // Get earnings breakdown by product
      const breakdownResult = await pool.query(
        `SELECT 
          id,
          title,
          image_url,
          current_bid as amount,
          status,
          auction_end_time as sold_date,
          highest_bidder_id
        FROM products 
        WHERE seller_id = $1 
          AND (status = 'sold' OR (status = 'approved' AND auction_end_time < NOW() AND highest_bidder_id IS NOT NULL))
        ORDER BY auction_end_time DESC
        LIMIT 100`,
        [userId]
      );

      // Fix image URLs
      const fixedBreakdown = fixImageUrlsInResponse(breakdownResult.rows);

      // Calculate earnings by month (last 12 months)
      const monthlyEarningsResult = await pool.query(
        `SELECT 
          DATE_TRUNC('month', auction_end_time) as month,
          SUM(current_bid) as monthly_earnings,
          COUNT(*) as monthly_sales
        FROM products 
        WHERE seller_id = $1 
          AND status = 'sold'
          AND auction_end_time >= NOW() - INTERVAL '12 months'
        GROUP BY DATE_TRUNC('month', auction_end_time)
        ORDER BY month DESC`,
        [userId]
      );

      const monthlyEarnings = monthlyEarningsResult.rows.map(row => ({
        month: row.month,
        earnings: parseFloat(row.monthly_earnings) || 0,
        sales_count: parseInt(row.monthly_sales) || 0
      }));

      // Calculate average earnings per sale
      const averageEarnings = soldCount > 0 ? (totalEarnings / soldCount) : 0;

      res.json({
        success: true,
        data: {
          total_earnings: totalEarnings,
          pending_earnings: pendingEarnings,
          available_balance: totalEarnings, // Can be adjusted if withdrawal feature exists
          withdrawn_earnings: 0, // Placeholder for future withdrawal feature
          statistics: {
            total_sales: soldCount,
            pending_sales: pendingCount,
            average_per_sale: averageEarnings,
            total_products: soldCount + pendingCount
          },
          breakdown: fixedBreakdown,
          monthly_earnings: monthlyEarnings
        }
      });
    } catch (error) {
      console.error("Error fetching seller earnings:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error"
      });
    }
  }
};


