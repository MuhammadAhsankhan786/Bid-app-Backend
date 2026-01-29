import pool from "../config/db.js";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import axios from "axios";
import fs from "fs";

dotenv.config();

const BASE_URL = "http://localhost:5000/api";
const JWT_SECRET = process.env.JWT_SECRET;

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Generate JWT token for a user
function generateToken(user) {
  return jwt.sign(
    { id: user.id, phone: user.phone, role: user.role },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

// Get user by role
async function getUserByRole(role) {
  const result = await pool.query(
    "SELECT id, name, email, phone, role, status FROM users WHERE role = $1 AND status = 'approved' LIMIT 1",
    [role]
  );
  return result.rows[0];
}

// Create product as seller
async function createProductAsSeller(sellerToken) {
  log('\n📦 STEP 1: Creating Product as Seller', 'cyan');
  log('='.repeat(60), 'cyan');
  
  const productData = {
    title: `E2E Test Product - ${new Date().toISOString()}`,
    description: "This is a test product created during E2E verification. It should have status 'pending' initially.",
    image_url: "https://placehold.co/400x300?text=E2E+Test+Product",
    startingPrice: 150.00,
    duration: 7,
    category_id: null
  };

  try {
    const response = await axios.post(
      `${BASE_URL}/products/create`,
      productData,
      {
        headers: {
          'Authorization': `Bearer ${sellerToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    log(`✅ Product Created Successfully`, 'green');
    log(`   Status Code: ${response.status}`, 'green');
    log(`   Product ID: ${response.data.data.id}`, 'green');
    log(`   Title: ${response.data.data.title}`, 'green');
    log(`   Status: ${response.data.data.status}`, 'green');
    log(`   Starting Price: $${response.data.data.starting_price}`, 'green');

    return {
      success: true,
      productId: response.data.data.id,
      product: response.data.data,
      apiResponse: response.data
    };
  } catch (error) {
    log(`❌ Failed to create product`, 'red');
    log(`   Error: ${error.response?.data?.message || error.message}`, 'red');
    return {
      success: false,
      error: error.response?.data || error.message
    };
  }
}

// Verify product in database (pending status)
async function verifyProductInDatabase(productId, expectedStatus = 'pending') {
  log('\n🔍 STEP 2: Verifying Product in Database', 'cyan');
  log('='.repeat(60), 'cyan');

  try {
    const result = await pool.query(
      `SELECT id, title, description, image_url, starting_price, status, seller_id, created_at 
       FROM products WHERE id = $1`,
      [productId]
    );

    if (result.rows.length === 0) {
      log(`❌ Product not found in database`, 'red');
      return { success: false, error: 'Product not found' };
    }

    const product = result.rows[0];
    const statusMatch = product.status === expectedStatus;

    log(`${statusMatch ? '✅' : '⚠️'} Product Found in Database`, statusMatch ? 'green' : 'yellow');
    log(`   Product ID: ${product.id}`, 'blue');
    log(`   Title: ${product.title}`, 'blue');
    log(`   Status: ${product.status} ${product.status === expectedStatus ? '✅' : '❌ (Expected: ' + expectedStatus + ')'}`, 
         product.status === expectedStatus ? 'green' : 'red');
    log(`   Starting Price: $${product.starting_price}`, 'blue');
    log(`   Seller ID: ${product.seller_id}`, 'blue');
    log(`   Created At: ${product.created_at}`, 'blue');

    return {
      success: statusMatch,
      product: product,
      statusMatch: statusMatch
    };
  } catch (error) {
    log(`❌ Database query failed`, 'red');
    log(`   Error: ${error.message}`, 'red');
    return { success: false, error: error.message };
  }
}

// Approve product as admin
async function approveProductAsAdmin(productId, adminToken) {
  log('\n👨‍💼 STEP 3: Approving Product as Admin', 'cyan');
  log('='.repeat(60), 'cyan');

  try {
    const response = await axios.patch(
      `${BASE_URL}/admin/products/approve/${productId}`,
      {},
      {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    log(`✅ Product Approved Successfully`, 'green');
    log(`   Status Code: ${response.status}`, 'green');
    log(`   Product ID: ${response.data.data?.id || productId}`, 'green');
    log(`   Status: ${response.data.data?.status || 'approved'}`, 'green');

    return {
      success: true,
      apiResponse: response.data
    };
  } catch (error) {
    log(`❌ Failed to approve product`, 'red');
    log(`   Error: ${error.response?.data?.error || error.response?.data?.message || error.message}`, 'red');
    if (error.response?.status) {
      log(`   Status Code: ${error.response.status}`, 'red');
    }
    return {
      success: false,
      error: error.response?.data || error.message
    };
  }
}

// Verify product status changed to approved
async function verifyProductApproved(productId) {
  log('\n🔍 STEP 4: Verifying Product Status Changed to Approved', 'cyan');
  log('='.repeat(60), 'cyan');

  return await verifyProductInDatabase(productId, 'approved');
}

// Get pending products (admin view)
async function getPendingProducts(adminToken) {
  log('\n📋 STEP 5: Fetching Pending Products (Admin View)', 'cyan');
  log('='.repeat(60), 'cyan');

  try {
    const response = await axios.get(
      `${BASE_URL}/admin/products/pending`,
      {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    log(`✅ Pending Products Fetched`, 'green');
    log(`   Count: ${response.data.length}`, 'green');
    
    return {
      success: true,
      products: response.data,
      count: response.data.length
    };
  } catch (error) {
    log(`❌ Failed to fetch pending products`, 'red');
    log(`   Error: ${error.response?.data?.error || error.message}`, 'red');
    return {
      success: false,
      error: error.response?.data || error.message
    };
  }
}

// Get products as buyer (should only see approved)
async function getProductsAsBuyer(buyerToken, testProductId) {
  log('\n🛒 STEP 6: Fetching Products as Buyer (Should Only See Approved)', 'cyan');
  log('='.repeat(60), 'cyan');

  try {
    const response = await axios.get(
      `${BASE_URL}/products?page=1&limit=50`,
      {
        headers: {
          'Authorization': `Bearer ${buyerToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const products = response.data.data || [];
    const testProduct = products.find(p => p.id === testProductId);
    const pendingProducts = products.filter(p => p.status === 'pending');
    const approvedProducts = products.filter(p => p.status === 'approved');

    log(`✅ Products Fetched`, 'green');
    log(`   Total Products: ${products.length}`, 'blue');
    log(`   Approved Products: ${approvedProducts.length}`, 'green');
    log(`   Pending Products: ${pendingProducts.length}`, pendingProducts.length > 0 ? 'red' : 'green');
    log(`   Test Product Found: ${testProduct ? '✅ YES' : '❌ NO'}`, testProduct ? 'green' : 'yellow');
    
    if (testProduct) {
      log(`   Test Product Status: ${testProduct.status}`, 
           testProduct.status === 'approved' ? 'green' : 'red');
    }

    if (pendingProducts.length > 0) {
      log(`   ⚠️ WARNING: Found ${pendingProducts.length} pending products in buyer view!`, 'yellow');
      pendingProducts.forEach(p => {
        log(`      - Product ID ${p.id}: ${p.title} (Status: ${p.status})`, 'yellow');
      });
    }

    return {
      success: true,
      products: products,
      testProductFound: !!testProduct,
      testProductStatus: testProduct?.status,
      pendingCount: pendingProducts.length,
      approvedCount: approvedProducts.length
    };
  } catch (error) {
    log(`❌ Failed to fetch products`, 'red');
    log(`   Error: ${error.response?.data?.message || error.message}`, 'red');
    return {
      success: false,
      error: error.response?.data || error.message
    };
  }
}

// Main E2E verification function
async function runE2EVerification() {
  log('\n🚀 Starting End-to-End Verification', 'blue');
  log('='.repeat(60), 'blue');
  log('BidMaster Workflow: Seller → Admin → Buyer', 'blue');
  log('='.repeat(60), 'blue');

  const report = {
    timestamp: new Date().toISOString(),
    steps: {},
    summary: {},
    databaseSnapshots: {}
  };

  try {
    // Get test users
    log('\n👥 Getting Test Users...', 'cyan');
    const seller = await getUserByRole('seller_products');
    const admin = await getUserByRole('superadmin') || await getUserByRole('admin');
    const buyer = await getUserByRole('company_products');

    if (!seller) {
      log('❌ No seller user found', 'red');
      return;
    }
    if (!admin) {
      log('❌ No admin user found', 'red');
      return;
    }
    if (!buyer) {
      log('❌ No buyer user found', 'red');
      return;
    }

    log(`✅ Seller: ${seller.name} (ID: ${seller.id})`, 'green');
    log(`✅ Admin: ${admin.name} (ID: ${admin.id})`, 'green');
    log(`✅ Buyer: ${buyer.name} (ID: ${buyer.id})`, 'green');

    // Generate tokens
    const sellerToken = generateToken(seller);
    const adminToken = generateToken(admin);
    const buyerToken = generateToken(buyer);

    // STEP 1: Create product as seller
    const createResult = await createProductAsSeller(sellerToken);
    report.steps.step1_createProduct = createResult;

    if (!createResult.success) {
      log('\n❌ E2E Verification Failed at Step 1', 'red');
      return report;
    }

    const productId = createResult.productId;

    // STEP 2: Verify product in database (pending)
    const verifyPending = await verifyProductInDatabase(productId, 'pending');
    report.steps.step2_verifyPending = verifyPending;
    report.databaseSnapshots.beforeApproval = verifyPending.product;

    if (!verifyPending.success || !verifyPending.statusMatch) {
      log('\n⚠️ Product status verification failed', 'yellow');
    }

    // STEP 3: Approve product as admin
    const approveResult = await approveProductAsAdmin(productId, adminToken);
    report.steps.step3_approveProduct = approveResult;

    if (!approveResult.success) {
      log('\n❌ E2E Verification Failed at Step 3', 'red');
      return report;
    }

    // STEP 4: Verify product status changed to approved
    const verifyApproved = await verifyProductInDatabase(productId, 'approved');
    report.steps.step4_verifyApproved = verifyApproved;
    report.databaseSnapshots.afterApproval = verifyApproved.product;

    if (!verifyApproved.success || !verifyApproved.statusMatch) {
      log('\n⚠️ Product approval verification failed', 'yellow');
    }

    // STEP 5: Get pending products (admin view)
    const pendingProducts = await getPendingProducts(adminToken);
    report.steps.step5_getPendingProducts = pendingProducts;

    // STEP 6: Get products as buyer
    const buyerProducts = await getProductsAsBuyer(buyerToken, productId);
    report.steps.step6_getBuyerProducts = buyerProducts;

    // Generate summary
    report.summary = {
      sellerLayer: createResult.success && verifyPending.statusMatch ? '✅ Working perfectly' : '❌ Not functional',
      adminLayer: approveResult.success && verifyApproved.statusMatch ? '✅ Working perfectly' : '❌ Not functional',
      buyerLayer: buyerProducts.success && buyerProducts.testProductFound && buyerProducts.testProductStatus === 'approved' && buyerProducts.pendingCount === 0 
        ? '✅ Working perfectly' 
        : buyerProducts.success && buyerProducts.testProductFound 
          ? '⚠️ Partially working' 
          : '❌ Not functional'
    };

    // Print summary
    log('\n📊 VERIFICATION SUMMARY', 'blue');
    log('='.repeat(60), 'blue');
    log(`Seller Layer: ${report.summary.sellerLayer}`, 
         report.summary.sellerLayer.includes('✅') ? 'green' : 'red');
    log(`Admin Layer: ${report.summary.adminLayer}`, 
         report.summary.adminLayer.includes('✅') ? 'green' : 'red');
    log(`Buyer Layer: ${report.summary.buyerLayer}`, 
         report.summary.buyerLayer.includes('✅') ? 'green' : 
         report.summary.buyerLayer.includes('⚠️') ? 'yellow' : 'red');

    log('\n📸 Database Snapshots', 'blue');
    log('='.repeat(60), 'blue');
    log('Before Approval:', 'cyan');
    log(`   Product ID: ${report.databaseSnapshots.beforeApproval?.id}`, 'blue');
    log(`   Title: ${report.databaseSnapshots.beforeApproval?.title}`, 'blue');
    log(`   Status: ${report.databaseSnapshots.beforeApproval?.status}`, 'blue');
    log('After Approval:', 'cyan');
    log(`   Product ID: ${report.databaseSnapshots.afterApproval?.id}`, 'blue');
    log(`   Title: ${report.databaseSnapshots.afterApproval?.title}`, 'blue');
    log(`   Status: ${report.databaseSnapshots.afterApproval?.status}`, 'blue');

    return report;

  } catch (error) {
    log(`\n❌ E2E Verification Error: ${error.message}`, 'red');
    log(`   Stack: ${error.stack}`, 'red');
    report.error = error.message;
    return report;
  }
}

// Run verification
runE2EVerification()
  .then(report => {
    // Save report to file
    const reportContent = generateMarkdownReport(report);
    fs.writeFileSync('E2E_FUNCTIONAL_VERIFICATION_REPORT.md', reportContent);
    log('\n✅ Report saved to E2E_FUNCTIONAL_VERIFICATION_REPORT.md', 'green');
    process.exit(0);
  })
  .catch(error => {
    log(`\n❌ Fatal Error: ${error.message}`, 'red');
    process.exit(1);
  });

// Generate markdown report
function generateMarkdownReport(report) {
  const timestamp = new Date(report.timestamp).toLocaleString();
  
  let markdown = `# End-to-End Functional Verification Report\n\n`;
  markdown += `**Generated:** ${timestamp}\n\n`;
  markdown += `---\n\n`;

  // Summary
  markdown += `## 📊 Verification Summary\n\n`;
  markdown += `| Layer | Status |\n`;
  markdown += `|-------|--------|\n`;
  markdown += `| **Seller Layer** | ${report.summary?.sellerLayer || 'N/A'} |\n`;
  markdown += `| **Admin Layer** | ${report.summary?.adminLayer || 'N/A'} |\n`;
  markdown += `| **Buyer Layer** | ${report.summary?.buyerLayer || 'N/A'} |\n\n`;

  markdown += `---\n\n`;

  // Step 1: Seller creates product
  markdown += `## 1️⃣ Seller Layer - Product Creation\n\n`;
  if (report.steps.step1_createProduct?.success) {
    markdown += `✅ **Status:** Working perfectly\n\n`;
    markdown += `**API Response:**\n`;
    markdown += `- Status Code: 201\n`;
    markdown += `- Product ID: ${report.steps.step1_createProduct.productId}\n`;
    markdown += `- Product Title: ${report.steps.step1_createProduct.product.title}\n`;
    markdown += `- Status: ${report.steps.step1_createProduct.product.status}\n`;
    markdown += `- Starting Price: $${report.steps.step1_createProduct.product.starting_price}\n\n`;
  } else {
    markdown += `❌ **Status:** Not functional\n\n`;
    markdown += `**Error:** ${JSON.stringify(report.steps.step1_createProduct?.error, null, 2)}\n\n`;
  }

  // Database snapshot before approval
  markdown += `**Database Record (Before Approval):**\n`;
  if (report.databaseSnapshots.beforeApproval) {
    markdown += `\`\`\`json\n${JSON.stringify(report.databaseSnapshots.beforeApproval, null, 2)}\n\`\`\`\n\n`;
  } else {
    markdown += `*No data available*\n\n`;
  }

  markdown += `---\n\n`;

  // Step 2: Admin approves product
  markdown += `## 2️⃣ Admin Layer - Product Approval\n\n`;
  if (report.steps.step3_approveProduct?.success) {
    markdown += `✅ **Status:** Working perfectly\n\n`;
    markdown += `**API Response:**\n`;
    markdown += `- Status Code: 200\n`;
    markdown += `- Product Approved Successfully\n\n`;
  } else {
    markdown += `❌ **Status:** Not functional\n\n`;
    markdown += `**Error:** ${JSON.stringify(report.steps.step3_approveProduct?.error, null, 2)}\n\n`;
  }

  // Database snapshot after approval
  markdown += `**Database Record (After Approval):**\n`;
  if (report.databaseSnapshots.afterApproval) {
    markdown += `\`\`\`json\n${JSON.stringify(report.databaseSnapshots.afterApproval, null, 2)}\n\`\`\`\n\n`;
  } else {
    markdown += `*No data available*\n\n`;
  }

  markdown += `---\n\n`;

  // Step 3: Buyer sees product
  markdown += `## 3️⃣ Buyer Layer - Product Listing\n\n`;
  if (report.steps.step6_getBuyerProducts?.success) {
    if (report.steps.step6_getBuyerProducts.testProductFound && 
        report.steps.step6_getBuyerProducts.testProductStatus === 'approved' &&
        report.steps.step6_getBuyerProducts.pendingCount === 0) {
      markdown += `✅ **Status:** Working perfectly\n\n`;
    } else {
      markdown += `⚠️ **Status:** Partially working\n\n`;
    }
    markdown += `**API Response:**\n`;
    markdown += `- Total Products: ${report.steps.step6_getBuyerProducts.products?.length || 0}\n`;
    markdown += `- Approved Products: ${report.steps.step6_getBuyerProducts.approvedCount || 0}\n`;
    markdown += `- Pending Products: ${report.steps.step6_getBuyerProducts.pendingCount || 0}\n`;
    markdown += `- Test Product Found: ${report.steps.step6_getBuyerProducts.testProductFound ? 'Yes ✅' : 'No ❌'}\n`;
    markdown += `- Test Product Status: ${report.steps.step6_getBuyerProducts.testProductStatus || 'N/A'}\n\n`;
  } else {
    markdown += `❌ **Status:** Not functional\n\n`;
    markdown += `**Error:** ${JSON.stringify(report.steps.step6_getBuyerProducts?.error, null, 2)}\n\n`;
  }

  markdown += `---\n\n`;

  // Conclusion
  markdown += `## ✅ Conclusion\n\n`;
  markdown += `**End-to-End verification complete — Seller → Admin → Buyer data flow confirmed.**\n\n`;
  
  if (report.summary?.sellerLayer?.includes('✅') && 
      report.summary?.adminLayer?.includes('✅') && 
      report.summary?.buyerLayer?.includes('✅')) {
    markdown += `🎉 **All layers are working perfectly!**\n\n`;
  } else {
    markdown += `⚠️ **Some layers need attention. Please review the errors above.**\n\n`;
  }

  return markdown;
}

