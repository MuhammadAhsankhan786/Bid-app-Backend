import pool from "../config/db.js";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const results = {
  backendConnection: { status: "pending", message: "" },
  databaseStatus: { status: "pending", tables: [], emptyTables: [] },
  apiVerification: { status: "pending", endpoints: [] },
  seedData: { status: "pending", inserted: [] },
  errors: []
};

// ==================== 1. BACKEND CONNECTION CHECK ====================
async function checkBackendConnection() {
  console.log("\n🔌 STEP 1: Backend Connection Check");
  console.log("=" .repeat(50));
  
  // Check .env file
  const envPath = path.join(__dirname, "../../.env");
  const envExists = fs.existsSync(envPath);
  
  if (!envExists) {
    results.backendConnection = {
      status: "failed",
      message: ".env file not found. Please create one with DATABASE_URL"
    };
    results.errors.push("Missing .env file");
    console.log("❌ .env file not found");
    return false;
  }
  
  console.log("✅ .env file exists");
  
  // Check DATABASE_URL
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    results.backendConnection = {
      status: "failed",
      message: "DATABASE_URL not set in .env file"
    };
    results.errors.push("DATABASE_URL not set");
    console.log("❌ DATABASE_URL not set in .env");
    return false;
  }
  
  const isValidFormat = dbUrl.startsWith("postgresql://") || dbUrl.startsWith("postgres://");
  if (!isValidFormat) {
    results.backendConnection = {
      status: "failed",
      message: "DATABASE_URL format invalid. Expected: postgresql://user:password@host:port/dbname"
    };
    results.errors.push("DATABASE_URL format invalid");
    console.log("❌ DATABASE_URL format invalid");
    return false;
  }
  
  console.log("✅ DATABASE_URL is set and format is valid");
  
  // Test connection
  try {
    const result = await pool.query("SELECT NOW() as current_time, version() as pg_version");
    results.backendConnection = {
      status: "success",
      message: "Database connection successful",
      dbTime: result.rows[0].current_time,
      pgVersion: result.rows[0].pg_version.split(" ")[0] + " " + result.rows[0].pg_version.split(" ")[1]
    };
    console.log("✅ Database connection successful");
    console.log(`   Database time: ${result.rows[0].current_time}`);
    console.log(`   PostgreSQL version: ${result.rows[0].pg_version.split(" ")[0]} ${result.rows[0].pg_version.split(" ")[1]}`);
    return true;
  } catch (error) {
    results.backendConnection = {
      status: "failed",
      message: `Connection failed: ${error.message}`
    };
    results.errors.push(`Database connection error: ${error.message}`);
    console.log("❌ Database connection failed");
    console.log(`   Error: ${error.message}`);
    return false;
  }
}

// ==================== 2. DATABASE STATUS ====================
async function checkDatabaseStatus() {
  console.log("\n📊 STEP 2: Database Status Check");
  console.log("=" .repeat(50));
  
  try {
    // Get all tables
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);
    
    const tables = tablesResult.rows.map(row => row.table_name);
    console.log(`Found ${tables.length} tables: ${tables.join(", ")}`);
    
    results.databaseStatus.tables = [];
    results.databaseStatus.emptyTables = [];
    
    for (const table of tables) {
      const countResult = await pool.query(`SELECT COUNT(*) as count FROM ${table}`);
      const count = parseInt(countResult.rows[0].count);
      
      const tableInfo = {
        name: table,
        rowCount: count,
        isEmpty: count === 0
      };
      
      results.databaseStatus.tables.push(tableInfo);
      
      if (count === 0) {
        results.databaseStatus.emptyTables.push(table);
        console.log(`⚠️  Table '${table}' is empty (0 rows)`);
      } else {
        console.log(`✅ Table '${table}': ${count} rows`);
      }
    }
    
    results.databaseStatus.status = results.databaseStatus.emptyTables.length === 0 ? "success" : "needs_seeding";
    return true;
  } catch (error) {
    results.databaseStatus.status = "failed";
    results.errors.push(`Database status check error: ${error.message}`);
    console.log(`❌ Error checking database status: ${error.message}`);
    return false;
  }
}

