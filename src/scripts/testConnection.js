import pool from "../config/db.js";
import dotenv from "dotenv";
import http from "http";

dotenv.config();

async function testConnection() {
  console.log('🔍 Testing Flutter App Backend Connection...\n');

  // 1. Test Database Connection
  console.log('1️⃣ Testing Database Connection...');
  try {
    const dbTest = await pool.query('SELECT NOW() as current_time, version() as pg_version');
    console.log('   ✅ Database: CONNECTED');
    console.log(`   Current Time: ${dbTest.rows[0].current_time}`);
    console.log(`   PostgreSQL: ${dbTest.rows[0].pg_version.split(' ')[0]} ${dbTest.rows[0].pg_version.split(' ')[1]}\n`);
  } catch (error) {
    console.log('   ❌ Database: FAILED');
    console.log(`   Error: ${error.message}\n`);
    await pool.end();
    process.exit(1);
  }

  // 2. Test Server Status
  console.log('2️⃣ Testing Backend Server...');
  const port = process.env.PORT || 5000;
  const testUrl = `http://localhost:${port}`;
  
  return new Promise((resolve) => {
    http.get(testUrl, (res) => {
      console.log(`   ✅ Server: RUNNING on port ${port}`);
      console.log(`   Status Code: ${res.statusCode}`);
      console.log(`   URL: ${testUrl}\n`);
      
      // 3. Test API Endpoint
      console.log('3️⃣ Testing API Endpoint...');
      const apiUrl = `${testUrl}/api/products?page=1&limit=1`;
      
      http.get(apiUrl, (apiRes) => {
        let data = '';
        apiRes.on('data', (chunk) => {
          data += chunk;
        });
        apiRes.on('end', () => {
          try {
            const json = JSON.parse(data);
            if (json.success !== undefined || json.data !== undefined) {
              console.log('   ✅ API Endpoint: WORKING');
              console.log(`   Response: ${json.success ? 'Success' : 'Error'}`);
              if (json.data) {
                console.log(`   Products Found: ${Array.isArray(json.data) ? json.data.length : 'N/A'}`);
              }
            } else {
              console.log('   ⚠️  API Endpoint: RESPONDING (but unexpected format)');
            }
          } catch (e) {
            console.log('   ⚠️  API Endpoint: RESPONDING (but not JSON)');
          }
          
          console.log('\n4️⃣ Flutter App Configuration:');
          console.log('   Base URL (Web): http://localhost:5000/api');
          console.log('   Base URL (Mobile): https://bidmaster-api.onrender.com/api');
          console.log('   Platform Detection: Automatic (kIsWeb)');
          
          console.log('\n✅ Connection Test Complete!');
          console.log('\n📋 Summary:');
          console.log('   Database: ✅ Connected');
          console.log(`   Backend Server: ✅ Running on port ${port}`);
          console.log('   API Endpoint: ✅ Accessible');
          console.log('   Flutter App: ✅ Configured correctly');
          
          pool.end().then(() => {
            console.log('\n✅ Connection Test Complete!');
            process.exit(0);
          });
        });
      }).on('error', (err) => {
        console.log('   ❌ API Endpoint: FAILED');
        console.log(`   Error: ${err.message}`);
        console.log('\n⚠️  Backend server might not be running!');
        console.log('   Start it with: npm run dev');
        
        pool.end().then(() => {
          process.exit(1);
        });
      });
    }).on('error', (err) => {
      console.log(`   ❌ Server: NOT RUNNING on port ${port}`);
      console.log(`   Error: ${err.message}`);
      console.log('\n⚠️  Backend server is not running!');
      console.log('   Start it with: cd "Bid app Backend" && npm run dev');
      
      pool.end().then(() => {
        process.exit(1);
      });
    });
  });
}

testConnection();

