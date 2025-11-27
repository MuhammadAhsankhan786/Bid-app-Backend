/**
 * Network Connectivity Test Script
 * 
 * Tests if the API server is accessible and responding correctly.
 * 
 * Usage: node src/scripts/testNetworkConnectivity.js [baseUrl]
 * Example: node src/scripts/testNetworkConnectivity.js http://192.168.2.15:5000
 */

import axios from 'axios';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = join(__dirname, '../../.env');
dotenv.config({ path: envPath });

const BASE_URL = process.argv[2] || process.env.API_BASE_URL || 'http://localhost:5000';
const API_URL = `${BASE_URL}/api`;

console.log('🌐 Network Connectivity Test\n');
console.log('=' .repeat(50));
console.log(`\n📡 Testing connectivity to: ${API_URL}\n`);

// Test endpoints
const tests = [
  {
    name: 'Health Check (if available)',
    method: 'GET',
    url: `${BASE_URL}/health`,
    optional: true,
  },
  {
    name: 'Send OTP Endpoint',
    method: 'POST',
    url: `${API_URL}/auth/send-otp`,
    data: { phone: '+9647700914000' },
  },
];

let passed = 0;
let failed = 0;

for (const test of tests) {
  try {
    console.log(`🧪 Testing: ${test.name}`);
    console.log(`   ${test.method} ${test.url}`);
    
    const config = {
      method: test.method,
      url: test.url,
      timeout: 5000,
      validateStatus: () => true, // Don't throw on any status
    };
    
    if (test.data) {
      config.data = test.data;
      config.headers = { 'Content-Type': 'application/json' };
    }
    
    const response = await axios(config);
    
    if (response.status >= 200 && response.status < 500) {
      console.log(`   ✅ Status: ${response.status}`);
      if (response.data) {
        console.log(`   📦 Response: ${JSON.stringify(response.data).substring(0, 100)}...`);
      }
      passed++;
    } else {
      console.log(`   ⚠️  Status: ${response.status}`);
      if (response.data) {
        console.log(`   📦 Response: ${JSON.stringify(response.data)}`);
      }
      if (test.optional) {
        console.log(`   ℹ️  (Optional endpoint - failure is OK)`);
      } else {
        failed++;
      }
    }
  } catch (error) {
    if (test.optional) {
      console.log(`   ℹ️  (Optional endpoint - not available)`);
    } else {
      console.log(`   ❌ Error: ${error.message}`);
      if (error.code === 'ECONNREFUSED') {
        console.log(`   💡 Server is not running or not accessible at ${BASE_URL}`);
        console.log(`   💡 Make sure the backend server is running: npm start`);
      } else if (error.code === 'ENOTFOUND') {
        console.log(`   💡 Hostname not found. Check your URL/IP address.`);
      } else if (error.code === 'ETIMEDOUT') {
        console.log(`   💡 Connection timeout. Check firewall settings.`);
      }
      failed++;
    }
  }
  console.log('');
}

// Summary
console.log('=' .repeat(50));
console.log('\n📊 Test Summary:');
console.log(`   ✅ Passed: ${passed}`);
console.log(`   ❌ Failed: ${failed}`);

if (failed === 0) {
  console.log('\n✅ All connectivity tests passed!');
  console.log('\n💡 For Flutter app, use this URL:');
  console.log(`   flutter run --dart-define=API_BASE_URL=${API_URL}`);
} else {
  console.log('\n❌ Some tests failed. Please check:');
  console.log('   1. Backend server is running (npm start)');
  console.log('   2. Server is accessible from this machine');
  console.log('   3. Firewall is not blocking connections');
  console.log('   4. URL/IP address is correct');
  process.exit(1);
}

