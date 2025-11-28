import pool from "../config/db.js";
import { fixImageUrlsInResponse } from "../utils/imageUrlFixer.js";

export const AdminSellerEarningsController = {
  // GET /admin/seller/:id/earnings
  // Get seller's earnings dashboard (admin view)
  async getSellerEarnings(req, res) {
    try {
      const { id } = req.params;

      // Verify seller exists
      const sellerResult = await pool.query(
        "SELECT id, name, email, phone, role FROM users WHERE id = $1",
        [id]
      );

      if (sellerResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Seller not found"
        });
      }

      const seller = sellerResult.rows[0];

      // Calculate total earnings from sold products
      const earningsResult = await pool.query(
        `SELECT 
          COALESCE(SUM(CASE WHEN status = 'sold' THEN current_bid ELSE 0 END), 0) as total_earnings,
          COALESCE(SUM(CASE WHEN status = 'approved' AND auction_end_time < NOW() AND highest_bidder_id IS NOT NULL THEN current_bid ELSE 0 END), 0) as pending_earnings,
          COUNT(CASE WHEN status = 'sold' THEN 1 END) as sold_count,
          COUNT(CASE WHEN status = 'approved' AND auction_end_time < NOW() AND highest_bidder_id IS NOT NULL THEN 1 END) as pending_count
        FROM products 
        WHERE seller_id = $1`,
        [id]
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
        [id]
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
        [id]
      );

      const monthlyEarnings = monthlyEarningsResult.rows.map(row => ({
        month: row.month,
        earnings: parseFloat(row.monthly_earnings) || 0,
        sales_count: parseInt(row.monthly_sales) || 0
      }));

      // Calculate average earnings per sale
      const averageEarnings = soldCount > 0 ? (totalEarnings / soldCount) : 0;

      // Get seller's referral balance (if exists)
      let referralBalance = 0;
      try {
        const referralResult = await pool.query(
          "SELECT COALESCE(reward_balance, 0) as reward_balance FROM users WHERE id = $1",
          [id]
        );
        if (referralResult.rows.length > 0) {
          referralBalance = parseFloat(referralResult.rows[0].reward_balance) || 0;
        }
      } catch (error) {
        console.error("Error fetching referral balance:", error);
        // Continue with 0 if column doesn't exist
      }

      res.json({
        success: true,
        data: {
          seller: {
            id: seller.id,
            name: seller.name,
            email: seller.email,
            phone: seller.phone,
            role: seller.role
          },
          total_earnings: totalEarnings,
          pending_earnings: pendingEarnings,
          referral_balance: referralBalance,
          available_balance: totalEarnings + referralBalance,
          withdrawn_earnings: 0, // Placeholder for future withdrawal feature
          statistics: {
            total_sales: soldCount,
            pending_sales: pendingCount,
            average_per_sale: averageEarnings,
            total_products: soldCount + pendingCount
          },
          breakdown: fixedBreakdown.map(row => ({
            ...row,
            amount: parseFloat(row.amount) || 0
          })),
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

