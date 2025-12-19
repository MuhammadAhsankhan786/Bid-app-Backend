/**
 * Flutter App Register API Test Script
 * Tests register API on both local and live URLs
 */

import axios from 'axios';

// API URLs
const LOCAL_URL = 'http://localhost:5000/api';
const LIVE_URL = 'https://api.mazaadati.com/api';

// Test data
const generateTestData = () => {
  const timestamp = Date.now();
  const randomNum = Math.floor(Math.random() * 10000);
  
  return {
    name: `Test User ${timestamp}`,
    phone: `+964750${randomNum.toString().padStart(6, '0')}`,
    email: `test${timestamp}@example.com`,
    password: `Test@123${timestamp}`,
    role: 'company_products' // Valid role: 'company_products' or 'seller_products'
  };
};

// Test register API
async function testRegisterAPI(baseUrl, testData, testName) {
  const fullUrl = `${baseUrl}/auth/register`;
  
  console.log(`\n📋 ${testName}`);
  console.log(`   URL: ${fullUrl}`);
  console.log(`   Data: ${JSON.stringify({ ...testData, password: '***' }, null, 2)}`);
  
  try {
    const response = await axios.post(fullUrl, testData, {
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 15000, // 15 seconds timeout
    });
    
    console.log(`   ✅ SUCCESS (${response.status})`);
    console.log(`   Response: ${JSON.stringify({
      success: response.data?.success || true,
      message: response.data?.message || 'User registered',
      userId: response.data?.user?.id || response.data?.id,
      hasToken: !!(response.data?.accessToken || response.data?.token)
    }, null, 2)}`);
    
    return {
      success: true,
      status: response.status,
      data: response.data,
      error: null
    };
  } catch (error) {
    const status = error.response?.status || 'NETWORK_ERROR';
    const errorData = error.response?.data || error.message;
    
    console.log(`   ❌ FAILED (${status})`);
    console.log(`   Error: ${JSON.stringify(errorData, null, 2)}`);
    
    return {
      success: false,
      status: status,
      data: null,
      error: errorData
    };
  }
}

// Main test function
async function runTests() {
  console.log('🚀 Starting Register API Tests...\n');
  console.log(`📡 Local URL: ${LOCAL_URL}`);
  console.log(`🌐 Live URL: ${LIVE_URL}\n`);
  console.log('='.repeat(80));
  
  const results = {
    local: null,
    live: null,
    issues: []
  };
  
  // Generate test data
  const testData = generateTestData();
  
  // Test on LOCAL
  console.log('\n🔵 Testing LOCAL...');
  results.local = await testRegisterAPI(LOCAL_URL, testData, 'Test 1: Register on LOCAL');
  
  // Wait a bit before next test
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Generate new test data for live (to avoid duplicate phone number)
  const testDataLive = generateTestData();
  
  // Test on LIVE
  console.log('\n🟢 Testing LIVE...');
  results.live = await testRegisterAPI(LIVE_URL, testDataLive, 'Test 2: Register on LIVE');
  
  // Analyze results
  console.log('\n\n');
  console.log('='.repeat(80));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(80));
  
  console.log(`\n📈 Results:`);
  console.log(`   Local: ${results.local.success ? '✅ SUCCESS' : '❌ FAILED'} (${results.local.status})`);
  console.log(`   Live:  ${results.live.success ? '✅ SUCCESS' : '❌ FAILED'} (${results.live.status})`);
  
  // Check for issues
  if (results.local.success && !results.live.success) {
    results.issues.push({
      type: 'Local works but Live fails',
      localStatus: results.local.status,
      liveStatus: results.live.status,
      liveError: results.live.error
    });
    console.log(`\n⚠️  ISSUE DETECTED: Register API works on LOCAL but NOT on LIVE!`);
    console.log(`   Local Status: ${results.local.status} ✅`);
    console.log(`   Live Status: ${results.live.status} ❌`);
    if (results.live.error) {
      console.log(`   Live Error: ${JSON.stringify(results.live.error, null, 2)}`);
    }
  } else if (!results.local.success && results.live.success) {
    console.log(`\nℹ️  Note: Register API works on LIVE but NOT on LOCAL (may be expected if local backend is not running)`);
  } else if (results.local.success && results.live.success) {
    console.log(`\n✅ SUCCESS: Register API works on BOTH LOCAL and LIVE!`);
  } else {
    console.log(`\n❌ Both tests failed. Check backend servers and network connectivity.`);
  }
  
  // Detailed error analysis
  if (!results.local.success) {
    console.log(`\n📋 Local Error Details:`);
    console.log(`   Status: ${results.local.status}`);
    if (results.local.error) {
      console.log(`   Error: ${JSON.stringify(results.local.error, null, 2)}`);
    }
  }
  
  if (!results.live.success) {
    console.log(`\n📋 Live Error Details:`);
    console.log(`   Status: ${results.live.status}`);
    if (results.live.error) {
      console.log(`   Error: ${JSON.stringify(results.live.error, null, 2)}`);
    }
  }
  
  console.log('\n');
  console.log('='.repeat(80));
  console.log('Test Complete!');
  console.log('='.repeat(80));
}

// Run tests
runTests().catch(error => {
  console.error('❌ Test execution failed:', error);
  process.exit(1);
});

