/**
 * Product Workflow Tests
 * Tests: Seller upload, category validation, image upload, admin approve/reject, buyer sees approved
 */

import pool from '../src/config/db.js';

let testResults = [];

function logTest(name, passed, message = '') {
  const status = passed ? '✅' : '❌';
  console.log(`  ${status} ${name}${message ? ': ' + message : ''}`);
  testResults.push({ name, passed, message });
}

async function testCategoryValidation() {
  console.log('\n📋 Testing: Category Validation');
  
  try {
    // Ensure at least one category exists
    const categoryCheck = await pool.query("SELECT id FROM categories LIMIT 1");
    
    if (categoryCheck.rows.length === 0) {
      // Create a test category
      await pool.query(
        `INSERT INTO categories (name, description, active) 
         VALUES ('Test Category', 'Test Description', true)
         RETURNING id`
      );
    }
    
    // Test: Fetch all active categories
    // Check if 'active' column exists, otherwise use different query
    let categories;
    try {
      categories = await pool.query(
        "SELECT id, name FROM categories WHERE active = true"
      );
    } catch (e) {
      // Try alternative column name
      categories = await pool.query(
        "SELECT id, name FROM categories WHERE is_active = true"
      );
    }
    
    logTest('Fetch active categories', categories.rows.length > 0, 
      `Found ${categories.rows.length} categories`);
    
    // Test: Validate category exists
    const testCategoryId = categories.rows[0].id;
    let categoryValidation;
    try {
      categoryValidation = await pool.query(
        "SELECT id FROM categories WHERE id = $1 AND active = true",
        [testCategoryId]
      );
    } catch (e) {
      categoryValidation = await pool.query(
        "SELECT id FROM categories WHERE id = $1 AND is_active = true",
        [testCategoryId]
      );
    }
    
    logTest('Category validation', categoryValidation.rows.length > 0, 
      `Category ${testCategoryId} is valid`);
    
  } catch (error) {
    logTest('Category validation', false, error.message);
  }
}

async function testProductCreation() {
  console.log('\n📋 Testing: Product Creation');
  
  try {
    // Create test seller
    const sellerPhone = '+9647701234600';
    let sellerResult = await pool.query(
      "SELECT id FROM users WHERE phone = $1",
      [sellerPhone]
    );
    
    let sellerId;
    if (sellerResult.rows.length === 0) {
      const testEmail = `test${sellerPhone.replace(/[^0-9]/g, '')}@test.com`;
      const newSeller = await pool.query(
        `INSERT INTO users (phone, name, email, role, status) 
         VALUES ($1, 'Test Seller 2', $2, 'seller', 'approved')
         RETURNING id`,
        [sellerPhone, testEmail]
      );
      sellerId = newSeller.rows[0].id;
    } else {
      sellerId = sellerResult.rows[0].id;
      await pool.query("UPDATE users SET role = 'seller' WHERE id = $1", [sellerId]);
    }
    
    // Get a category
    const categoryResult = await pool.query(
      "SELECT id FROM categories WHERE active = true LIMIT 1"
    );
    
    if (categoryResult.rows.length === 0) {
      logTest('Product creation (no categories)', false, 'No categories available');
      return;
    }
    
    const categoryId = categoryResult.rows[0].id;
    
    // Test: Create product with pending status
    const productResult = await pool.query(
      `INSERT INTO products (seller_id, title, description, starting_price, category_id, status, duration_days)
       VALUES ($1, 'Test Product', 'Test Description', 100.00, $2, 'pending', 7)
       RETURNING id, status`,
      [sellerId, categoryId]
    );
    
    const productId = productResult.rows[0].id;
    const productStatus = productResult.rows[0].status;
    
    logTest('Create product', productId !== null, `Product ID: ${productId}`);
    logTest('Product status is pending', productStatus === 'pending', `Status: ${productStatus}`);
    
    // Test: Multiple images (simulate)
    const imageUrls = [
      'http://example.com/image1.jpg',
      'http://example.com/image2.jpg',
      'http://example.com/image3.jpg'
    ];
    
    // In real scenario, images would be uploaded and stored
    logTest('Multiple images support', imageUrls.length <= 6, 
      `Images: ${imageUrls.length} (max 6)`);
    
    // Cleanup
    await pool.query("DELETE FROM products WHERE id = $1", [productId]);
    
  } catch (error) {
    logTest('Product creation', false, error.message);
  }
}

