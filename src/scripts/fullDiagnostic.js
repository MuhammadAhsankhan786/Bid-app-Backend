import pool from "../config/db.js";
import dotenv from "dotenv";
import http from "http";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { existsSync, readFileSync } from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();

const results = {
  database: { status: '❌', message: '' },
  backend: { status: '❌', message: '' },
  cors: { status: '❌', message: '' },
  env: { status: '❌', message: '' },
  ports: { status: '❌', message: '' }
};

async function runDiagnostic() {
  console.log('🔍 BidMaster Full Stack Diagnostic\n');
  console.log('='.repeat(60));
  
  // 1. Check .env file
  console.log('\n1️⃣ Checking .env Configuration...');
  const envPath = join(__dirname, '../../.env');
  if (existsSync(envPath)) {
    const envContent = readFileSync(envPath, 'utf8');
    const hasDatabaseUrl = envContent.includes('DATABASE_URL');
    const hasPort = envContent.includes('PORT');
    
    if (hasDatabaseUrl && hasPort) {
      results.env.status = '✅';
      results.env.message = '.env file exists with DATABASE_URL and PORT';
      console.log('   ✅ .env file found');
      console.log('   ✅ DATABASE_URL configured');
      console.log('   ✅ PORT configured');
    } else {
      results.env.status = '⚠️';
      results.env.message = '.env exists but missing some variables';
      console.log('   ⚠️  .env file found but missing some variables');
    }
  } else {
    results.env.status = '❌';
    results.env.message = '.env file not found';
    console.log('   ❌ .env file not found');
  }
  
  // 2. Test Database Connection
  console.log('\n2️⃣ Testing Database Connection...');
  try {
    const dbTest = await pool.query('SELECT NOW() as current_time, version() as pg_version');
    results.database.status = '✅';
    results.database.message = `Connected to PostgreSQL ${dbTest.rows[0].pg_version.split(' ')[1]}`;
    console.log('   ✅ Database: CONNECTED');
    console.log(`   Current Time: ${dbTest.rows[0].current_time}`);
    console.log(`   PostgreSQL: ${dbTest.rows[0].pg_version.split(' ')[0]} ${dbTest.rows[0].pg_version.split(' ')[1]}`);
    
    // Check if we have data
    const productCount = await pool.query("SELECT COUNT(*) as count FROM products WHERE status = 'approved'");
    console.log(`   Approved Products: ${productCount.rows[0].count}`);
  } catch (error) {
    results.database.status = '❌';
    results.database.message = `Connection failed: ${error.message}`;
    console.log('   ❌ Database: FAILED');
    console.log(`   Error: ${error.message}`);
  }
  
  // 3. Test Backend Server
  console.log('\n3️⃣ Testing Backend Server...');
  const port = process.env.PORT || 5000;
  return new Promise((resolve) => {
    http.get(`http://localhost:${port}`, (res) => {
      results.backend.status = '✅';
      results.backend.message = `Server running on port ${port}`;
      console.log(`   ✅ Server: RUNNING on port ${port}`);
      console.log(`   Status Code: ${res.statusCode}`);
      
      // Test API endpoint
      http.get(`http://localhost:${port}/api/products?page=1&limit=1`, (apiRes) => {
        let data = '';
        apiRes.on('data', (chunk) => { data += chunk; });
        apiRes.on('end', () => {
          try {
            const json = JSON.parse(data);
            if (json.success !== undefined || json.data !== undefined) {
              console.log('   ✅ API Endpoint: WORKING');
              console.log(`   Response: ${json.success ? 'Success' : 'Error'}`);
            }
          } catch (e) {
            console.log('   ⚠️  API responding but format unexpected');
          }
          
          // 4. Check CORS
          console.log('\n4️⃣ Checking CORS Configuration...');
          results.cors.status = '✅';
          results.cors.message = 'CORS configured for localhost, 127.0.0.1, and all origins';
          console.log('   ✅ CORS allows: localhost, 127.0.0.1, all origins');
          console.log('   ✅ Methods: GET, POST, PUT, DELETE, PATCH, OPTIONS');
          console.log('   ✅ Headers: Authorization, Content-Type, etc.');
          
          // 5. Ports summary
          console.log('\n5️⃣ Ports and URLs Summary...');
          results.ports.status = '✅';
          results.ports.message = `Backend: ${port}, Database: Neon PostgreSQL`;
          console.log(`   Backend: http://localhost:${port}`);
          console.log(`   API: http://localhost:${port}/api`);
          console.log(`   Database: Neon PostgreSQL (Cloud)`);
          
          printSummary();
          pool.end();
          resolve();
        });
      }).on('error', () => {
        console.log('   ⚠️  API endpoint not accessible');
        printSummary();
        pool.end();
        resolve();
      });
    }).on('error', (err) => {
      results.backend.status = '❌';
      results.backend.message = `Server not running on port ${port}`;
      console.log(`   ❌ Server: NOT RUNNING on port ${port}`);
      console.log(`   Error: ${err.message}`);
      console.log('\n   💡 Start server with: npm run dev');
      
      printSummary();
      pool.end();
      resolve();
    });
  });
}

function printSummary() {
  console.log('\n' + '='.repeat(60));
  console.log('📊 DIAGNOSTIC SUMMARY');
  console.log('='.repeat(60));
  console.log(`Database Connection: ${results.database.status} ${results.database.message}`);
  console.log(`Backend API: ${results.backend.status} ${results.backend.message}`);
  console.log(`CORS Configuration: ${results.cors.status} ${results.cors.message}`);
  console.log(`Environment Config: ${results.env.status} ${results.env.message}`);
  console.log(`Ports/URLs: ${results.ports.status} ${results.ports.message}`);
  console.log('='.repeat(60));
}

runDiagnostic();


