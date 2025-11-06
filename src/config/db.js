import pkg from "pg";
const { Pool } = pkg;
import dotenv from "dotenv";

dotenv.config();

console.log('🔌 Initializing database connection...');
console.log('   DATABASE_URL exists:', !!process.env.DATABASE_URL);
console.log('   DATABASE_URL starts with postgresql:', process.env.DATABASE_URL?.startsWith('postgresql://') || process.env.DATABASE_URL?.startsWith('postgres://'));

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Suppress connection event logging (too verbose)
// Only log on initial connection
let connectionLogged = false;
pool.on("connect", () => {
  if (!connectionLogged) {
    console.log("✅ Connected to Neon PostgreSQL Database");
    connectionLogged = true;
  }
});

pool.on("error", (err) => {
  console.error("❌ Database connection error:", err);
  console.error("   Error message:", err.message);
  console.error("   Error code:", err.code);
});

// Test connection on startup
pool.query('SELECT NOW() as current_time')
  .then((result) => {
    console.log('✅ Database connection test successful');
    console.log('   Current DB time:', result.rows[0].current_time);
  })
  .catch((error) => {
    console.error('❌ Database connection test failed');
    console.error('   Error:', error.message);
    console.error('   Code:', error.code);
    console.error('   DATABASE_URL:', process.env.DATABASE_URL ? 'Set (hidden)' : 'NOT SET');
  });

export default pool;
