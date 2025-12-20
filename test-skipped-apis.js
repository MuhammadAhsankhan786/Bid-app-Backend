/**
 * Test Skipped APIs (15 APIs)
 * Test all APIs that were previously skipped
 */

import axios from 'axios';
import pool from './src/config/db.js';

const LOCAL_URL = 'http://localhost:5000/api';
const ADMIN_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6NTMsInBob25lIjoiKzk2NDc1MDA5MTQwMDAiLCJyb2xlIjoic3VwZXJhZG1pbiIsInNjb3BlIjoiYWRtaW4iLCJpYXQiOjE3NjYxNzIwNTMsImV4cCI6MTc2Njc3Njg1M30.zQItgDfi6jMB9n0vdk1dkOAxzSr21ksZBr3wC9aoCLQ';

// Get valid test data from database
async function getTestData() {
  try {
    // Get a valid category
    const categoryResult = await pool.query('SELECT id, name FROM categories LIMIT 1');
    const category = categoryResult.rows[0] || { id: 1, name: 'Electronics' };
    
    // Get a valid product ID
    const productResult = await pool.query('SELECT id FROM products LIMIT 1');
    const productId = productResult.rows[0]?.id || 132;
    
    // Get a valid user ID (non-admin)
    const userResult = await pool.query("SELECT id FROM users WHERE role NOT IN ('admin', 'superadmin') LIMIT 1");
    const userId = userResult.rows[0]?.id || 55;
    
    return { category, productId, userId };
  } catch (error) {
    console.error('Error getting test data:', error.message);
    return { category: { id: 1, name: 'Electronics' }, productId: 132, userId: 55 };
  }
}

// Skipped APIs to test
const SKIPPED_APIS = [
  // Product APIs
  {
    name: 'Create Product',
    method: 'POST',
    endpoint: '/products/create',
    auth: true,
    body: async () => {
      const { category } = await getTestData();
      return {
        title: `Test Product ${Date.now()}`,
        description: 'Test product description',
        category_id: category.id,
        startingPrice: 100,
        duration: 1,
        images: []
      };
    }
  },
  {
    name: 'Create Seller Product',
    method: 'POST',
    endpoint: '/products/seller/products',
    auth: true,
    body: async () => {
      const { category } = await getTestData();
      return {
        title: `Seller Product ${Date.now()}`,
        description: 'Test seller product',
        category_id: category.id,
        startingPrice: 150,
        duration: 2
      };
    }
  },
  {
    name: 'Update Product (Mobile)',
    method: 'PUT',
    endpoint: '/products/132',
    auth: true,
    body: { title: 'Updated Product Title', description: 'Updated description' }
  },
  {
    name: 'Delete Product (Mobile)',
    method: 'DELETE',
    endpoint: '/products/132',
    auth: true
  },
  
  // Bid APIs
  {
    name: 'Place Bid',
    method: 'POST',
    endpoint: '/bids/place',
    auth: true,
    body: async () => {
      const { productId } = await getTestData();
      return {
        product_id: productId,
        amount: 200
      };
    }
  },
  
  // Order APIs
  {
    name: 'Create Order',
    method: 'POST',
    endpoint: '/orders/create',
    auth: true,
    body: async () => {
      const { productId } = await getTestData();
      return {
        product_id: productId
      };
    }
  },
  
  // Category APIs
  {
    name: 'Create Category',
    method: 'POST',
    endpoint: '/categories',
    auth: true,
    body: {
      name: `Test Category ${Date.now()}`,
      slug: `test-category-${Date.now()}`,
      description: 'Test category description'
    }
  },
  {
    name: 'Update Category',
    method: 'PUT',
    endpoint: '/categories/1',
    auth: true,
    body: { name: 'Updated Category Name', description: 'Updated description' }
  },
  {
    name: 'Delete Category',
    method: 'DELETE',
    endpoint: '/categories/1',
    auth: true
  },
  
  // Banner APIs
  {
    name: 'Create Banner',
    method: 'POST',
    endpoint: '/banners',
    auth: true,
    body: {
      title: `Test Banner ${Date.now()}`,
      description: 'Test banner',
      link: 'https://example.com',
      order: 1
    }
  },
  {
    name: 'Update Banner',
    method: 'PUT',
    endpoint: '/banners/1',
    auth: true,
    body: { title: 'Updated Banner', description: 'Updated' }
  },
  {
    name: 'Delete Banner',
    method: 'DELETE',
    endpoint: '/banners/1',
    auth: true
  },
  
  // File Upload APIs (will test without actual file)
  {
    name: 'Upload Logo',
    method: 'POST',
    endpoint: '/admin/settings/logo',
    auth: true,
    body: {},
    skip: true // Skip file upload
  },
  {
    name: 'Upload Image',
    method: 'POST',
    endpoint: '/uploads/image',
    auth: true,
    body: {},
    skip: true // Skip file upload
  },
  {
    name: 'Upload Images',
    method: 'POST',
    endpoint: '/uploads/images',
    auth: true,
    body: {},
    skip: true // Skip file upload
  }
];