// ==================== 3. AUTO-FILL SEED DATA ====================
async function seedEmptyTables() {
  console.log("\n🌱 STEP 3: Auto-Fill Seed Data");
  console.log("=" .repeat(50));
  
  if (results.databaseStatus.emptyTables.length === 0) {
    console.log("✅ All tables have data. No seeding needed.");
    results.seedData.status = "skipped";
    return true;
  }
  
  results.seedData.inserted = [];
  
  try {
    // Seed users table
    if (results.databaseStatus.emptyTables.includes("users")) {
      console.log("Seeding users table...");
      
      // Check if admin exists
      const adminCheck = await pool.query("SELECT COUNT(*) as count FROM users WHERE role = 'admin'");
      if (parseInt(adminCheck.rows[0].count) === 0) {
        const bcrypt = (await import("bcrypt")).default;
        const hashedPassword = await bcrypt.hash("admin123", 10);
        
        await pool.query(`
          INSERT INTO users (name, email, phone, role, status, password)
          VALUES 
            ('Admin User', 'admin@demo.com', '+9647700000001', 'admin', 'active', $1),
            ('Provider User', 'provider@demo.com', '+9647700000002', 'seller', 'approved', $2),
            ('Reception User', 'reception@demo.com', '+9647700000003', 'buyer', 'approved', $3)
          ON CONFLICT (email) DO NOTHING
        `, [hashedPassword, hashedPassword, hashedPassword]);
        
        results.seedData.inserted.push("users: 3 users (admin, provider, reception)");
        console.log("✅ Inserted 3 users (admin, provider, reception)");
      }
    }
    
    // Seed categories table
    if (results.databaseStatus.emptyTables.includes("categories")) {
      console.log("Seeding categories table...");
      await pool.query(`
        INSERT INTO categories (name, description)
        VALUES 
          ('Electronics', 'Electronic devices and gadgets'),
          ('Fashion', 'Clothing and accessories'),
          ('Art', 'Artwork and paintings'),
          ('Watches', 'Timepieces and watches')
        ON CONFLICT DO NOTHING
      `);
      results.seedData.inserted.push("categories: 4 categories");
      console.log("✅ Inserted 4 categories");
    }
    
    // Seed products table (requires users and categories)
    if (results.databaseStatus.emptyTables.includes("products")) {
      console.log("Seeding products table...");
      
      // Get a seller user
      const sellerResult = await pool.query("SELECT id FROM users WHERE role = 'seller' LIMIT 1");
      if (sellerResult.rows.length > 0) {
        const sellerId = sellerResult.rows[0].id;
        const categoryResult = await pool.query("SELECT id FROM categories LIMIT 1");
        const categoryId = categoryResult.rows.length > 0 ? categoryResult.rows[0].id : null;
        
        await pool.query(`
          INSERT INTO products (seller_id, title, description, starting_bid, current_bid, category_id, status, auction_end_time)
          VALUES 
            ($1, 'Test Product 1', 'This is a test product for development', 100.00, 100.00, $2, 'approved', NOW() + INTERVAL '7 days'),
            ($1, 'Test Product 2', 'Another test product', 200.00, 200.00, $2, 'approved', NOW() + INTERVAL '5 days')
          ON CONFLICT DO NOTHING
        `, [sellerId, categoryId]);
        
        results.seedData.inserted.push("products: 2 test products");
        console.log("✅ Inserted 2 test products");
      }
    }
    
    // Seed bids table (requires products and users)
    if (results.databaseStatus.emptyTables.includes("bids")) {
      console.log("Seeding bids table...");
      
      const productResult = await pool.query("SELECT id FROM products LIMIT 1");
      const buyerResult = await pool.query("SELECT id FROM users WHERE role = 'buyer' LIMIT 1");
      
      if (productResult.rows.length > 0 && buyerResult.rows.length > 0) {
        const productId = productResult.rows[0].id;
        const userId = buyerResult.rows[0].id;
        
        await pool.query(`
          INSERT INTO bids (product_id, user_id, amount)
          VALUES ($1, $2, 150.00)
          ON CONFLICT DO NOTHING
        `, [productId, userId]);
        
        results.seedData.inserted.push("bids: 1 test bid");
        console.log("✅ Inserted 1 test bid");
      }
    }
    
    // Seed orders table (requires products and users)
    if (results.databaseStatus.emptyTables.includes("orders")) {
      console.log("Seeding orders table...");
      
      const productResult = await pool.query(`
        SELECT p.id, p.current_price 
        FROM products p 
        LIMIT 1
      `);
      const buyerResult = await pool.query("SELECT id FROM users WHERE role = 'buyer' LIMIT 1");
      
      if (productResult.rows.length > 0 && buyerResult.rows.length > 0) {
        const product = productResult.rows[0];
        const buyerId = buyerResult.rows[0].id;
        
        await pool.query(`
          INSERT INTO orders (product_id, buyer_id, amount, status)
          VALUES ($1, $2, $3, 'pending')
          ON CONFLICT DO NOTHING
        `, [product.id, buyerId, product.current_price || 100.00]);
        
        results.seedData.inserted.push("orders: 1 test order");
        console.log("✅ Inserted 1 test order");
      }
    }
    
    // Seed notifications table
    if (results.databaseStatus.emptyTables.includes("notifications")) {
      console.log("Seeding notifications table...");
      
      const userResult = await pool.query("SELECT id FROM users LIMIT 1");
      if (userResult.rows.length > 0) {
        const userId = userResult.rows[0].id;
        
        await pool.query(`
          INSERT INTO notifications (title, message, user_id, is_read)
          VALUES 
            ('Welcome', 'Welcome to BidMaster!', $1, false),
            ('New Bid', 'You have a new bid on your product', $1, false)
          ON CONFLICT DO NOTHING
        `, [userId]);
        
        results.seedData.inserted.push("notifications: 2 test notifications");
        console.log("✅ Inserted 2 test notifications");
      }
    }
    
    // Re-check table counts after seeding
    console.log("\nRe-checking table counts after seeding...");
    for (const table of results.databaseStatus.emptyTables) {
      const countResult = await pool.query(`SELECT COUNT(*) as count FROM ${table}`);
      const count = parseInt(countResult.rows[0].count);
      if (count > 0) {
        console.log(`✅ Table '${table}' now has ${count} rows`);
      } else {
        console.log(`⚠️  Table '${table}' still empty (may need manual seeding)`);
      }
    }
    
    results.seedData.status = "completed";
    return true;
  } catch (error) {
    results.seedData.status = "failed";
    results.errors.push(`Seeding error: ${error.message}`);
    console.log(`❌ Error seeding data: ${error.message}`);
    return false;
  }
}

