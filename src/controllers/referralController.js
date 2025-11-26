import pool from "../config/db.js";
import {
  generateReferralCode,
  getReferralRewardAmount,
  findInviterByCode
} from "../utils/referralUtils.js";

export const ReferralController = {
  // GET /api/referral/my-code
  // Get current user's referral code
  async getMyReferralCode(req, res) {
    try {
      const userId = req.user.id;
      
      const result = await pool.query(
        "SELECT referral_code, reward_balance FROM users WHERE id = $1",
        [userId]
      );
      
      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "User not found"
        });
      }
      
      let referralCode = result.rows[0].referral_code;
      
      // Generate referral code if missing
      if (!referralCode) {
        referralCode = await generateReferralCode();
        await pool.query(
          "UPDATE users SET referral_code = $1 WHERE id = $2",
          [referralCode, userId]
        );
      }
      
      res.json({
        success: true,
        data: {
          referral_code: referralCode,
          reward_balance: parseFloat(result.rows[0].reward_balance) || 0
        }
      });
    } catch (error) {
      console.error("Error fetching referral code:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch referral code"
      });
    }
  },

  // GET /api/referral/history
  // Get user's referral history
  async getReferralHistory(req, res) {
    try {
      const userId = req.user.id;
      const { page = 1, limit = 20 } = req.query;
      
      const offset = (parseInt(page) - 1) * parseInt(limit);
      
      // Get referral transactions where user is the inviter
      const result = await pool.query(
        `SELECT 
          rt.id,
          rt.invitee_phone,
          rt.amount,
          rt.status,
          rt.created_at,
          u.name as invitee_name,
          u.phone as invitee_phone_full
         FROM referral_transactions rt
         LEFT JOIN users u ON rt.invitee_user_id = u.id
         WHERE rt.inviter_user_id = $1
         ORDER BY rt.created_at DESC
         LIMIT $2 OFFSET $3`,
        [userId, parseInt(limit), offset]
      );
      
      // Get total count
      const countResult = await pool.query(
        "SELECT COUNT(*) as total FROM referral_transactions WHERE inviter_user_id = $1",
        [userId]
      );
      
      res.json({
        success: true,
        data: result.rows,
        pagination: {
          total: parseInt(countResult.rows[0].total),
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(countResult.rows[0].total / limit)
        }
      });
    } catch (error) {
      console.error("Error fetching referral history:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch referral history"
      });
    }
  }
};

