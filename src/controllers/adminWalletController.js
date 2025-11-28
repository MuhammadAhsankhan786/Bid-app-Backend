import pool from "../config/db.js";

export const AdminWalletController = {
  // GET /admin/wallet/logs
  // Get all wallet transactions across all users (admin view)
  async getWalletLogs(req, res) {
    try {
      const { userId, type, status, page = 1, limit = 50, startDate, endDate } = req.query;
      
      const offset = (parseInt(page) - 1) * parseInt(limit);
      const params = [];
      let paramCount = 1;

      // Build WHERE conditions
      let whereConditions = [];
      
      if (userId) {
        whereConditions.push(`user_id = $${paramCount++}`);
        params.push(userId);
      }

      if (type) {
        whereConditions.push(`transaction_type = $${paramCount++}`);
        params.push(type);
      }

      if (status) {
        whereConditions.push(`status = $${paramCount++}`);
        params.push(status);
      }

      if (startDate) {
        whereConditions.push(`transaction_date >= $${paramCount++}`);
        params.push(startDate);
      }

      if (endDate) {
        whereConditions.push(`transaction_date <= $${paramCount++}`);
        params.push(endDate);
      }

      const whereClause = whereConditions.length > 0 
        ? `WHERE ${whereConditions.join(' AND ')}` 
        : '';

      // Get referral transactions
      let referralQuery = `
        SELECT 
          rt.id,
          rt.inviter_user_id as user_id,
          u.name as user_name,
          u.email as user_email,
          u.phone as user_phone,
          rt.amount,
          rt.status,
          rt.created_at as transaction_date,
          'referral' as transaction_type,
          rt.invitee_phone as description,
          'Referral reward' as transaction_description
        FROM referral_transactions rt
        LEFT JOIN users u ON rt.inviter_user_id = u.id
        ${whereClause.replace(/user_id/g, 'rt.inviter_user_id').replace(/transaction_type/g, "'referral'").replace(/status/g, 'rt.status').replace(/transaction_date/g, 'rt.created_at')}
      `;

      // Get seller earnings (from sold products)
      let earningsQuery = `
        SELECT 
          p.id,
          p.seller_id as user_id,
          u.name as user_name,
          u.email as user_email,
          u.phone as user_phone,
          p.current_bid as amount,
          'completed' as status,
          p.auction_end_time as transaction_date,
          'sale' as transaction_type,
          p.title as description,
          'Product sale' as transaction_description
        FROM products p
        LEFT JOIN users u ON p.seller_id = u.id
        WHERE p.status = 'sold'
      `;

      // Apply filters to earnings query
      if (userId) {
        earningsQuery += ` AND p.seller_id = $${paramCount++}`;
      }
      if (type && type === 'sale') {
        // Already filtered by WHERE clause
      } else if (type && type !== 'sale') {
        // Skip earnings if type is not 'sale'
        earningsQuery += ` AND 1=0`;
      }
      if (startDate) {
        earningsQuery += ` AND p.auction_end_time >= $${paramCount++}`;
      }
      if (endDate) {
        earningsQuery += ` AND p.auction_end_time <= $${paramCount++}`;
      }

      // Combine queries with UNION
      const combinedQuery = `
        ${referralQuery}
        UNION ALL
        ${earningsQuery}
        ORDER BY transaction_date DESC
        LIMIT $${paramCount++} OFFSET $${paramCount}
      `;

      // Get total count
      const countQuery = `
        SELECT COUNT(*) as total FROM (
          ${referralQuery.replace(/LIMIT.*OFFSET.*/, '')}
          UNION ALL
          ${earningsQuery.replace(/LIMIT.*OFFSET.*/, '')}
        ) as combined
      `;

      // Simplified approach: Get transactions separately and combine
      const referralParams = [];
      const earningsParams = [];
      let refParamCount = 1;
      let earnParamCount = 1;

      let refWhere = '';
      let earnWhere = 'WHERE p.status = \'sold\'';

      if (userId) {
        refWhere += ` WHERE rt.inviter_user_id = $${refParamCount++}`;
        referralParams.push(userId);
        earnWhere += ` AND p.seller_id = $${earnParamCount++}`;
        earningsParams.push(userId);
      }

      if (type === 'referral') {
        earnWhere += ` AND 1=0`; // Skip earnings
      } else if (type === 'sale') {
        refWhere += refWhere ? ` AND 1=0` : ` WHERE 1=0`; // Skip referrals
      }

      if (status) {
        if (refWhere) {
          refWhere += ` AND rt.status = $${refParamCount++}`;
        } else {
          refWhere = ` WHERE rt.status = $${refParamCount++}`;
        }
        referralParams.push(status);
        earnWhere += ` AND 'completed' = $${earnParamCount++}`;
        earningsParams.push(status);
      }

      if (startDate) {
        if (refWhere) {
          refWhere += ` AND rt.created_at >= $${refParamCount++}`;
        } else {
          refWhere = ` WHERE rt.created_at >= $${refParamCount++}`;
        }
        referralParams.push(startDate);
        earnWhere += ` AND p.auction_end_time >= $${earnParamCount++}`;
        earningsParams.push(startDate);
      }

      if (endDate) {
        if (refWhere) {
          refWhere += ` AND rt.created_at <= $${refParamCount++}`;
        } else {
          refWhere = ` WHERE rt.created_at <= $${refParamCount++}`;
        }
        referralParams.push(endDate);
        earnWhere += ` AND p.auction_end_time <= $${earnParamCount++}`;
        earningsParams.push(endDate);
      }

      const [referralResult, earningsResult] = await Promise.all([
        pool.query(`
          SELECT 
            rt.id,
            rt.inviter_user_id as user_id,
            u.name as user_name,
            u.email as user_email,
            u.phone as user_phone,
            rt.amount,
            rt.status,
            rt.created_at as transaction_date,
            'referral' as transaction_type,
            rt.invitee_phone as description,
            'Referral reward' as transaction_description
          FROM referral_transactions rt
          LEFT JOIN users u ON rt.inviter_user_id = u.id
          ${refWhere}
          ORDER BY rt.created_at DESC
        `, referralParams),
        pool.query(`
          SELECT 
            p.id,
            p.seller_id as user_id,
            u.name as user_name,
            u.email as user_email,
            u.phone as user_phone,
            p.current_bid as amount,
            'completed' as status,
            p.auction_end_time as transaction_date,
            'sale' as transaction_type,
            p.title as description,
            'Product sale' as transaction_description
          FROM products p
          LEFT JOIN users u ON p.seller_id = u.id
          ${earnWhere}
          ORDER BY p.auction_end_time DESC
        `, earningsParams)
      ]);

      // Combine results
      const allTransactions = [
        ...referralResult.rows.map(row => ({
          ...row,
          amount: parseFloat(row.amount) || 0
        })),
        ...earningsResult.rows.map(row => ({
          ...row,
          amount: parseFloat(row.amount) || 0
        }))
      ].sort((a, b) => new Date(b.transaction_date) - new Date(a.transaction_date));

      // Apply pagination
      const totalCount = allTransactions.length;
      const paginatedTransactions = allTransactions.slice(offset, offset + parseInt(limit));

      res.json({
        success: true,
        data: paginatedTransactions,
        pagination: {
          total: totalCount,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(totalCount / parseInt(limit))
        }
      });
    } catch (error) {
      console.error("Error fetching wallet logs:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error"
      });
    }
  }
};

