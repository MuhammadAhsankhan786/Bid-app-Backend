import pool from "../config/db.js";

export const WalletController = {
  // GET /api/wallet
  // Get unified wallet info (referral rewards + seller earnings)
  async getWallet(req, res) {
    try {
      const userId = req.user.id;
      const userRole = req.user.role?.toLowerCase();

      // Get referral reward balance
      let referralBalance = 0;
      try {
        const referralResult = await pool.query(
          "SELECT reward_balance FROM users WHERE id = $1",
          [userId]
        );
        if (referralResult.rows.length > 0) {
          referralBalance = parseFloat(referralResult.rows[0].reward_balance) || 0;
        }
      } catch (error) {
        console.error("Error fetching referral balance:", error);
        // Continue with 0 if column doesn't exist
      }

      // Get seller earnings (from sold products)
      let sellerEarnings = 0;
      let sellerPendingEarnings = 0;
      let earningsHistory = [];

      if (userRole === 'seller_products') {
        try {
          // Calculate total earnings from sold products
          const earningsResult = await pool.query(
            `SELECT 
              COALESCE(SUM(CASE WHEN status = 'sold' THEN current_bid ELSE 0 END), 0) as total_earnings,
              COALESCE(SUM(CASE WHEN status = 'approved' AND auction_end_time < NOW() AND highest_bidder_id IS NOT NULL THEN current_bid ELSE 0 END), 0) as pending_earnings
            FROM products 
            WHERE seller_id = $1`,
            [userId]
          );

          if (earningsResult.rows.length > 0) {
            sellerEarnings = parseFloat(earningsResult.rows[0].total_earnings) || 0;
            sellerPendingEarnings = parseFloat(earningsResult.rows[0].pending_earnings) || 0;
          }

          // Get earnings history from sold products
          try {
            const historyResult = await pool.query(
              `SELECT 
                id,
                title,
                current_bid as amount,
                status,
                auction_end_time as transaction_date,
                'sale' as transaction_type
              FROM products 
              WHERE seller_id = $1 AND status = 'sold'
              ORDER BY auction_end_time DESC
              LIMIT 50`,
              [userId]
            );
            earningsHistory = historyResult.rows.map(row => ({
              id: row.id,
              title: row.title,
              amount: parseFloat(row.amount) || 0,
              status: row.status,
              transaction_date: row.transaction_date,
              transaction_type: row.transaction_type
            }));
          } catch (error) {
            console.error("Error fetching earnings history:", error);
            // Continue with empty array
          }
        } catch (error) {
          console.error("Error calculating seller earnings:", error);
          // Continue with 0 earnings
        }
      }

      // Get referral transaction history
      let referralHistory = [];
      try {
        const referralHistoryResult = await pool.query(
          `SELECT 
            id,
            amount,
            status,
            created_at as transaction_date,
            'referral' as transaction_type,
            invitee_phone as description
          FROM referral_transactions 
          WHERE inviter_user_id = $1
          ORDER BY created_at DESC
          LIMIT 50`,
          [userId]
        );
        referralHistory = referralHistoryResult.rows.map(row => ({
          id: row.id,
          amount: parseFloat(row.amount) || 0,
          status: row.status,
          transaction_date: row.transaction_date,
          transaction_type: row.transaction_type,
          description: row.description
        }));
      } catch (error) {
        console.error("Error fetching referral history:", error);
        // Continue with empty array if table doesn't exist
      }

      // Combine transaction histories and sort by date
      const allTransactions = [...earningsHistory, ...referralHistory].sort(
        (a, b) => new Date(b.transaction_date) - new Date(a.transaction_date)
      );

      const totalBalance = referralBalance + sellerEarnings;
      const availableBalance = totalBalance; // Can be adjusted if withdrawal feature exists

      res.json({
        success: true,
        data: {
          total_balance: totalBalance,
          available_balance: availableBalance,
          breakdown: {
            referral_rewards: referralBalance,
            seller_earnings: sellerEarnings,
            pending_earnings: sellerPendingEarnings
          },
          transactions: allTransactions.slice(0, 50), // Limit to 50 most recent
          transaction_count: allTransactions.length
        }
      });
    } catch (error) {
      console.error("Error fetching wallet:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error"
      });
    }
  }
};