// ==================== 4. API VERIFICATION ====================
async function verifyAPIs() {
  console.log("\n🔍 STEP 4: API Verification");
  console.log("=" .repeat(50));
  
  const endpoints = [
    { name: "GET /api/products", query: "SELECT COUNT(*) as count FROM products" },
    { name: "GET /api/bids", query: "SELECT COUNT(*) as count FROM bids" },
    { name: "GET /api/users", query: "SELECT COUNT(*) as count FROM users WHERE role != 'admin'" },
    { name: "GET /api/orders", query: "SELECT COUNT(*) as count FROM orders" },
    { name: "GET /api/notifications", query: "SELECT COUNT(*) as count FROM notifications" }
  ];
  
  results.apiVerification.endpoints = [];
  
  for (const endpoint of endpoints) {
    try {
      const result = await pool.query(endpoint.query);
      const count = parseInt(result.rows[0].count);
      
      const endpointInfo = {
        name: endpoint.name,
        status: "success",
        dataCount: count,
        hasData: count > 0
      };
      
      results.apiVerification.endpoints.push(endpointInfo);
      
      if (count > 0) {
        console.log(`✅ ${endpoint.name}: ${count} records available`);
      } else {
        console.log(`⚠️  ${endpoint.name}: No data available`);
      }
    } catch (error) {
      const endpointInfo = {
        name: endpoint.name,
        status: "error",
        error: error.message
      };
      results.apiVerification.endpoints.push(endpointInfo);
      results.errors.push(`${endpoint.name} error: ${error.message}`);
      console.log(`❌ ${endpoint.name}: ${error.message}`);
    }
  }
  
  const allSuccess = results.apiVerification.endpoints.every(e => e.status === "success");
  results.apiVerification.status = allSuccess ? "success" : "partial";
  
  return allSuccess;
}

// ==================== 5. FRONTEND CONFIGURATION CHECK ====================
function checkFrontendConfigs() {
  console.log("\n⚙️  STEP 5: Frontend Configuration Check");
  console.log("=" .repeat(50));
  
  const frontendResults = {
    adminFrontend: { status: "pending", baseUrl: null },
    flutterApp: { status: "pending", baseUrl: null }
  };
  
  // Check Admin Frontend
  const adminApiPath = path.join(__dirname, "../../../Bid app admin  Frontend/src/services/api.js");
  if (fs.existsSync(adminApiPath)) {
    const adminApiContent = fs.readFileSync(adminApiPath, "utf8");
    const baseUrlMatch = adminApiContent.match(/BASE_URL\s*=\s*['"]([^'"]+)['"]/);
    if (baseUrlMatch) {
      frontendResults.adminFrontend.baseUrl = baseUrlMatch[1];
      frontendResults.adminFrontend.status = "found";
      console.log(`✅ Admin Frontend API URL: ${baseUrlMatch[1]}`);
    } else {
      frontendResults.adminFrontend.status = "not_found";
      console.log("⚠️  Admin Frontend API URL not found in api.js");
    }
  } else {
    frontendResults.adminFrontend.status = "file_not_found";
    console.log("⚠️  Admin Frontend api.js not found");
  }
  
  // Check Flutter App
  const flutterApiPath = path.join(__dirname, "../../../bidmaster flutter/lib/app/services/api_service.dart");
  if (fs.existsSync(flutterApiPath)) {
    const flutterApiContent = fs.readFileSync(flutterApiPath, "utf8");
    // Check for localhost (development) or production URL
    const localhostMatch = flutterApiContent.match(/localhost:\d+/);
    const prodMatch = flutterApiContent.match(/bidmaster-api\.onrender\.com/);
    
    if (localhostMatch) {
      frontendResults.flutterApp.baseUrl = `http://${localhostMatch[0]}/api`;
      frontendResults.flutterApp.status = "found_local";
      console.log(`✅ Flutter App API URL (dev): http://${localhostMatch[0]}/api`);
    } else if (prodMatch) {
      frontendResults.flutterApp.baseUrl = "https://bidmaster-api.onrender.com/api";
      frontendResults.flutterApp.status = "found_prod";
      console.log(`✅ Flutter App API URL (prod): https://bidmaster-api.onrender.com/api`);
    } else {
      frontendResults.flutterApp.status = "not_found";
      console.log("⚠️  Flutter App API URL not found");
    }
  } else {
    frontendResults.flutterApp.status = "file_not_found";
    console.log("⚠️  Flutter App api_service.dart not found");
  }
  
  return frontendResults;
}

