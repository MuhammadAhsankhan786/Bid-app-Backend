/**
 * Banner API Test Script
 * Tests all CRUD operations for banner endpoints
 * 
 * Usage: node src/scripts/test_banner_api.js
 */

import fetch from 'node-fetch';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '../../.env') });

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:5000';
const API_URL = `${BASE_URL}/api/banners`;

// Test configuration
const TEST_CONFIG = {
  adminToken: process.env.ADMIN_TOKEN || '', // Set this in .env or pass as argument
  testImageUrl: 'https://images.unsplash.com/photo-1606761568499-6d45d7a523c5?w=1920&h=600&fit=crop&q=100&auto=format',
};

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

// Test results
const results = {
  passed: 0,
  failed: 0,
  tests: [],
};

function recordTest(name, passed, message) {
  results.tests.push({ name, passed, message });
  if (passed) {
    results.passed++;
    logSuccess(`${name}: ${message}`);
  } else {
    results.failed++;
    logError(`${name}: ${message}`);
  }
}

// Test functions
async function testGetAllBanners() {
  try {
    logInfo('\n📋 Testing GET /api/banners (Public)');
    const response = await fetch(API_URL);
    const data = await response.json();
    
    if (response.ok && data.success) {
      recordTest('GET /api/banners', true, `Found ${data.data?.length || 0} banners`);
      return data.data || [];
    } else {
      recordTest('GET /api/banners', false, data.message || 'Failed');
      return [];
    }
  } catch (error) {
    recordTest('GET /api/banners', false, error.message);
    return [];
  }
}

async function testGetBannerById(bannerId) {
  try {
    logInfo(`\n📋 Testing GET /api/banners/${bannerId}`);
    const response = await fetch(`${API_URL}/${bannerId}`);
    const data = await response.json();
    
    if (response.ok && data.success) {
      recordTest(`GET /api/banners/${bannerId}`, true, 'Banner found');
      return data.data;
    } else {
      recordTest(`GET /api/banners/${bannerId}`, false, data.message || 'Failed');
      return null;
    }
  } catch (error) {
    recordTest(`GET /api/banners/${bannerId}`, false, error.message);
    return null;
  }
}

async function testCreateBanner() {
  if (!TEST_CONFIG.adminToken) {
    logWarning('Skipping CREATE test - ADMIN_TOKEN not set');
    return null;
  }

  try {
    logInfo('\n📋 Testing POST /api/banners (Admin only)');
    const bannerData = {
      imageUrl: TEST_CONFIG.testImageUrl,
      title: 'Test Banner',
      link: '/products?category=test',
      displayOrder: 999,
      isActive: true,
    };

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TEST_CONFIG.adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(bannerData),
    });

    const data = await response.json();
    
    if (response.ok && data.success) {
      recordTest('POST /api/banners', true, `Banner created with ID: ${data.data?.id}`);
      return data.data;
    } else {
      recordTest('POST /api/banners', false, data.message || 'Failed');
      if (response.status === 401 || response.status === 403) {
        logWarning('Make sure ADMIN_TOKEN is valid and user has admin role');
      }
      return null;
    }
  } catch (error) {
    recordTest('POST /api/banners', false, error.message);
    return null;
  }
}

async function testUpdateBanner(bannerId) {
  if (!TEST_CONFIG.adminToken) {
    logWarning('Skipping UPDATE test - ADMIN_TOKEN not set');
    return null;
  }

  try {
    logInfo(`\n📋 Testing PUT /api/banners/${bannerId} (Admin only)`);
    const updateData = {
      title: 'Updated Test Banner',
      isActive: true,
      displayOrder: 998,
    };

    const response = await fetch(`${API_URL}/${bannerId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${TEST_CONFIG.adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updateData),
    });

    const data = await response.json();
    
    if (response.ok && data.success) {
      recordTest(`PUT /api/banners/${bannerId}`, true, 'Banner updated successfully');
      return data.data;
    } else {
      recordTest(`PUT /api/banners/${bannerId}`, false, data.message || 'Failed');
      return null;
    }
  } catch (error) {
    recordTest(`PUT /api/banners/${bannerId}`, false, error.message);
    return null;
  }
}

async function testDeleteBanner(bannerId) {
  if (!TEST_CONFIG.adminToken) {
    logWarning('Skipping DELETE test - ADMIN_TOKEN not set');
    return null;
  }

  try {
    logInfo(`\n📋 Testing DELETE /api/banners/${bannerId} (Admin only)`);
    const response = await fetch(`${API_URL}/${bannerId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${TEST_CONFIG.adminToken}`,
      },
    });

    const data = await response.json();
    
    if (response.ok && data.success) {
      recordTest(`DELETE /api/banners/${bannerId}`, true, 'Banner deleted successfully');
      return true;
    } else {
      recordTest(`DELETE /api/banners/${bannerId}`, false, data.message || 'Failed');
      return false;
    }
  } catch (error) {
    recordTest(`DELETE /api/banners/${bannerId}`, false, error.message);
    return false;
  }
}

// Main test runner
async function runTests() {
  log('\n🚀 Starting Banner API Tests...', 'cyan');
  log(`   Base URL: ${BASE_URL}`, 'cyan');
  log(`   API URL: ${API_URL}`, 'cyan');
  
  if (!TEST_CONFIG.adminToken) {
    logWarning('\n⚠️  ADMIN_TOKEN not set - CRUD tests will be skipped');
    logInfo('   Set ADMIN_TOKEN in .env file or pass as environment variable');
  }

  // Test 1: Get all banners (Public)
  const banners = await testGetAllBanners();

  // Test 2: Get single banner (if any exist)
  if (banners.length > 0) {
    await testGetBannerById(banners[0].id);
  } else {
    logWarning('No banners found - skipping GET by ID test');
  }

  // Test 3: Create banner (Admin only)
  const newBanner = await testCreateBanner();

  // Test 4: Update banner (if created)
  if (newBanner) {
    await testUpdateBanner(newBanner.id);
    
    // Test 5: Get updated banner
    await testGetBannerById(newBanner.id);
    
    // Test 6: Delete banner (cleanup)
    await testDeleteBanner(newBanner.id);
  }

  // Print summary
  log('\n' + '='.repeat(50), 'cyan');
  log('📊 Test Summary', 'cyan');
  log('='.repeat(50), 'cyan');
  log(`✅ Passed: ${results.passed}`, 'green');
  log(`❌ Failed: ${results.failed}`, 'red');
  log(`📝 Total: ${results.tests.length}`, 'blue');
  
  if (results.failed === 0) {
    log('\n🎉 All tests passed!', 'green');
  } else {
    log('\n⚠️  Some tests failed. Check the errors above.', 'yellow');
  }
  
  log('='.repeat(50) + '\n', 'cyan');
}

// Run tests
runTests().catch((error) => {
  logError(`\n💥 Test runner crashed: ${error.message}`);
  console.error(error);
  process.exit(1);
});

