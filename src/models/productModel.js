import pool from "../config/db.js";

export const ProductModel = {
  async getAllPending() {
    const res = await pool.query("SELECT * FROM products WHERE status='pending' ORDER BY created_at DESC");
    return res.rows;
  },
  async approveProduct(id) {
    const res = await pool.query("UPDATE products SET status='approved' WHERE id=$1 RETURNING *", [id]);
    return res.rows[0];
  },
  async rejectProduct(id) {
    const res = await pool.query("UPDATE products SET status='rejected' WHERE id=$1 RETURNING *", [id]);
    return res.rows[0];
  }
};
