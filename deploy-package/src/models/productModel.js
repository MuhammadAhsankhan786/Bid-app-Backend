import pool from "../config/db.js";

export const ProductModel = {
  async getAllPending() {
    const res = await pool.query(`
      SELECT 
        p.*,
        u.name as seller_name,
        u.email as seller_email,
        c.name as category_name
      FROM products p
      LEFT JOIN users u ON p.seller_id = u.id
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.status='pending' 
      ORDER BY p.created_at DESC
    `);
    return res.rows;
  },
  async approveProduct(id) {
    const res = await pool.query(
      "UPDATE products SET status='approved', updated_at=CURRENT_TIMESTAMP WHERE id=$1 RETURNING *", 
      [id]
    );
    return res.rows[0];
  },
  async rejectProduct(id, rejectionReason = null) {
    const res = await pool.query(
      "UPDATE products SET status='rejected', rejection_reason=$2, updated_at=CURRENT_TIMESTAMP WHERE id=$1 RETURNING *", 
      [id, rejectionReason]
    );
    return res.rows[0];
  },
  async getProductById(id) {
    const res = await pool.query(`
      SELECT 
        p.*,
        u.name as seller_name,
        u.email as seller_email,
        u.phone as seller_phone,
        c.name as category_name,
        c.slug as category_slug
      FROM products p
      LEFT JOIN users u ON p.seller_id = u.id
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.id = $1
    `, [id]);
    return res.rows[0];
  }
};