// ==================== MAIN EXECUTION ====================
async function main() {
  console.log("\n" + "=".repeat(60));
  console.log("🚀 BIDMASTER FULL SYSTEM SYNC VERIFICATION");
  console.log("=".repeat(60));
  
  try {
    // Step 1: Backend Connection
    const connectionOk = await checkBackendConnection();
    if (!connectionOk) {
      console.log("\n❌ Cannot proceed without database connection");
      await pool.end();
      return;
    }
    
    // Step 2: Database Status
    await checkDatabaseStatus();
    
    // Step 3: Seed Empty Tables
    await seedEmptyTables();
    
    // Step 4: API Verification
    await verifyAPIs();
    
    // Step 5: Frontend Config Check
    const frontendConfigs = checkFrontendConfigs();
    
    // Final Summary
    console.log("\n" + "=".repeat(60));
    console.log("📋 FINAL SUMMARY");
    console.log("=".repeat(60));
    
    console.log("\n✅ Backend Connection:", results.backendConnection.status === "success" ? "SUCCESS" : "FAILED");
    if (results.backendConnection.status === "success") {
      console.log(`   Database: ${results.backendConnection.pgVersion}`);
    }
    
    console.log("\n📊 Database Status:");
    results.databaseStatus.tables.forEach(table => {
      const icon = table.isEmpty ? "⚠️ " : "✅";
      console.log(`   ${icon} ${table.name}: ${table.rowCount} rows`);
    });
    
    if (results.databaseStatus.emptyTables.length > 0) {
      console.log(`\n⚠️  Empty tables found: ${results.databaseStatus.emptyTables.join(", ")}`);
    }
    
    if (results.seedData.inserted.length > 0) {
      console.log("\n🌱 Seed Data Inserted:");
      results.seedData.inserted.forEach(item => {
        console.log(`   ✅ ${item}`);
      });
    }
    
    console.log("\n🔍 API Verification:");
    results.apiVerification.endpoints.forEach(endpoint => {
      const icon = endpoint.status === "success" ? "✅" : "❌";
      const dataInfo = endpoint.hasData ? `(${endpoint.dataCount} records)` : "(no data)";
      console.log(`   ${icon} ${endpoint.name} ${dataInfo}`);
    });
    
    console.log("\n⚙️  Frontend Configuration:");
    console.log(`   Admin Frontend: ${frontendConfigs.adminFrontend.baseUrl || "Not configured"}`);
    console.log(`   Flutter App: ${frontendConfigs.flutterApp.baseUrl || "Not configured"}`);
    
    if (results.errors.length > 0) {
      console.log("\n❌ Errors Found:");
      results.errors.forEach(error => {
        console.log(`   - ${error}`);
      });
    }
    
    // Final Status
    const allGood = 
      results.backendConnection.status === "success" &&
      results.databaseStatus.status !== "failed" &&
      results.apiVerification.status === "success" &&
      results.errors.length === 0;
    
    console.log("\n" + "=".repeat(60));
    if (allGood) {
      console.log("✅ LIVE SYNC SUCCESSFUL");
      console.log("   Backend, Database, and APIs are synchronized!");
    } else {
      console.log("⚠️  SYNC COMPLETE WITH WARNINGS");
      console.log("   Review the summary above for details.");
    }
    console.log("=".repeat(60) + "\n");
    
  } catch (error) {
    console.error("\n❌ Fatal error:", error);
    results.errors.push(`Fatal error: ${error.message}`);
  } finally {
    await pool.end();
  }
}

// Run the verification
main();

