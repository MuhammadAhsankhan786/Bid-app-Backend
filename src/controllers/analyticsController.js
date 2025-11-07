import pool from "../config/db.js";

export const AnalyticsController = {
  // Get weekly analytics
  async getWeeklyData(req, res) {
    try {
      // Get revenue from orders (handle missing payment_status column)
      const revenueQuery = `
        SELECT 
          DATE(created_at) as day,
          COALESCE(SUM(amount), 0) as revenue
        FROM orders
        WHERE created_at >= NOW() - INTERVAL '7 days'
        GROUP BY DATE(created_at)
        ORDER BY day ASC
      `;

      // Get bids count
      const bidsQuery = `
        SELECT 
          DATE(created_at) as day,
          COUNT(*) as bids
        FROM bids
        WHERE created_at >= NOW() - INTERVAL '7 days'
        GROUP BY DATE(created_at)
        ORDER BY day ASC
      `;

      // Get users count
      const usersQuery = `
        SELECT 
          DATE(created_at) as day,
          COUNT(DISTINCT id) as users
        FROM users
        WHERE created_at >= NOW() - INTERVAL '7 days'
          AND role != 'admin'
        GROUP BY DATE(created_at)
        ORDER BY day ASC
      `;

      const [revenueResult, bidsResult, usersResult] = await Promise.all([
        pool.query(revenueQuery).catch(() => ({ rows: [] })),
        pool.query(bidsQuery).catch(() => ({ rows: [] })),
        pool.query(usersQuery).catch(() => ({ rows: [] }))
      ]);

      // Combine data by day
      const dayMap = {};
      const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

      // Process revenue
      revenueResult.rows.forEach(row => {
        const date = new Date(row.day);
        const dayIndex = date.getDay() === 0 ? 6 : date.getDay() - 1;
        const dayName = days[dayIndex];
        if (!dayMap[dayName]) {
          dayMap[dayName] = { day: dayName, revenue: 0, bids: 0, users: 0 };
        }
        dayMap[dayName].revenue = parseFloat(row.revenue) || 0;
      });

      // Process bids
      bidsResult.rows.forEach(row => {
        const date = new Date(row.day);
        const dayIndex = date.getDay() === 0 ? 6 : date.getDay() - 1;
        const dayName = days[dayIndex];
        if (!dayMap[dayName]) {
          dayMap[dayName] = { day: dayName, revenue: 0, bids: 0, users: 0 };
        }
        dayMap[dayName].bids = parseInt(row.bids) || 0;
      });

      // Process users
      usersResult.rows.forEach(row => {
        const date = new Date(row.day);
        const dayIndex = date.getDay() === 0 ? 6 : date.getDay() - 1;
        const dayName = days[dayIndex];
        if (!dayMap[dayName]) {
          dayMap[dayName] = { day: dayName, revenue: 0, bids: 0, users: 0 };
        }
        dayMap[dayName].users = parseInt(row.users) || 0;
      });

      // Fill missing days with zeros
      const result = days.map(day => dayMap[day] || { day, revenue: 0, bids: 0, users: 0 });

      res.json(result);
    } catch (error) {
      console.error("Error fetching weekly data:", error);
      res.status(500).json({ error: "Failed to fetch weekly analytics", details: error.message });
    }
  },

  // Get monthly analytics
  async getMonthlyData(req, res) {
    try {
      // Get revenue from orders
      const revenueQuery = `
        SELECT 
          DATE_TRUNC('month', created_at) as month,
          COALESCE(SUM(amount), 0) as revenue
        FROM orders
        WHERE created_at >= NOW() - INTERVAL '12 months'
        GROUP BY DATE_TRUNC('month', created_at)
        ORDER BY month ASC
      `;

      // Get bids count
      const bidsQuery = `
        SELECT 
          DATE_TRUNC('month', created_at) as month,
          COUNT(*) as bids
        FROM bids
        WHERE created_at >= NOW() - INTERVAL '12 months'
        GROUP BY DATE_TRUNC('month', created_at)
        ORDER BY month ASC
      `;

      const [revenueResult, bidsResult] = await Promise.all([
        pool.query(revenueQuery).catch(() => ({ rows: [] })),
        pool.query(bidsQuery).catch(() => ({ rows: [] }))
      ]);

      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const monthMap = {};

      // Process revenue
      revenueResult.rows.forEach(row => {
        const monthKey = row.month.toISOString().substring(0, 7);
        monthMap[monthKey] = {
          month: monthNames[new Date(row.month).getMonth()],
          revenue: parseFloat(row.revenue) || 0,
          bids: 0
        };
      });

      // Process bids
      bidsResult.rows.forEach(row => {
        const monthKey = row.month.toISOString().substring(0, 7);
        if (!monthMap[monthKey]) {
          monthMap[monthKey] = {
            month: monthNames[new Date(row.month).getMonth()],
            revenue: 0,
            bids: 0
          };
        }
        monthMap[monthKey].bids = parseInt(row.bids) || 0;
      });

      res.json(Object.values(monthMap));
    } catch (error) {
      console.error("Error fetching monthly data:", error);
      res.status(500).json({ error: "Failed to fetch monthly analytics", details: error.message });
    }
  },

  // Get category distribution
  async getCategoryDistribution(req, res) {
    try {
      // Try with categories table first
      let result;
      try {
        result = await pool.query(`
          SELECT 
            c.name as category,
            COALESCE(SUM(o.amount), 0) as value
          FROM categories c
          LEFT JOIN products p ON p.category_id = c.id
          LEFT JOIN orders o ON o.product_id = p.id
          GROUP BY c.id, c.name
          ORDER BY value DESC
          LIMIT 10
        `);
      } catch (catError) {
        // If categories table doesn't exist, get from products directly
        result = await pool.query(`
          SELECT 
            COALESCE(p.category, 'Uncategorized') as category,
            COALESCE(SUM(o.amount), 0) as value
          FROM products p
          LEFT JOIN orders o ON o.product_id = p.id
          GROUP BY p.category
          ORDER BY value DESC
          LIMIT 10
        `).catch(() => ({ rows: [] }));
      }

      if (result.rows.length === 0) {
        // Return empty array if no data
        return res.json([]);
      }

      res.json(result.rows.map(row => ({
        category: row.category || 'Uncategorized',
        value: parseFloat(row.value) || 0
      })));
    } catch (error) {
      console.error("Error fetching category distribution:", error);
      // Return empty array instead of error
      res.json([]);
    }
  },

  // Get top products
  async getTopProducts(req, res) {
    try {
      const result = await pool.query(`
        SELECT 
          p.id,
          p.title,
          p.image_url,
          COUNT(o.id) as order_count,
          COALESCE(SUM(o.amount), 0) as total_revenue
        FROM products p
        LEFT JOIN orders o ON o.product_id = p.id AND o.payment_status = 'completed'
        GROUP BY p.id, p.title, p.image_url
        ORDER BY total_revenue DESC
        LIMIT 10
      `);

      res.json(result.rows);
    } catch (error) {
      console.error("Error fetching top products:", error);
      res.status(500).json({ error: "Failed to fetch top products" });
    }
  }
};

