/**
 * Comprehensive API Testing Script
 * Tests ALL APIs from register to all admin/product/order APIs
 * Tests on both LOCAL and LIVE
 */

import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// API URLs
const LOCAL_URL = 'http://localhost:5000/api';
const LIVE_URL = 'https://api.mazaadati.com/api';

// Admin token
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6NTMsInBob25lIjoiKzk2NDc1MDA5MTQwMDAiLCJyb2xlIjoic3VwZXJhZG1pbiIsInNjb3BlIjoiYWRtaW4iLCJpYXQiOjE3NjYxNzIwNTMsImV4cCI6MTc2Njc3Njg1M30.zQItgDfi6jMB9n0vdk1dkOAxzSr21ksZBr3wC9aoCLQ';

// Test results
const results = {
  local: {},
  live: {},
  issues: []
};

// Helper to generate test data
const generateTestData = () => {
  const timestamp = Date.now();
  const randomNum = Math.floor(Math.random() * 10000);
  return {
    name: `Test User ${timestamp}`,
    phone: `+964750${randomNum.toString().padStart(6, '0')}`,
    email: `test${timestamp}@example.com`,
    password: `Test@123${timestamp}`,
    role: 'company_products'
  };
};

// Test API function
async function testAPI(baseUrl, api, testData = null) {
  let url = api.endpoint;
  
  // Replace placeholders
  if (api.needsId && url.includes(':id')) {
    url = url.replace(':id', api.testId || '1');
  }
  
  const fullUrl = `${baseUrl}${url}`;
  
  const config = {
    method: api.method,
    url: fullUrl,
    headers: {
      'Content-Type': 'application/json',
    },
    timeout: 15000,
  };
  
  // Add auth token
  if (api.requiresAuth && ADMIN_TOKEN) {
    config.headers.Authorization = `Bearer ${ADMIN_TOKEN}`;
  }
  
  // Add query params
  if (api.params) {
    config.params = api.params;
  }
  
  // Add body
  if (api.needsBody && testData) {
    config.data = testData;
  } else if (api.needsBody && api.testData) {
    config.data = api.testData;
  }
  
  try {
    const response = await axios(config);
    return {
      success: true,
      status: response.status,
      data: response.data,
      error: null
    };
  } catch (error) {
    return {
      success: false,
      status: error.response?.status || 'NETWORK_ERROR',
      data: null,
      error: error.response?.data || error.message
    };
  }
}