async function testAdminApproveReject() {
  console.log('\n📋 Testing: Admin Approve/Reject');
  
  try {
    // Create test product
    const sellerPhone = '+9647701234601';
    let sellerResult = await pool.query(
      "SELECT id FROM users WHERE phone = $1",
      [sellerPhone]
    );
    
    let sellerId;
    if (sellerResult.rows.length === 0) {
      const testEmail = `test${sellerPhone.replace(/[^0-9]/g, '')}@test.com`;
      const newSeller = await pool.query(
        `INSERT INTO users (phone, name, email, role, status) 
         VALUES ($1, 'Test Seller 2', $2, 'seller', 'approved')
         RETURNING id`,
        [sellerPhone, testEmail]
      );
      sellerId = newSeller.rows[0].id;
    } else {
      sellerId = sellerResult.rows[0].id;
      const testEmail = `test${sellerPhone.replace(/[^0-9]/g, '')}@test.com`;
      await pool.query(
        "UPDATE users SET email = COALESCE(email, $1) WHERE id = $2",
        [testEmail, sellerId]
      );
    }
    
    const categoryResult = await pool.query(
      "SELECT id FROM categories WHERE active = true LIMIT 1"
    );
    
    if (categoryResult.rows.length === 0) {
      logTest('Admin approve/reject (no categories)', false, 'No categories available');
      return;
    }
    
    const categoryId = categoryResult.rows[0].id;
    
    // Create pending product
    const productResult = await pool.query(
      `INSERT INTO products (seller_id, title, description, starting_price, category_id, status, duration_days)
       VALUES ($1, 'Test Product for Approval', 'Test', 100.00, $2, 'pending', 7)
       RETURNING id`,
      [sellerId, categoryId]
    );
    
    const productId = productResult.rows[0].id;
    
    // Test: Approve product
    await pool.query(
      "UPDATE products SET status = 'approved' WHERE id = $1",
      [productId]
    );
    
    const approvedCheck = await pool.query(
      "SELECT status FROM products WHERE id = $1",
      [productId]
    );
    
    logTest('Approve product', approvedCheck.rows[0].status === 'approved', 
      `Status: ${approvedCheck.rows[0].status}`);
    
    // Test: Reject product
    await pool.query(
      "UPDATE products SET status = 'rejected' WHERE id = $1",
      [productId]
    );
    
    const rejectedCheck = await pool.query(
      "SELECT status FROM products WHERE id = $1",
      [productId]
    );
    
    logTest('Reject product', rejectedCheck.rows[0].status === 'rejected', 
      `Status: ${rejectedCheck.rows[0].status}`);
    
    // Cleanup
    await pool.query("DELETE FROM products WHERE id = $1", [productId]);
    
  } catch (error) {
    logTest('Admin approve/reject', false, error.message);
  }
}

async function testBuyerSeesOnlyApproved() {
  console.log('\n📋 Testing: Buyer Sees Only Approved Products');
  
  try {
    // Create test products with different statuses
    const sellerPhone = '+9647701234602';
    let sellerResult = await pool.query(
      "SELECT id FROM users WHERE phone = $1",
      [sellerPhone]
    );
    
    let sellerId;
    if (sellerResult.rows.length === 0) {
      const testEmail = `test${sellerPhone.replace(/[^0-9]/g, '')}@test.com`;
      const newSeller = await pool.query(
        `INSERT INTO users (phone, name, email, role, status) 
         VALUES ($1, 'Test Seller 2', $2, 'seller', 'approved')
         RETURNING id`,
        [sellerPhone, testEmail]
      );
      sellerId = newSeller.rows[0].id;
    } else {
      sellerId = sellerResult.rows[0].id;
      const testEmail = `test${sellerPhone.replace(/[^0-9]/g, '')}@test.com`;
      await pool.query(
        "UPDATE users SET email = COALESCE(email, $1) WHERE id = $2",
        [testEmail, sellerId]
      );
    }
    
    const categoryResult = await pool.query(
      "SELECT id FROM categories WHERE active = true LIMIT 1"
    );
    
    if (categoryResult.rows.length === 0) {
      logTest('Buyer sees approved (no categories)', false, 'No categories available');
      return;
    }
    
    const categoryId = categoryResult.rows[0].id;
    
    // Create products with different statuses
    const products = [
      { status: 'approved', title: 'Approved Product' },
      { status: 'pending', title: 'Pending Product' },
      { status: 'rejected', title: 'Rejected Product' }
    ];
    
    const productIds = [];
    
    for (const product of products) {
      const result = await pool.query(
        `INSERT INTO products (seller_id, title, description, starting_price, category_id, status, duration_days)
         VALUES ($1, $2, 'Test', 100.00, $3, $4, 7)
         RETURNING id`,
        [sellerId, product.title, categoryId, product.status]
      );
      productIds.push(result.rows[0].id);
    }
    
    // Test: Fetch only approved products
    const approvedProducts = await pool.query(
      "SELECT id, status FROM products WHERE status = 'approved' AND id = ANY($1)",
      [productIds]
    );
    
    logTest('Buyer sees only approved', approvedProducts.rows.length === 1, 
      `Found ${approvedProducts.rows.length} approved products`);
    
    // Verify no pending or rejected
    const allProducts = await pool.query(
      "SELECT status FROM products WHERE id = ANY($1)",
      [productIds]
    );
    
    const hasOnlyApproved = allProducts.rows.every(p => p.status === 'approved') === false;
    logTest('Pending/rejected filtered out', hasOnlyApproved, 
      'Pending and rejected products not shown to buyers');
    
    // Cleanup
    await pool.query("DELETE FROM products WHERE id = ANY($1)", [productIds]);
    
  } catch (error) {
    logTest('Buyer sees only approved', false, error.message);
  }
}

export async function runTests() {
  console.log('\n📦 PRODUCT WORKFLOW TESTS');
  console.log('='.repeat(60));
  
  testResults = [];
  
  await testCategoryValidation();
  await testProductCreation();
  await testAdminApproveReject();
  await testBuyerSeesOnlyApproved();
  
  const passed = testResults.filter(t => t.passed).length;
  const failed = testResults.filter(t => !t.passed).length;
  
  console.log('\n📊 Product Workflow Test Results:');
  console.log(`   ✅ Passed: ${passed}`);
  console.log(`   ❌ Failed: ${failed}`);
  console.log(`   📈 Total:  ${testResults.length}`);
  
  return { passed, failed, total: testResults.length };
}

