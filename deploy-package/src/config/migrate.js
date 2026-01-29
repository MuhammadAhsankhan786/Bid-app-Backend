// src/config/migrate.js
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import pool from "./db.js";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const runMigrations = async () => {
  try {
    const migrationDir = path.join(__dirname, "../../migrations");
    const files = fs.readdirSync(migrationDir).sort();

    for (const file of files) {
      const sql = fs.readFileSync(path.join(migrationDir, file), "utf8");
      console.log(`🚀 Running migration: ${file}`);
      await pool.query(sql);
    }

    console.log("✅ All migrations completed successfully!");
    process.exit(0);
  } catch (err) {
    console.error("❌ Migration error:", err);
    process.exit(1);
  }
};

runMigrations();
