import pool from "../config/db.js";

export const DashboardController = {
  // Get comprehensive dashboard stats
  async getDashboard(req, res) {
    try {
      // Get all stats in parallel for better performance
      const [
        usersCount,
        productsCount,
        pendingProducts,
        approvedProducts,
        activeAuctions,
        totalOrders,
        totalRevenue,
        recentActions
      ] = await Promise.all([
        pool.query("SELECT COUNT(*) as count FROM users WHERE role != 'admin'"),
        pool.query("SELECT COUNT(*) as count FROM products"),
        pool.query("SELECT COUNT(*) as count FROM products WHERE status = 'pending'"),
        pool.query("SELECT COUNT(*) as count FROM products WHERE status = 'approved'"),
        pool.query(`
          SELECT COUNT(*) as count FROM products 
          WHERE status = 'approved' AND auction_end_time > NOW()
        `),
        pool.query("SELECT COUNT(*) as count FROM orders"),
        pool.query(`
          SELECT COALESCE(SUM(amount), 0) as total FROM orders 
          WHERE payment_status = 'completed'
        `),
        pool.query(`
          SELECT action, entity_type, created_at, admin_id 
          FROM admin_activity_log 
          ORDER BY created_at DESC 
          LIMIT 10
        `)
      ]);

      // Calculate user growth (last month)
      const lastMonthUsers = await pool.query(`
        SELECT COUNT(*) as count FROM users 
        WHERE role != 'admin' 
        AND created_at >= NOW() - INTERVAL '30 days'
      `);

      const totalUsers = parseInt(usersCount.rows[0].count);
      const lastMonthCount = parseInt(lastMonthUsers.rows[0].count);
      const userGrowth = totalUsers > 0 
        ? ((lastMonthCount / totalUsers) * 100).toFixed(1) 
        : '0.0';

      res.json({
        stats: {
          users: totalUsers.toString(),
          products: productsCount.rows[0].count,
          pending: pendingProducts.rows[0].count,
          approved: approvedProducts.rows[0].count,
          activeAuctions: activeAuctions.rows[0].count,
          orders: totalOrders.rows[0].count,
          revenue: parseFloat(totalRevenue.rows[0].total || 0).toFixed(2)
        },
        userGrowth: userGrowth,
        recentActions: recentActions.rows.map(action => ({
          id: action.admin_id,
          type: action.entity_type || 'system',
          action: action.action,
          time: action.created_at
        }))
      });
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      res.status(500).json({ error: "Failed to fetch dashboard data" });
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
            AND payment_status = 'completed'
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
            AND payment_status = 'completed'
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
        revenue: revenueData.rows,
        bids: bidsData.rows
      });
    } catch (error) {
      console.error("Error fetching chart data:", error);
      res.status(500).json({ error: "Failed to fetch chart data" });
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
      
      res.json(result.rows.map((row, index) => ({
        name: row.name,
        value: parseInt(row.value),
        color: colors[index % colors.length]
      })));
    } catch (error) {
      console.error("Error fetching category data:", error);
      res.status(500).json({ error: "Failed to fetch category data" });
    }
  }
};

