import pool from "../config/db.js";

export const DashboardController = {
  // Get comprehensive dashboard stats
  async getDashboard(req, res) {
    try {
      // Get all stats in parallel for better performance
      // Wrap each query with error handling for missing columns
      const queries = [
        pool.query("SELECT COUNT(*) as count FROM users WHERE role != 'admin'"),
        pool.query("SELECT COUNT(*) as count FROM products"),
        pool.query("SELECT COUNT(*) as count FROM products WHERE status = 'pending'"),
        pool.query("SELECT COUNT(*) as count FROM products WHERE status = 'approved'"),
        pool.query(`
          SELECT COUNT(*) as count FROM products 
          WHERE status = 'approved' AND auction_end_time > NOW()
        `),
        pool.query("SELECT COUNT(*) as count FROM orders"),
        // Revenue query - sum all orders (payment_status may not exist)
        pool.query(`
          SELECT COALESCE(SUM(amount), 0) as total FROM orders
        `).catch(() => ({ rows: [{ total: '0' }] })),
        // Recent actions - handle missing entity_type column gracefully  
        pool.query(`
          SELECT action, 
                 COALESCE(entity_type, 'system') as entity_type, 
                 created_at, admin_id 
          FROM admin_activity_log 
          ORDER BY created_at DESC 
          LIMIT 10
        `).catch(() => ({ rows: [] }))
      ];

      const [
        usersCount,
        productsCount,
        pendingProducts,
        approvedProducts,
        activeAuctions,
        totalOrders,
        totalRevenue,
        recentActions
      ] = await Promise.all(queries);

      // Calculate user growth (last month)
      const lastMonthUsers = await pool.query(`
        SELECT COUNT(*) as count FROM users 
        WHERE role != 'admin' 
        AND created_at >= NOW() - INTERVAL '30 days'
      `);

      // NULL-safe: Handle empty results
      const totalUsers = parseInt(usersCount.rows?.[0]?.count || 0);
      const lastMonthCount = parseInt(lastMonthUsers.rows?.[0]?.count || 0);
      const userGrowth = totalUsers > 0 
        ? ((lastMonthCount / totalUsers) * 100).toFixed(1) 
        : '0.0';

      res.json({
        stats: {
          users: totalUsers.toString(),
          products: productsCount.rows?.[0]?.count || 0,
          pending: pendingProducts.rows?.[0]?.count || 0,
          approved: approvedProducts.rows?.[0]?.count || 0,
          activeAuctions: activeAuctions.rows?.[0]?.count || 0,
          orders: totalOrders.rows?.[0]?.count || 0,
          revenue: parseFloat(totalRevenue.rows?.[0]?.total || 0).toFixed(2)
        },
        userGrowth: userGrowth,
        recentActions: (recentActions.rows || []).map(action => ({
          id: action.admin_id,
          type: action.entity_type || 'system',
          action: action.action,
          time: action.created_at
        }))
      });
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      console.error("   Error message:", error.message);
      console.error("   Error code:", error.code);
      console.error("   Error detail:", error.detail);
      // Return 200 with default values instead of 500
      res.status(200).json({
        stats: {
          users: '0',
          products: 0,
          pending: 0,
          approved: 0,
          activeAuctions: 0,
          orders: 0,
          revenue: '0.00'
        },
        userGrowth: '0.0',
        recentActions: []
      });
    }
  },

  // Get revenue and activity chart data
  async getChartData(req, res) {
    try {
      const { period = 'week' } = req.query;
      
      let revenueQuery, bidsQuery;
      
      if (period === 'week') {
        revenueQuery = `
          SELECT 
            DATE(created_at) as date,
            COALESCE(SUM(amount), 0) as revenue
          FROM orders 
          WHERE created_at >= NOW() - INTERVAL '7 days'
          GROUP BY DATE(created_at)
          ORDER BY date ASC
        `;
        
        bidsQuery = `
          SELECT 
            DATE(created_at) as date,
            COUNT(*) as bids
          FROM bids 
          WHERE created_at >= NOW() - INTERVAL '7 days'
          GROUP BY DATE(created_at)
          ORDER BY date ASC
        `;
      } else {
        revenueQuery = `
          SELECT 
            DATE_TRUNC('month', created_at) as date,
            COALESCE(SUM(amount), 0) as revenue
          FROM orders 
          WHERE created_at >= NOW() - INTERVAL '12 months'
          GROUP BY DATE_TRUNC('month', created_at)
          ORDER BY date ASC
        `;
        
        bidsQuery = `
          SELECT 
            DATE_TRUNC('month', created_at) as date,
            COUNT(*) as bids
          FROM bids 
          WHERE created_at >= NOW() - INTERVAL '12 months'
          GROUP BY DATE_TRUNC('month', created_at)
          ORDER BY date ASC
        `;
      }

      const [revenueData, bidsData] = await Promise.all([
        pool.query(revenueQuery),
        pool.query(bidsQuery)
      ]);

      res.json({
        revenue: revenueData.rows || [],
        bids: bidsData.rows || []
      });
    } catch (error) {
      console.error("Error fetching chart data:", error);
      // Return 200 with empty arrays instead of 500
      res.status(200).json({
        revenue: [],
        bids: []
      });
    }
  },

  // Get category distribution
  async getCategoryData(req, res) {
    try {
      const result = await pool.query(`
        SELECT 
          c.name,
          c.id,
          COUNT(p.id) as value
        FROM categories c
        LEFT JOIN products p ON p.category_id = c.id AND p.status = 'approved'
        GROUP BY c.id, c.name
        ORDER BY value DESC
      `);

      const colors = ['#3b82f6', '#8b5cf6', '#ec4899', '#10b981', '#f59e0b', '#ef4444'];
      
      res.json((result.rows || []).map((row, index) => ({
        name: row.name || 'Uncategorized',
        value: parseInt(row.value) || 0,
        color: colors[index % colors.length]
      })));
    } catch (error) {
      console.error("Error fetching category data:", error);
      // Return 200 with empty array instead of 500
      res.status(200).json([]);
    }
  }
};

