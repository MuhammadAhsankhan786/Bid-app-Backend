import pool from "../config/db.js";
import { getReferralRewardAmount } from "../utils/referralUtils.js";

export const AdminReferralController = {
  // GET /api/admin/referrals
  // Get all referral transactions with filters
  async getReferrals(req, res) {
    try {
      const { 
        inviter_id, 
        invitee_phone, 
        status, 
        start_date, 
        end_date,
        page = 1,
        limit = 50
      } = req.query;
      
      let query = `
        SELECT 
          rt.id,
          rt.inviter_user_id,
          rt.invitee_user_id,
          rt.invitee_phone,
          rt.amount,
          rt.status,
          rt.created_at,
          rt.updated_at,
          inviter.name as inviter_name,
          inviter.phone as inviter_phone,
          inviter.referral_code as inviter_code,
          invitee.name as invitee_name,
          invitee.phone as invitee_phone_full
        FROM referral_transactions rt
        LEFT JOIN users inviter ON rt.inviter_user_id = inviter.id
        LEFT JOIN users invitee ON rt.invitee_user_id = invitee.id
        WHERE 1=1
      `;
      
      const params = [];
      let paramCount = 1;
      
      if (inviter_id) {
        query += ` AND rt.inviter_user_id = $${paramCount++}`;
        params.push(parseInt(inviter_id));
      }
      
      if (invitee_phone) {
        query += ` AND rt.invitee_phone LIKE $${paramCount++}`;
        params.push(`%${invitee_phone}%`);
      }
      
      if (status) {
        query += ` AND rt.status = $${paramCount++}`;
        params.push(status);
      }
      
      if (start_date) {
        query += ` AND rt.created_at >= $${paramCount++}`;
        params.push(start_date);
      }
      
      if (end_date) {
        query += ` AND rt.created_at <= $${paramCount++}`;
        params.push(end_date);
      }
      
      query += ` ORDER BY rt.created_at DESC LIMIT $${paramCount++} OFFSET $${paramCount}`;
      params.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit));
      
      const result = await pool.query(query, params);
      
      // Get total count
      let countQuery = "SELECT COUNT(*) as total FROM referral_transactions WHERE 1=1";
      const countParams = [];
      let countParamCount = 1;
      
      if (inviter_id) {
        countQuery += ` AND inviter_user_id = $${countParamCount++}`;
        countParams.push(parseInt(inviter_id));
      }
      if (invitee_phone) {
        countQuery += ` AND invitee_phone LIKE $${countParamCount++}`;
        countParams.push(`%${invitee_phone}%`);
      }
      if (status) {
        countQuery += ` AND status = $${countParamCount++}`;
        countParams.push(status);
      }
      if (start_date) {
        countQuery += ` AND created_at >= $${countParamCount++}`;
        countParams.push(start_date);
      }
      if (end_date) {
        countQuery += ` AND created_at <= $${countParamCount++}`;
        countParams.push(end_date);
      }
      
      const countResult = await pool.query(countQuery, countParams);
      
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
      console.error("Error fetching referrals:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch referrals"
      });
    }
  },

  // PUT /api/admin/referrals/:id/revoke
  // Revoke a referral transaction
  async revokeReferral(req, res) {
    try {
      const { id } = req.params;
      
      // Get transaction details
      const transactionResult = await pool.query(
        "SELECT * FROM referral_transactions WHERE id = $1",
        [id]
      );
      
      if (transactionResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Referral transaction not found"
        });
      }
      
      const transaction = transactionResult.rows[0];
      
      if (transaction.status !== 'awarded') {
        return res.status(400).json({
          success: false,
          message: "Can only revoke awarded transactions"
        });
      }
      
      const client = await pool.connect();
      
      try {
        await client.query('BEGIN');
        
        // Deduct reward from inviter's balance
        await client.query(
          `UPDATE users 
           SET reward_balance = GREATEST(0, reward_balance - $1),
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $2`,
          [transaction.amount, transaction.inviter_user_id]
        );
        
        // Update transaction status
        const updateResult = await client.query(
          `UPDATE referral_transactions 
           SET status = 'revoked',
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $1
           RETURNING *`,
          [id]
        );
        
        await client.query('COMMIT');
        
        res.json({
          success: true,
          message: "Referral transaction revoked successfully",
          data: updateResult.rows[0]
        });
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error("Error revoking referral:", error);
      res.status(500).json({
        success: false,
        message: "Failed to revoke referral"
      });
    }
  },

  // PUT /api/admin/users/:id/adjust-reward
  // Adjust user's reward balance (superadmin, moderator only)
  async adjustRewardBalance(req, res) {
    try {
      const { id } = req.params;
      const { amount, reason } = req.body;
      
      if (amount === undefined || amount === null) {
        return res.status(400).json({
          success: false,
          message: "Amount is required"
        });
      }
      
      const client = await pool.connect();
      
      try {
        await client.query('BEGIN');
        
        // Get current balance
        const userResult = await client.query(
          "SELECT id, reward_balance FROM users WHERE id = $1",
          [id]
        );
        
        if (userResult.rows.length === 0) {
          await client.query('ROLLBACK');
          return res.status(404).json({
            success: false,
            message: "User not found"
          });
        }
        
        const currentBalance = parseFloat(userResult.rows[0].reward_balance) || 0;
        const newBalance = Math.max(0, currentBalance + parseFloat(amount));
        
        // Update balance
        const updateResult = await client.query(
          `UPDATE users 
           SET reward_balance = $1,
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $2
           RETURNING id, reward_balance`,
          [newBalance, id]
        );
        
        await client.query('COMMIT');
        
        res.json({
          success: true,
          message: "Reward balance adjusted successfully",
          data: {
            user_id: id,
            previous_balance: currentBalance,
            adjustment: parseFloat(amount),
            new_balance: newBalance,
            reason: reason || null
          }
        });
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error("Error adjusting reward balance:", error);
      res.status(500).json({
        success: false,
        message: "Failed to adjust reward balance"
      });
    }
  },

  // GET /api/admin/referral/settings
  // Get referral settings
  async getReferralSettings(req, res) {
    try {
      const result = await pool.query(
        "SELECT * FROM app_settings WHERE setting_key LIKE 'referral_%'"
      );
      
      const settings = {};
      result.rows.forEach(row => {
        settings[row.setting_key] = {
          value: row.setting_value,
          description: row.description
        };
      });
      
      res.json({
        success: true,
        data: settings
      });
    } catch (error) {
      console.error("Error fetching referral settings:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch referral settings"
      });
    }
  },

  // PUT /api/admin/referral/settings
  // Update referral settings (superadmin only)
  async updateReferralSettings(req, res) {
    try {
      const { referral_reward_amount } = req.body;
      
      if (referral_reward_amount !== undefined) {
        const amount = parseFloat(referral_reward_amount);
        
        if (isNaN(amount) || amount < 0) {
          return res.status(400).json({
            success: false,
            message: "Invalid reward amount"
          });
        }
        
        await pool.query(
          `INSERT INTO app_settings (setting_key, setting_value, description, updated_at)
           VALUES ('referral_reward_amount', $1, 'Default reward amount for each successful referral', CURRENT_TIMESTAMP)
           ON CONFLICT (setting_key) 
           DO UPDATE SET setting_value = $1, updated_at = CURRENT_TIMESTAMP`,
          [amount.toString()]
        );
      }
      
      // Return updated settings
      const result = await pool.query(
        "SELECT * FROM app_settings WHERE setting_key LIKE 'referral_%'"
      );
      
      const settings = {};
      result.rows.forEach(row => {
        settings[row.setting_key] = {
          value: row.setting_value,
          description: row.description
        };
      });
      
      res.json({
        success: true,
        message: "Referral settings updated successfully",
        data: settings
      });
    } catch (error) {
      console.error("Error updating referral settings:", error);
      res.status(500).json({
        success: false,
        message: "Failed to update referral settings"
      });
    }
  }
};

