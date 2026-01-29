import axios from "axios";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import pkg from "pg";

dotenv.config();
const { Client } = pkg;

// Get __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure logs directory exists
const logDir = path.join(__dirname, "..", "..", "logs");
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

const LOG_FILE = path.join(__dirname, "..", "..", "logs", "system_health_report.txt");

// Helper to log both console + file
function log(message) {
  const line = `[${new Date().toISOString()}] ${message}`;
  console.log(line);
  fs.appendFileSync(LOG_FILE, line + "\n");
}

async function checkDatabase() {
  try {
    const client = new Client({ connectionString: process.env.DATABASE_URL });
    await client.connect();
    const res = await client.query("SELECT NOW()");
    await client.end();
    log(`✅ Database Connected — Time: ${res.rows[0].now}`);
    return true;
  } catch (error) {
    log(`❌ Database Connection FAILED — ${error.message}`);
    return false;
  }
}

async function checkBackendAPI() {
  // Try localhost first, then production
  const urls = [
    { url: "http://localhost:5000/", label: "Local" },
    { url: "http://localhost:5000/api/products", label: "Local API" },
    { url: "https://api.mazaadati.com/", label: "Production" },
    { url: "https://api.mazaadati.com/api/products", label: "Production API" },
  ];

  for (const { url, label } of urls) {
    const start = Date.now();
    try {
      const response = await axios.get(url, { 
        timeout: 5000,
        validateStatus: (status) => status < 500 // Accept 200-499
      });
      const latency = Date.now() - start;
      
      if (url.endsWith('/api/products')) {
        // Check products endpoint
        if (response.status === 200 && response.data && (response.data.success || response.data.data)) {
          const productCount = response.data.data?.length || 0;
          log(`✅ Backend API Live — ${label} — ${url} — ${latency}ms`);
          log(`   Products: ${productCount}`);
          return true;
        }
      } else {
        // Check health endpoint
        if (response.status === 200) {
          log(`✅ Backend Health Check OK — ${label} — ${url} — ${latency}ms`);
          return true;
        }
      }
    } catch (error) {
      // Continue to next URL
      continue;
    }
  }
  
  log(`❌ Backend API FAILED — Tried ${urls.length} URLs, none responded`);
  log(`   Note: Backend may not be running. Start with: npm run dev`);
  return false;
}

async function checkFlutterIntegration() {
  // Try both local and production
  const urls = [
    "http://localhost:5000/api/products",
    "https://api.mazaadati.com/api/products",
  ];

  for (const url of urls) {
    try {
      const res = await axios.get(url, { 
        timeout: 5000,
        validateStatus: (status) => status < 500
      });
      
      if (res.status === 200 && res.data) {
        const data = res.data.data || res.data;
        if (Array.isArray(data)) {
          log(`✅ Flutter Integration OK — ${url} — Data structure valid (${data.length} products)`);
          return true;
        } else if (res.data.success && Array.isArray(res.data.data)) {
          log(`✅ Flutter Integration OK — ${url} — Data structure valid (${res.data.data.length} products)`);
          return true;
        }
      }
    } catch (err) {
      // Try next URL
      continue;
    }
  }
  
  log(`❌ Flutter Integration FAILED — API endpoint not reachable`);
  log(`   Checked: ${urls.join(", ")}`);
  return false;
}

async function checkAdminFrontend() {
  // Check admin dashboard endpoint
  const urls = [
    "http://localhost:5000/api/admin/dashboard",
    "https://api.mazaadati.com/api/admin/dashboard",
  ];

  for (const url of urls) {
    try {
      const res = await axios.get(url, { 
        timeout: 5000,
        validateStatus: (status) => status < 500
      });
      
      if (res.status === 200 || res.status === 401) {
        // 401 is OK - means endpoint exists but requires auth
        log(`✅ Admin Frontend API Endpoint Live — ${url}`);
        if (res.status === 401) {
          log(`   Note: Requires authentication (401 expected)`);
        }
        return true;
      }
    } catch (err) {
      if (err.response?.status === 401) {
        // 401 means endpoint exists, just needs auth
        log(`✅ Admin Frontend API Endpoint Live — ${url} (requires auth)`);
        return true;
      }
      // Try next URL
      continue;
    }
  }
  
  log(`❌ Admin Frontend FAILED — Admin endpoints not reachable`);
  log(`   Checked: ${urls.join(", ")}`);
  return false;
}

async function runHealthCheck() {
  log("\n============================================================");
  log("🩺 BidMaster System Health Check Started");
  log("============================================================");

  const results = {
    db: await checkDatabase(),
    backend: await checkBackendAPI(),
    flutter: await checkFlutterIntegration(),
    admin: await checkAdminFrontend(),
  };

  log("------------------------------------------------------------");
  log(`📊 FINAL SUMMARY:`);
  log(`   Database: ${results.db ? "✅ OK" : "❌ FAIL"}`);
  log(`   Backend: ${results.backend ? "✅ OK" : "❌ FAIL"}`);
  log(`   Flutter: ${results.flutter ? "✅ OK" : "❌ FAIL"}`);
  log(`   Admin: ${results.admin ? "✅ OK" : "❌ FAIL"}`);

  const overall =
    results.db && results.backend && results.flutter && results.admin
      ? "✅ SYSTEM HEALTH: PASSED"
      : "❌ SYSTEM HEALTH: ISSUES DETECTED";
  log(overall);
  log("============================================================\n");
}

// Run now
runHealthCheck();
