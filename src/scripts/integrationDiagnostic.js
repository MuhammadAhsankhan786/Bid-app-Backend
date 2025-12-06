import pool from "../config/db.js";
import express from "express";
import http from "http";

const app = express();
app.use(express.json());

// Import routes to test
import adminRoutes from "../Routes/adminRoutes.js";
import authRoutes from "../Routes/authRoutes.js";
import productRoutes from "../Routes/productRoutes.js";
import bidRoutes from "../Routes/bidRoutes.js";
import auctionRoutes from "../Routes/auctionRoutes.js";
import orderRoutes from "../Routes/orderRoutes.js";
import notificationRoutes from "../Routes/notificationRoutes.js";

app.use("/api/admin", adminRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/bids", bidRoutes);
app.use("/api/auction", auctionRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/notifications", notificationRoutes);

// Test routes
const testRoutes = [
  { method: "GET", path: "/", description: "Health check" },
  { method: "GET", path: "/api/products", description: "Get all products" },
  { method: "GET", path: "/api/products/1", description: "Get product by ID" },
  { method: "GET", path: "/api/admin/dashboard", description: "Admin dashboard (requires auth)" },
];

async function runDiagnostic() {
  const report = {
    timestamp: new Date().toISOString(),
    backend: {},
    database: {},
    routes: [],
    issues: [],
    fixes: [],
  };

  console.log("\n🔍 BidMaster Integration Diagnostic Starting...\n");
  console.log("=" .repeat(60));

  // ==================== 1. BACKEND ENVIRONMENT ====================
  console.log("\n📦 STEP 1: Backend Environment Check");
  console.log("-".repeat(60));

  const hasDatabaseUrl = !!process.env.DATABASE_URL;
  const dbUrlValid = process.env.DATABASE_URL?.startsWith("postgresql://") || 
                     process.env.DATABASE_URL?.startsWith("postgres://");

  report.backend = {
    hasDatabaseUrl,
    dbUrlValid,
    port: process.env.PORT || 5000,
    nodeEnv: process.env.NODE_ENV || "development",
  };

  console.log(`✅ DATABASE_URL exists: ${hasDatabaseUrl ? "✅" : "❌"}`);
  console.log(`✅ DATABASE_URL format valid: ${dbUrlValid ? "✅" : "❌"}`);
  console.log(`✅ PORT: ${report.backend.port}`);
  console.log(`✅ NODE_ENV: ${report.backend.nodeEnv}`);

  if (!hasDatabaseUrl || !dbUrlValid) {
    report.issues.push("DATABASE_URL not set or invalid format");
    report.fixes.push("Set DATABASE_URL in .env file with format: postgresql://user:pass@host/db");
  }

  // ==================== 2. DATABASE CONNECTION ====================
  console.log("\n🗄️  STEP 2: Database Connection & Schema Check");
  console.log("-".repeat(60));

  try {
    // Test connection
    const connectionTest = await pool.query("SELECT NOW() as current_time, version() as pg_version");
    console.log("✅ Database connection: SUCCESS");
    console.log(`   PostgreSQL version: ${connectionTest.rows[0].pg_version.split(',')[0]}`);
    console.log(`   Database time: ${connectionTest.rows[0].current_time}`);

    report.database.connected = true;
    report.database.pgVersion = connectionTest.rows[0].pg_version.split(',')[0];

    // Check required tables
    const requiredTables = ["users", "products", "categories", "bids", "orders", "notifications"];
    const tableCheck = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN (${requiredTables.map((_, i) => `$${i + 1}`).join(",")})
    `, requiredTables);

    const existingTables = tableCheck.rows.map(r => r.table_name);
    const missingTables = requiredTables.filter(t => !existingTables.includes(t));

    console.log("\n📋 Required Tables:");
    requiredTables.forEach(table => {
      const exists = existingTables.includes(table);
      console.log(`   ${exists ? "✅" : "❌"} ${table}`);
    });

    report.database.tables = {
      existing: existingTables,
      missing: missingTables,
    };

    if (missingTables.length > 0) {
      report.issues.push(`Missing tables: ${missingTables.join(", ")}`);
      report.fixes.push(`Run migrations to create missing tables: ${missingTables.join(", ")}`);
    }

    // Check products table columns
    if (existingTables.includes("products")) {
      const productColumns = await pool.query(`
        SELECT column_name, data_type, column_default, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'products'
        AND column_name IN ('current_bid', 'starting_price', 'auction_end_time', 'highest_bidder_id')
      `);

      const existingColumns = productColumns.rows.map(r => r.column_name);
      const requiredColumns = ["current_bid", "starting_price", "auction_end_time", "highest_bidder_id"];
      const missingColumns = requiredColumns.filter(c => !existingColumns.includes(c));

      console.log("\n📊 Products Table Columns:");
      requiredColumns.forEach(col => {
        const exists = existingColumns.includes(col);
        const colInfo = productColumns.rows.find(r => r.column_name === col);
        console.log(`   ${exists ? "✅" : "❌"} ${col}${colInfo ? ` (${colInfo.data_type})` : ""}`);
      });

      report.database.productColumns = {
        existing: existingColumns,
        missing: missingColumns,
      };

      if (missingColumns.length > 0) {
        report.issues.push(`Missing product columns: ${missingColumns.join(", ")}`);
        report.fixes.push(`ALTER TABLE products ADD COLUMN ${missingColumns.map(c => {
          if (c === "current_bid") return "current_bid NUMERIC(10,2) DEFAULT 0";
          if (c === "starting_price") return "starting_price NUMERIC(10,2)";
          if (c === "auction_end_time") return "auction_end_time TIMESTAMP";
          if (c === "highest_bidder_id") return "highest_bidder_id INTEGER REFERENCES users(id)";
        }).join(", ")}`);
      }

      // Check product count
      const productCount = await pool.query(`
        SELECT 
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE status = 'approved') as approved,
          COUNT(*) FILTER (WHERE status = 'pending') as pending
        FROM products
      `);

      console.log("\n📦 Products Count:");
      console.log(`   Total: ${productCount.rows[0].total}`);
      console.log(`   Approved: ${productCount.rows[0].approved}`);
      console.log(`   Pending: ${productCount.rows[0].pending}`);

      report.database.productCount = {
        total: parseInt(productCount.rows[0].total),
        approved: parseInt(productCount.rows[0].approved),
        pending: parseInt(productCount.rows[0].pending),
      };

      if (parseInt(productCount.rows[0].approved) === 0) {
        report.issues.push("No approved products in database");
        report.fixes.push("Run: npm run seed-products");
      }
    }

  } catch (error) {
    console.log("❌ Database connection: FAILED");
    console.log(`   Error: ${error.message}`);
    report.database.connected = false;
    report.database.error = error.message;
    report.issues.push(`Database connection failed: ${error.message}`);
  }

  // ==================== 3. API ROUTES TEST ====================
  console.log("\n🌐 STEP 3: API Routes Check");
  console.log("-".repeat(60));

  // Test GET /api/products endpoint
  try {
    const productsResult = await pool.query(`
      SELECT 
        p.id, p.title, p.description, p.image_url, 
        p.starting_price, p.current_bid, p.status,
        p.auction_end_time, p.highest_bidder_id,
        p.created_at, p.seller_id,
        c.name as category_name,
        u.name as seller_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN users u ON p.seller_id = u.id
      WHERE p.status = 'approved'
      ORDER BY p.created_at DESC
      LIMIT 5
    `);

    console.log(`✅ GET /api/products: Query executed successfully`);
    console.log(`   Products found: ${productsResult.rows.length}`);

    if (productsResult.rows.length > 0) {
      const sampleProduct = productsResult.rows[0];
      console.log(`\n📋 Sample Product Structure:`);
      console.log(`   ID: ${sampleProduct.id}`);
      console.log(`   Title: ${sampleProduct.title}`);
      console.log(`   Current Bid: ${sampleProduct.current_bid || 0}`);
      console.log(`   Starting Price: ${sampleProduct.starting_price}`);
      console.log(`   Status: ${sampleProduct.status}`);
      console.log(`   Auction End: ${sampleProduct.auction_end_time}`);
      console.log(`   Has highest_bidder_id: ${sampleProduct.highest_bidder_id ? "✅" : "❌"}`);

      report.routes.push({
        path: "/api/products",
        status: 200,
        productsFound: productsResult.rows.length,
        sampleProduct: {
          id: sampleProduct.id,
          title: sampleProduct.title,
          hasCurrentBid: !!sampleProduct.current_bid,
          hasHighestBidder: !!sampleProduct.highest_bidder_id,
        },
      });
    } else {
      report.issues.push("GET /api/products returns empty result");
      report.fixes.push("Seed products: npm run seed-products");
    }
  } catch (error) {
    console.log(`❌ GET /api/products: FAILED`);
    console.log(`   Error: ${error.message}`);
    report.routes.push({
      path: "/api/products",
      status: 500,
      error: error.message,
    });
    report.issues.push(`GET /api/products failed: ${error.message}`);
  }

  // ==================== 4. CORS CONFIGURATION ====================
  console.log("\n🔒 STEP 4: CORS Configuration Check");
  console.log("-".repeat(60));

  // Read server.js to check CORS config
  const fs = await import("fs");
  const path = await import("path");
  const serverJsPath = path.join(process.cwd(), "src", "server.js");
  
  try {
    const serverJsContent = fs.readFileSync(serverJsPath, "utf-8");
    const hasCorsConfig = serverJsContent.includes("corsOptions");
    const allowsLocalhost = serverJsContent.includes("localhost") || serverJsContent.includes("127.0.0.1");
    const allowsProduction = serverJsContent.includes("api.mazaadati.com");

    console.log(`✅ CORS configuration found: ${hasCorsConfig ? "✅" : "❌"}`);
    console.log(`✅ Allows localhost: ${allowsLocalhost ? "✅" : "❌"}`);
    console.log(`✅ Allows Production (api.mazaadati.com): ${allowsProduction ? "✅" : "❌"}`);

    report.backend.cors = {
      configured: hasCorsConfig,
      allowsLocalhost: allowsLocalhost,
      allowsProduction: allowsProduction,
    };

    if (!hasCorsConfig || !allowsLocalhost || !allowsProduction) {
      report.issues.push("CORS configuration incomplete");
      report.fixes.push("Update server.js CORS options to allow localhost and api.mazaadati.com");
    }
  } catch (error) {
    console.log(`⚠️  Could not read server.js: ${error.message}`);
  }

  // ==================== 5. SUMMARY ====================
  console.log("\n" + "=".repeat(60));
  console.log("📊 DIAGNOSTIC SUMMARY");
  console.log("=".repeat(60));

  const totalIssues = report.issues.length;
  const criticalIssues = report.issues.filter(i => 
    i.includes("connection") || i.includes("DATABASE_URL") || i.includes("Missing tables")
  ).length;

  console.log(`\n✅ Status: ${totalIssues === 0 ? "PASSED ✅" : criticalIssues > 0 ? "FAILED ❌" : "WARNINGS ⚠️"}`);
  console.log(`   Total Issues: ${totalIssues}`);
  console.log(`   Critical Issues: ${criticalIssues}`);

  if (report.issues.length > 0) {
    console.log("\n❌ Issues Found:");
    report.issues.forEach((issue, i) => {
      console.log(`   ${i + 1}. ${issue}`);
    });

    console.log("\n🔧 Suggested Fixes:");
    report.fixes.forEach((fix, i) => {
      console.log(`   ${i + 1}. ${fix}`);
    });
  }

  // Save report
  const reportPath = path.join(process.cwd(), "logs");
  if (!fs.existsSync(reportPath)) {
    fs.mkdirSync(reportPath, { recursive: true });
  }

  const reportFile = path.join(reportPath, "system_integration_report.txt");
  const reportText = `
BidMaster System Integration Diagnostic Report
Generated: ${report.timestamp}

${"=".repeat(60)}
BACKEND STATUS
${"=".repeat(60)}
Database URL: ${report.backend.hasDatabaseUrl ? "✅ Set" : "❌ Missing"}
Database Format: ${report.backend.dbUrlValid ? "✅ Valid" : "❌ Invalid"}
Port: ${report.backend.port}
Environment: ${report.backend.nodeEnv}

${"=".repeat(60)}
DATABASE STATUS
${"=".repeat(60)}
Connected: ${report.database.connected ? "✅ Yes" : "❌ No"}
PostgreSQL Version: ${report.database.pgVersion || "N/A"}

Tables:
${report.database.tables?.existing.map(t => `  ✅ ${t}`).join("\n") || "  N/A"}
${report.database.tables?.missing.map(t => `  ❌ ${t}`).join("\n") || ""}

Products Table:
  Total: ${report.database.productCount?.total || 0}
  Approved: ${report.database.productCount?.approved || 0}
  Pending: ${report.database.productCount?.pending || 0}

Required Columns:
${report.database.productColumns?.existing.map(c => `  ✅ ${c}`).join("\n") || "  N/A"}
${report.database.productColumns?.missing.map(c => `  ❌ ${c}`).join("\n") || ""}

${"=".repeat(60)}
API ROUTES
${"=".repeat(60)}
${report.routes.map(r => `GET ${r.path}: ${r.status === 200 ? "✅ 200 OK" : `❌ ${r.status || "ERROR"}`}${r.productsFound ? ` (${r.productsFound} products)` : ""}`).join("\n") || "  No routes tested"}

${"=".repeat(60)}
CORS CONFIGURATION
${"=".repeat(60)}
CORS Configured: ${report.backend.cors?.configured ? "✅ Yes" : "❌ No"}
Allows localhost: ${report.backend.cors?.allowsLocalhost ? "✅ Yes" : "❌ No"}
Allows Production (api.mazaadati.com): ${report.backend.cors?.allowsProduction ? "✅ Yes" : "❌ No"}

${"=".repeat(60)}
ISSUES
${"=".repeat(60)}
${report.issues.length > 0 ? report.issues.map((issue, i) => `${i + 1}. ${issue}`).join("\n") : "✅ No issues found"}

${"=".repeat(60)}
SUGGESTED FIXES
${"=".repeat(60)}
${report.fixes.length > 0 ? report.fixes.map((fix, i) => `${i + 1}. ${fix}`).join("\n") : "✅ No fixes needed"}

${"=".repeat(60)}
FINAL STATUS
${"=".repeat(60)}
${totalIssues === 0 ? "System Integration: PASSED ✅" : criticalIssues > 0 ? "System Integration: FAILED ❌" : "System Integration: WARNINGS ⚠️"}
`;

  fs.writeFileSync(reportFile, reportText);
  console.log(`\n📄 Full report saved to: ${reportFile}`);

  // Close database connection
  await pool.end();

  return report;
}

// Run diagnostic
runDiagnostic()
  .then((report) => {
    console.log("\n✅ Diagnostic completed!");
    process.exit(report.issues.filter(i => 
      i.includes("connection") || i.includes("DATABASE_URL") || i.includes("Missing tables")
    ).length > 0 ? 1 : 0);
  })
  .catch((error) => {
    console.error("\n❌ Diagnostic failed:", error);
    process.exit(1);
  });