// All APIs to test
const ALL_APIS = [
  // ========== AUTH APIs ==========
  { method: 'POST', endpoint: '/auth/register', name: 'Register User', requiresAuth: false, needsBody: true, testData: () => generateTestData() },
  { method: 'POST', endpoint: '/auth/send-otp', name: 'Send OTP', requiresAuth: false, needsBody: true, testData: { phone: '+9647500914000' } },
  { method: 'POST', endpoint: '/auth/verify-otp', name: 'Verify OTP', requiresAuth: false, needsBody: true, testData: { phone: '+9647500914000', otp: '123456' } },
  { method: 'POST', endpoint: '/auth/login', name: 'Login', requiresAuth: false, needsBody: true, testData: { phone: '+9647500914000', password: 'test123' } },
  { method: 'POST', endpoint: '/auth/admin-login', name: 'Admin Login', requiresAuth: false, needsBody: true, testData: { phone: '+9647500914000', role: 'superadmin' } },
  
  // ========== DASHBOARD APIs ==========
  { method: 'GET', endpoint: '/admin/dashboard', name: 'Get Dashboard', requiresAuth: true },
  { method: 'GET', endpoint: '/admin/dashboard/charts', name: 'Get Dashboard Charts', requiresAuth: true, params: { period: 'week' } },
  { method: 'GET', endpoint: '/admin/dashboard/categories', name: 'Get Dashboard Categories', requiresAuth: true },
  
  // ========== USER APIs ==========
  { method: 'GET', endpoint: '/admin/users', name: 'Get Users', requiresAuth: true },
  { method: 'GET', endpoint: '/admin/users/:id', name: 'Get User By ID', requiresAuth: true, needsId: true, testId: '138' },
  { method: 'POST', endpoint: '/admin/users', name: 'Create User', requiresAuth: true, needsBody: true, testData: { name: 'Test User', email: 'test@example.com', phone: '+9647500914000', password: 'test123', role: 'company_products' } },
  { method: 'PUT', endpoint: '/admin/users/:id/role', name: 'Update User Role', requiresAuth: true, needsId: true, needsBody: true, testId: '138', testData: { role: 'moderator' } },
  
  // ========== PRODUCT APIs ==========
  { method: 'GET', endpoint: '/admin/products', name: 'Get Products', requiresAuth: true },
  { method: 'GET', endpoint: '/admin/products/pending', name: 'Get Pending Products', requiresAuth: true },
  { method: 'GET', endpoint: '/admin/products/live', name: 'Get Live Auctions', requiresAuth: true },
  { method: 'GET', endpoint: '/admin/products/rejected', name: 'Get Rejected Products', requiresAuth: true },
  { method: 'GET', endpoint: '/admin/products/completed', name: 'Get Completed Products', requiresAuth: true },
  { method: 'GET', endpoint: '/admin/products/:id', name: 'Get Product By ID', requiresAuth: true, needsId: true, testId: '1' },
  
  // ========== ORDER APIs ==========
  { method: 'GET', endpoint: '/admin/orders', name: 'Get Orders', requiresAuth: true },
  { method: 'GET', endpoint: '/admin/orders/stats', name: 'Get Order Stats', requiresAuth: true },
  
  // ========== ANALYTICS APIs ==========
  { method: 'GET', endpoint: '/admin/analytics/weekly', name: 'Get Weekly Analytics', requiresAuth: true },
  { method: 'GET', endpoint: '/admin/analytics/monthly', name: 'Get Monthly Analytics', requiresAuth: true },
  { method: 'GET', endpoint: '/admin/analytics/categories', name: 'Get Category Analytics', requiresAuth: true },
  { method: 'GET', endpoint: '/admin/analytics/top-products', name: 'Get Top Products', requiresAuth: true },
  
  // ========== AUCTION APIs ==========
  { method: 'GET', endpoint: '/admin/auctions/active', name: 'Get Active Auctions', requiresAuth: true },
  { method: 'GET', endpoint: '/admin/auctions/:id/bids', name: 'Get Auction Bids', requiresAuth: true, needsId: true, testId: '1' },
  
  // ========== NOTIFICATION APIs ==========
  { method: 'GET', endpoint: '/admin/notifications', name: 'Get Notifications', requiresAuth: true },
  
  // ========== PAYMENT APIs ==========
  { method: 'GET', endpoint: '/admin/payments', name: 'Get Payments', requiresAuth: true },
  
  // ========== REFERRAL APIs ==========
  { method: 'GET', endpoint: '/admin/referrals', name: 'Get Referrals', requiresAuth: true },
  { method: 'GET', endpoint: '/admin/referral/settings', name: 'Get Referral Settings', requiresAuth: true },
  
  // ========== WALLET APIs ==========
  { method: 'GET', endpoint: '/admin/wallet/logs', name: 'Get Wallet Logs', requiresAuth: true },
  
  // ========== BANNER APIs ==========
  { method: 'GET', endpoint: '/banners', name: 'Get Banners', requiresAuth: false },
];

