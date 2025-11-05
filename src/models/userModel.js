import pool from "../config/db.js";
import bcrypt from "bcrypt";

export const UserModel = {
  async findByEmail(email) {
    const res = await pool.query("SELECT * FROM users WHERE email=$1", [email]);
    return res.rows[0];
  },

  async getAll() {
    const res = await pool.query("SELECT id, name, email, role, created_at FROM users ORDER BY id DESC");
    return res.rows;
  },

  async createAdmin({ name, email, password }) {
    const hash = await bcrypt.hash(password, 10);
    const res = await pool.query(
      "INSERT INTO users (name,email,password,role) VALUES ($1,$2,$3,'admin') RETURNING id,name,email,role",
      [name, email, hash]
    );
    return res.rows[0];
  }
};
