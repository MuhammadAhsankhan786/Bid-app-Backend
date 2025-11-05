import pool from "../config/db.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigrations() {
  const migrationsDir = path.join(__dirname, "../../migrations");
  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  console.log(`Found ${files.length} migration files`);

  for (const file of files) {
    console.log(`Running migration: ${file}`);
    try {
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
      await pool.query(sql);
      console.log(`✅ Completed: ${file}`);
    } catch (error) {
      console.error(`❌ Error in ${file}:`, error.message);
      // Continue with other migrations
    }
  }

  console.log("All migrations completed!");
  await pool.end();
}

runMigrations().catch(console.error);