// Main test function
async function runAllTests() {
  console.log('🚀 Starting Comprehensive API Tests...\n');
  console.log(`📡 Local URL: ${LOCAL_URL}`);
  console.log(`🌐 Live URL: ${LIVE_URL}`);
  console.log(`📊 Total APIs to test: ${ALL_APIS.length}\n`);
  console.log('='.repeat(80));
  
  for (const api of ALL_APIS) {
    console.log(`\n📋 Testing: ${api.name}`);
    console.log(`   ${api.method} ${api.endpoint}`);
    
    // Prepare test data
    let testData = null;
    if (api.needsBody) {
      if (typeof api.testData === 'function') {
        testData = api.testData();
      } else {
        testData = api.testData;
      }
    }
    
    // Test on LOCAL
    console.log('   🔵 Testing LOCAL...');
    const localResult = await testAPI(LOCAL_URL, api, testData);
    results.local[api.endpoint] = localResult;
    
    if (localResult.success) {
      console.log(`   ✅ LOCAL: Success (${localResult.status})`);
    } else {
      console.log(`   ❌ LOCAL: Failed (${localResult.status})`);
      if (localResult.error && typeof localResult.error === 'object') {
        const errorMsg = JSON.stringify(localResult.error).substring(0, 150);
        console.log(`      Error: ${errorMsg}...`);
      }
    }
    
    // Wait a bit
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Test on LIVE
    console.log('   🟢 Testing LIVE...');
    const liveResult = await testAPI(LIVE_URL, api, testData);
    results.live[api.endpoint] = liveResult;
    
    if (liveResult.success) {
      console.log(`   ✅ LIVE: Success (${liveResult.status})`);
    } else {
      console.log(`   ❌ LIVE: Failed (${liveResult.status})`);
      if (liveResult.error && typeof liveResult.error === 'object') {
        const errorMsg = JSON.stringify(liveResult.error).substring(0, 150);
        console.log(`      Error: ${errorMsg}...`);
      }
    }
    
    // Check for issues
    if (localResult.success && !liveResult.success) {
      results.issues.push({
        api: api.name,
        endpoint: api.endpoint,
        method: api.method,
        localStatus: localResult.status,
        liveStatus: liveResult.status,
        liveError: liveResult.error
      });
      console.log(`   ⚠️  ISSUE: Works on LOCAL but NOT on LIVE!`);
    }
    
    // Wait between APIs
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  
  // Generate report
  generateReport();
}

// Generate report
function generateReport() {
  console.log('\n\n');
  console.log('='.repeat(80));
  console.log('📊 COMPREHENSIVE TEST SUMMARY');
  console.log('='.repeat(80));
  
  const localSuccess = Object.values(results.local).filter(r => r.success).length;
  const localTotal = Object.keys(results.local).length;
  const liveSuccess = Object.values(results.live).filter(r => r.success).length;
  const liveTotal = Object.keys(results.live).length;
  
  console.log(`\n📈 Statistics:`);
  console.log(`   Local:  ${localSuccess}/${localTotal} APIs working (${((localSuccess/localTotal)*100).toFixed(1)}%)`);
  console.log(`   Live:   ${liveSuccess}/${liveTotal} APIs working (${((liveSuccess/liveTotal)*100).toFixed(1)}%)`);
  
  if (results.issues.length > 0) {
    console.log(`\n⚠️  CRITICAL ISSUES: ${results.issues.length} APIs work on LOCAL but NOT on LIVE\n`);
    console.log('='.repeat(80));
    console.log('🔴 APIs THAT NEED FIXING ON LIVE:');
    console.log('='.repeat(80));
    
    results.issues.forEach((issue, index) => {
      console.log(`\n${index + 1}. ${issue.api}`);
      console.log(`   Endpoint: ${issue.method} ${issue.endpoint}`);
      console.log(`   Local: ✅ ${issue.localStatus} | Live: ❌ ${issue.liveStatus}`);
      if (issue.liveError) {
        const errorMsg = typeof issue.liveError === 'object' 
          ? JSON.stringify(issue.liveError).substring(0, 200)
          : issue.liveError;
        console.log(`   Error: ${errorMsg}`);
      }
    });
  } else {
    console.log(`\n✅ No issues found! All APIs that work on LOCAL also work on LIVE.`);
  }
  
  // Detailed breakdown by category
  console.log('\n\n');
  console.log('='.repeat(80));
  console.log('📋 DETAILED BREAKDOWN BY CATEGORY');
  console.log('='.repeat(80));
  
  const categories = {
    'Auth APIs': ALL_APIS.filter(a => a.endpoint.startsWith('/auth')),
    'Dashboard APIs': ALL_APIS.filter(a => a.endpoint.includes('/dashboard')),
    'User APIs': ALL_APIS.filter(a => a.endpoint.includes('/users')),
    'Product APIs': ALL_APIS.filter(a => a.endpoint.includes('/products')),
    'Order APIs': ALL_APIS.filter(a => a.endpoint.includes('/orders')),
    'Analytics APIs': ALL_APIS.filter(a => a.endpoint.includes('/analytics')),
    'Auction APIs': ALL_APIS.filter(a => a.endpoint.includes('/auctions')),
    'Other APIs': ALL_APIS.filter(a => 
      !a.endpoint.startsWith('/auth') && 
      !a.endpoint.includes('/dashboard') &&
      !a.endpoint.includes('/users') &&
      !a.endpoint.includes('/products') &&
      !a.endpoint.includes('/orders') &&
      !a.endpoint.includes('/analytics') &&
      !a.endpoint.includes('/auctions')
    )
  };
  
  Object.entries(categories).forEach(([category, apis]) => {
    if (apis.length === 0) return;
    
    const localCatSuccess = apis.filter(a => results.local[a.endpoint]?.success).length;
    const liveCatSuccess = apis.filter(a => results.live[a.endpoint]?.success).length;
    
    console.log(`\n${category}:`);
    console.log(`   Local: ${localCatSuccess}/${apis.length} working`);
    console.log(`   Live:  ${liveCatSuccess}/${apis.length} working`);
  });
  
  // Save report to file
  try {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    const reportPath = path.join(__dirname, 'COMPREHENSIVE_API_TEST_REPORT.md');
    
    const reportContent = generateMarkdownReport();
    fs.writeFileSync(reportPath, reportContent, 'utf8');
    console.log(`\n\n📄 Detailed report saved to: ${reportPath}`);
  } catch (error) {
    console.error('⚠️  Could not save report file:', error.message);
  }
}

// Generate markdown report
function generateMarkdownReport() {
  const timestamp = new Date().toISOString();
  let report = `# Comprehensive API Test Report\n\n`;
  report += `**Generated:** ${timestamp}\n\n`;
  report += `**Local URL:** ${LOCAL_URL}\n`;
  report += `**Live URL:** ${LIVE_URL}\n\n`;
  
  const localSuccess = Object.values(results.local).filter(r => r.success).length;
  const localTotal = Object.keys(results.local).length;
  const liveSuccess = Object.values(results.live).filter(r => r.success).length;
  const liveTotal = Object.keys(results.live).length;
  
  report += `## Summary\n\n`;
  report += `- **Local APIs Working:** ${localSuccess}/${localTotal} (${((localSuccess/localTotal)*100).toFixed(1)}%)\n`;
  report += `- **Live APIs Working:** ${liveSuccess}/${liveTotal} (${((liveSuccess/liveTotal)*100).toFixed(1)}%)\n`;
  report += `- **Issues Found:** ${results.issues.length}\n\n`;
  
  if (results.issues.length > 0) {
    report += `## ⚠️ Critical Issues\n\n`;
    report += `The following APIs work on LOCAL but NOT on LIVE:\n\n`;
    
    results.issues.forEach((issue, index) => {
      report += `### ${index + 1}. ${issue.api}\n\n`;
      report += `- **Endpoint:** \`${issue.method} ${issue.endpoint}\`\n`;
      report += `- **Local Status:** ✅ ${issue.localStatus}\n`;
      report += `- **Live Status:** ❌ ${issue.liveStatus}\n`;
      if (issue.liveError) {
        const errorMsg = typeof issue.liveError === 'object' 
          ? JSON.stringify(issue.liveError, null, 2)
          : issue.liveError;
        report += `- **Error:** \`\`\`json\n${errorMsg}\n\`\`\`\n`;
      }
      report += `\n`;
    });
  }
  
  report += `## Detailed API Status\n\n`;
  report += `| API Name | Method | Endpoint | Local | Live | Status |\n`;
  report += `|----------|--------|----------|-------|------|--------|\n`;
  
  ALL_APIS.forEach(api => {
    const local = results.local[api.endpoint];
    const live = results.live[api.endpoint];
    
    const localStatus = local?.success ? '✅' : '❌';
    const liveStatus = live?.success ? '✅' : '❌';
    const status = local?.success && live?.success ? '✅ Both' 
                  : local?.success && !live?.success ? '⚠️ Local Only'
                  : !local?.success && live?.success ? 'ℹ️ Live Only'
                  : '❌ Both Failed';
    
    report += `| ${api.name} | ${api.method} | ${api.endpoint} | ${localStatus} | ${liveStatus} | ${status} |\n`;
  });
  
  return report;
}

// Run tests
runAllTests().catch(error => {
  console.error('❌ Test execution failed:', error);
  process.exit(1);
});

