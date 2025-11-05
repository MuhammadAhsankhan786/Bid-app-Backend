import pool from "../config/db.js";

export const AnalyticsController = {
  // Get weekly analytics
  async getWeeklyData(req, res) {
    try {
      const result = await pool.query(`
        SELECT 
          DATE(created_at) as day,
          COALESCE(SUM(CASE WHEN entity_type = 'order' THEN 1 ELSE 0 END), 0) as revenue,
          COALESCE(SUM(CASE WHEN entity_type = 'bid' THEN 1 ELSE 0 END), 0) as bids,
          COALESCE(COUNT(DISTINCT user_id), 0) as users
        FROM (
          SELECT created_at, 'order' as entity_type, buyer_id as user_id, amount as value
          FROM orders
          WHERE created_at >= NOW() - INTERVAL '7 days'
            AND payment_status = 'completed'
          UNION ALL
          SELECT created_at, 'bid' as entity_type, user_id, amount as value
          FROM bids
          WHERE created_at >= NOW() - INTERVAL '7 days'
        ) combined
        GROUP BY DATE(created_at)
        ORDER BY day ASC
      `);

      // Fill in missing days with zeros
      const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      const dayMap = {};
      result.rows.forEach(row => {
        const date = new Date(row.day);
        const dayName = days[date.getDay() === 0 ? 6 : date.getDay() - 1];
        dayMap[dayName] = {
          day: dayName,
          revenue: parseFloat(row.revenue) || 0,
          bids: parseInt(row.bids) || 0,
          users: parseInt(row.users) || 0
        };
      });

      res.json(Object.values(dayMap));
    } catch (error) {
      console.error("Error fetching weekly data:", error);
      res.status(500).json({ error: "Failed to fetch weekly analytics" });
    }
  },

  // Get monthly analytics
  async getMonthlyData(req, res) {
    try {
      const result = await pool.query(`
        SELECT 
          DATE_TRUNC('month', created_at) as month,
          COALESCE(SUM(amount), 0) as revenue,
          COUNT(*) as bids
        FROM orders
        WHERE created_at >= NOW() - INTERVAL '12 months'
          AND payment_status = 'completed'
        GROUP BY DATE_TRUNC('month', created_at)
        ORDER BY month ASC
      `);

      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      
      res.json(result.rows.map(row => ({
        month: monthNames[new Date(row.month).getMonth()],
        revenue: parseFloat(row.revenue) || 0,
        bids: parseInt(row.bids) || 0
      })));
    } catch (error) {
      console.error("Error fetching monthly data:", error);
      res.status(500).json({ error: "Failed to fetch monthly analytics" });
    }
  },

  // Get category distribution
  async getCategoryDistribution(req, res) {
    try {
      const result = await pool.query(`
        SELECT 
          c.name as category,
          COALESCE(SUM(o.amount), 0) as value
        FROM categories c
        LEFT JOIN products p ON p.category_id = c.id
        LEFT JOIN orders o ON o.product_id = p.id AND o.payment_status = 'completed'
        GROUP BY c.id, c.name
        ORDER BY value DESC
        LIMIT 10
      `);

      res.json(result.rows.map(row => ({
        category: row.category,
        value: parseFloat(row.value) || 0
      })));
    } catch (error) {
      console.error("Error fetching category distribution:", error);
      res.status(500).json({ error: "Failed to fetch category distribution" });
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