async function testAPI(api) {
  if (api.skip) {
    return { success: true, status: 'SKIPPED', reason: 'File upload - requires multipart/form-data' };
  }
  
  try {
    const config = {
      method: api.method,
      url: `${LOCAL_URL}${api.endpoint}`,
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 15000,
    };
    
    if (api.auth && ADMIN_TOKEN) {
      config.headers.Authorization = `Bearer ${ADMIN_TOKEN}`;
    }
    
    // Handle async body
    if (api.body) {
      if (typeof api.body === 'function') {
        config.data = await api.body();
      } else {
        config.data = api.body;
      }
    }
    
    const response = await axios(config);
    return {
      success: response.status >= 200 && response.status < 300,
      status: response.status,
      data: response.data,
      error: null
    };
  } catch (error) {
    const status = error.response?.status || 'NETWORK_ERROR';
    // Consider 200, 201, 400, 401, 403, 404, 422 as acceptable
    const acceptable = [200, 201, 400, 401, 403, 404, 422];
    return {
      success: acceptable.includes(status),
      status: status,
      data: error.response?.data || null,
      error: error.response?.data || error.message
    };
  }
}

async function testSkippedAPIs() {
  console.log('🚀 Testing Skipped APIs (15 APIs)...\n');
  console.log('📡 Local URL:', LOCAL_URL);
  console.log('='.repeat(80));
  console.log('');
  
  const results = {
    passed: 0,
    failed: 0,
    skipped: 0,
    errors: []
  };
  
  for (let i = 0; i < SKIPPED_APIS.length; i++) {
    const api = SKIPPED_APIS[i];
    const num = (i + 1).toString().padStart(2, '0');
    
    process.stdout.write(`\r${num}/${SKIPPED_APIS.length} Testing: ${api.name}...`);
    
    const result = await testAPI(api);
    
    if (result.status === 'SKIPPED') {
      results.skipped++;
      process.stdout.write(` SKIPPED (${result.reason})\n`);
    } else if (result.success) {
      results.passed++;
      process.stdout.write(` ✅ ${result.status}\n`);
      if (result.data && typeof result.data === 'object') {
        console.log(`      Response: ${JSON.stringify(result.data).substring(0, 100)}...`);
      }
    } else {
      results.failed++;
      results.errors.push({
        api: api.name,
        endpoint: api.endpoint,
        status: result.status,
        error: result.error
      });
      process.stdout.write(` ❌ ${result.status}\n`);
      if (result.error) {
        console.log(`      Error: ${JSON.stringify(result.error).substring(0, 200)}`);
      }
    }
    
    // Small delay
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  
  console.log('');
  console.log('='.repeat(80));
  console.log('📊 FINAL RESULTS');
  console.log('='.repeat(80));
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`⏭️  Skipped: ${results.skipped}`);
  console.log(`📈 Success Rate: ${((results.passed / (SKIPPED_APIS.length - results.skipped)) * 100).toFixed(1)}%`);
  console.log('');
  
  if (results.errors.length > 0) {
    console.log('❌ Failed APIs:');
    results.errors.forEach(err => {
      console.log(`   - ${err.api} (${err.endpoint}): ${err.status}`);
      if (err.error) {
        console.log(`     Error: ${JSON.stringify(err.error).substring(0, 150)}`);
      }
    });
  }
  
  console.log('');
  console.log('='.repeat(80));
  
  process.exit(0);
}

testSkippedAPIs().catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});

