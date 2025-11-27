import pool from "../config/db.js";

/**
 * Generate a unique 6-character uppercase alphanumeric referral code
 * @returns {Promise<string>} Unique referral code
 */
export async function generateReferralCode() {
  let attempts = 0;
  const maxAttempts = 20;
  
  while (attempts < maxAttempts) {
    // Generate 6-character code using random alphanumeric
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    // Check if code already exists
    const result = await pool.query(
      "SELECT id FROM users WHERE referral_code = $1",
      [code]
    );
    
    if (result.rows.length === 0) {
      return code;
    }
    
    attempts++;
  }
  
  // Fallback: use timestamp-based code if all attempts fail
  const timestamp = Date.now().toString(36).toUpperCase().slice(-6);
  return timestamp.padEnd(6, '0').substring(0, 6);
}

/**
 * Get referral reward amount from app_settings
 * @returns {Promise<number>} Reward amount (default: 1.00)
 */
export async function getReferralRewardAmount() {
  try {
    const result = await pool.query(
      "SELECT setting_value FROM app_settings WHERE setting_key = 'referral_reward_amount'"
    );
    
    if (result.rows.length > 0) {
      return parseFloat(result.rows[0].setting_value) || 1.00;
    }
    
    return 1.00; // Default reward amount
  } catch (error) {
    console.error("Error fetching referral reward amount:", error);
    return 1.00; // Default on error
  }
}

/**
 * Find inviter by referral code
 * @param {string} referralCode - Referral code to search for
 * @returns {Promise<Object|null>} Inviter user object or null
 */
export async function findInviterByCode(referralCode) {
  if (!referralCode || typeof referralCode !== 'string') {
    return null;
  }
  
  const code = referralCode.trim().toUpperCase();
  if (code.length !== 6) {
    return null;
  }
  
  try {
    const result = await pool.query(
      "SELECT id, phone, name, referral_code FROM users WHERE referral_code = $1",
      [code]
    );
    
    return result.rows.length > 0 ? result.rows[0] : null;
  } catch (error) {
    console.error("Error finding inviter by code:", error);
    return null;
  }
}

/**
 * Check fraud protection rules
 * @param {number} inviterId - Inviter user ID
 * @param {string} inviteePhone - Invitee phone number
 * @param {string} inviteeIp - Invitee IP address (optional)
 * @returns {Promise<{allowed: boolean, reason?: string}>}
 */
export async function checkFraudProtection(inviterId, inviteePhone, inviteeIp = null) {
  try {
    // 1. Prevent self-referral
    const inviterResult = await pool.query(
      "SELECT phone FROM users WHERE id = $1",
      [inviterId]
    );
    
    if (inviterResult.rows.length > 0) {
      const inviterPhone = inviterResult.rows[0].phone;
      if (inviterPhone === inviteePhone) {
        return {
          allowed: false,
          reason: "Self-referral is not allowed"
        };
      }
    }
    
    // 2. Check if invitee already exists (prevent duplicate referrals)
    const existingUser = await pool.query(
      "SELECT id, referred_by FROM users WHERE phone = $1",
      [inviteePhone]
    );
    
    if (existingUser.rows.length > 0 && existingUser.rows[0].referred_by) {
      return {
        allowed: false,
        reason: "User already has a referrer"
      };
    }
    
    // 3. Check for rapid multiple signups from same IP (if IP provided)
    if (inviteeIp) {
      const recentSignups = await pool.query(
        `SELECT COUNT(*) as count 
         FROM referral_transactions 
         WHERE invitee_phone = $1 
           AND created_at > NOW() - INTERVAL '1 hour'`,
        [inviteePhone]
      );
      
      if (parseInt(recentSignups.rows[0].count) > 5) {
        return {
          allowed: false,
          reason: "Too many signups from this phone in the last hour"
        };
      }
    }
    
    // 4. Check if inviter has already referred this phone (pending or awarded)
    const existingReferral = await pool.query(
      `SELECT id, status FROM referral_transactions 
       WHERE inviter_user_id = $1 AND invitee_phone = $2 
         AND status IN ('pending', 'awarded')`,
      [inviterId, inviteePhone]
    );
    
    if (existingReferral.rows.length > 0) {
      return {
        allowed: false,
        reason: "Referral already exists for this phone number"
      };
    }
    
    return { allowed: true };
  } catch (error) {
    console.error("Error checking fraud protection:", error);
    return {
      allowed: false,
      reason: "Fraud check failed"
    };
  }
}

/**
 * Create referral transaction
 * @param {number} inviterId - Inviter user ID
 * @param {string} inviteePhone - Invitee phone number
 * @param {number} amount - Reward amount
 * @returns {Promise<Object>} Created transaction
 */
export async function createReferralTransaction(inviterId, inviteePhone, amount) {
  try {
    const result = await pool.query(
      `INSERT INTO referral_transactions 
       (inviter_user_id, invitee_phone, amount, status, created_at, updated_at)
       VALUES ($1, $2, $3, 'pending', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING *`,
      [inviterId, inviteePhone, amount]
    );
    
    return result.rows[0];
  } catch (error) {
    console.error("Error creating referral transaction:", error);
    throw error;
  }
}

/**
 * Award referral reward to inviter
 * @param {number} transactionId - Referral transaction ID
 * @param {number} inviteeUserId - Invitee user ID (after user creation)
 * @returns {Promise<Object>} Updated transaction and inviter balance
 */
export async function awardReferralReward(transactionId, inviteeUserId) {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Get transaction details
    const transactionResult = await client.query(
      "SELECT * FROM referral_transactions WHERE id = $1",
      [transactionId]
    );
    
    if (transactionResult.rows.length === 0) {
      throw new Error("Referral transaction not found");
    }
    
    const transaction = transactionResult.rows[0];
    
    // Check if already awarded
    if (transaction.status === 'awarded') {
      await client.query('ROLLBACK');
      return {
        transaction: transaction,
        alreadyAwarded: true
      };
    }
    
    // Update inviter's reward balance
    const updateBalanceResult = await client.query(
      `UPDATE users 
       SET reward_balance = reward_balance + $1,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING id, reward_balance`,
      [transaction.amount, transaction.inviter_user_id]
    );
    
    if (updateBalanceResult.rows.length === 0) {
      throw new Error("Inviter user not found");
    }
    
    // Update transaction status
    const updateTransactionResult = await client.query(
      `UPDATE referral_transactions 
       SET status = 'awarded',
           invitee_user_id = $1,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING *`,
      [inviteeUserId, transactionId]
    );
    
    await client.query('COMMIT');
    
    return {
      transaction: updateTransactionResult.rows[0],
      inviterBalance: updateBalanceResult.rows[0].reward_balance,
      alreadyAwarded: false
    };
  } catch (error) {
    await client.query('ROLLBACK');
    console.error("Error awarding referral reward:", error);
    throw error;
  } finally {
    client.release();
  }
}



