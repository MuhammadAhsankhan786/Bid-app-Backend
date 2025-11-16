import pool from "../config/db.js";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import axios from "axios";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import FormData from "form-data";
import { Readable } from "stream";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = process.env.BASE_URL || "http://localhost:5000/api";
const JWT_SECRET = process.env.JWT_SECRET;

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
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
  if (result.rows.length === 0) {
    throw new Error(`No ${role} user found in database. Please seed test users first.`);
  }
  return result.rows[0];
}

// Create a test image file
function createTestImage() {
  const testImagePath = path.join(__dirname, '../uploads/test_image.png');
  const uploadsDir = path.dirname(testImagePath);
  
  // Create uploads directory if it doesn't exist
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  
  // Check if test image already exists
  if (fs.existsSync(testImagePath)) {
    return testImagePath;
  }
  
  // Create a simple 1x1 PNG image (minimal valid PNG)
  // PNG signature + minimal IHDR chunk
  const pngData = Buffer.from([
    0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
    0x00, 0x00, 0x00, 0x0D, // IHDR chunk length
    0x49, 0x48, 0x44, 0x52, // IHDR
    0x00, 0x00, 0x00, 0x01, // Width: 1
    0x00, 0x00, 0x00, 0x01, // Height: 1
    0x08, 0x06, 0x00, 0x00, 0x00, // Bit depth, color type, compression, filter, interlace
    0x1F, 0x15, 0xC4, 0x89, // CRC
    0x00, 0x00, 0x00, 0x0A, // IDAT chunk length
    0x49, 0x44, 0x41, 0x54, // IDAT
    0x78, 0x9C, 0x63, 0x00, 0x01, 0x00, 0x00, 0x05, 0x00, 0x01, // Compressed data
    0x0D, 0x0A, 0x2D, 0xB4, // CRC
    0x00, 0x00, 0x00, 0x00, // IEND chunk length
    0x49, 0x45, 0x4E, 0x44, // IEND
    0xAE, 0x42, 0x60, 0x82  // CRC
  ]);
  
  fs.writeFileSync(testImagePath, pngData);
  return testImagePath;
}

// STEP 1: Upload Image
async function uploadImage(sellerToken) {
  log('\n📸 STEP 1: Uploading Product Image', 'cyan');
  log('='.repeat(60), 'cyan');
  
  try {
    const testImagePath = createTestImage();
    log(`   Test image path: ${testImagePath}`, 'blue');
    
    // Create FormData for multipart upload
    const formData = new FormData();
    formData.append('image', fs.createReadStream(testImagePath), {
      filename: 'test-product.png',
      contentType: 'image/png'
    });
    
    // Get form-data headers
    const formHeaders = formData.getHeaders();
    
    const response = await axios.post(
      `${BASE_URL}/uploads/image`,
      formData,
      {
        headers: {
          'Authorization': `Bearer ${sellerToken}`,
          ...formHeaders
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity
      }
    );
    
    if (response.data.success && response.data.data) {
      log(`✅ Image Uploaded Successfully`, 'green');
      log(`   Status Code: ${response.status}`, 'green');
      log(`   Filename: ${response.data.data.filename}`, 'green');
      log(`   Image URL: ${response.data.data.url}`, 'green');
      log(`   Size: ${response.data.data.size} bytes`, 'green');
      
      return {
        success: true,
        imageUrl: response.data.data.url,
        imageData: response.data.data
      };
    } else {
      throw new Error('Invalid response from image upload');
    }
  } catch (error) {
    log(`❌ Failed to upload image`, 'red');
    if (error.response) {
      log(`   Status Code: ${error.response.status}`, 'red');
      log(`   Error: ${JSON.stringify(error.response.data, null, 2)}`, 'red');
    } else {
      log(`   Error: ${error.message}`, 'red');
    }
    return {
      success: false,
      error: error.response?.data || error.message
    };
  }
}

// STEP 2: Create Product as Seller
async function createProductAsSeller(sellerToken, imageUrl) {
  log('\n📦 STEP 2: Creating Product as Seller', 'cyan');
  log('='.repeat(60), 'cyan');
  
  const productData = {
    title: "Test Watch",
    description: "Automatic test product created by E2E automation test",
    image_url: imageUrl,
    startingPrice: 2500,
    duration: 7,
    category_id: null
  };

  try {
    log(`   Request Data:`, 'blue');
    log(`   - Title: ${productData.title}`, 'blue');
    log(`   - Price: $${productData.startingPrice}`, 'blue');
    log(`   - Duration: ${productData.duration} days`, 'blue');
    log(`   - Image URL: ${productData.image_url}`, 'blue');
    
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
    log(`   Image URL: ${response.data.data.image_url}`, 'green');

    // Verify status is 'pending'
    if (response.data.data.status !== 'pending') {
      throw new Error(`Expected status 'pending', got '${response.data.data.status}'`);
    }

    return {
      success: true,
      productId: response.data.data.id,
      product: response.data.data,
      apiResponse: response.data
    };
  } catch (error) {
    log(`❌ Failed to create product`, 'red');
    if (error.response) {
      log(`   Status Code: ${error.response.status}`, 'red');
      log(`   Error: ${JSON.stringify(error.response.data, null, 2)}`, 'red');
    } else {
      log(`   Error: ${error.message}`, 'red');
    }
    return {
      success: false,
      error: error.response?.data || error.message
    };
  }
}

// STEP 3: Verify Product in Database (Pending Status)
async function verifyProductInDatabase(productId, expectedStatus = 'pending') {
  log('\n🔍 STEP 3: Verifying Product in Database', 'cyan');
  log('='.repeat(60), 'cyan');

  try {
    const result = await pool.query(
      `SELECT id, title, description, image_url, starting_price, status, seller_id, created_at, auction_end_time
       FROM products 
       WHERE id = $1`,
      [productId]
    );

    if (result.rows.length === 0) {
      log(`❌ Product Not Found in Database`, 'red');
      return {
        success: false,
        error: 'Product not found'
      };
    }

    const product = result.rows[0];
    const statusMatch = product.status === expectedStatus;

    log(`${statusMatch ? '✅' : '❌'} Product Found in Database`, statusMatch ? 'green' : 'red');
    log(`   Product ID: ${product.id}`, 'blue');
    log(`   Title: ${product.title}`, 'blue');
    log(`   Status: ${product.status} ${product.status === expectedStatus ? '✅' : '❌ (Expected: ' + expectedStatus + ')'}`, 
        product.status === expectedStatus ? 'green' : 'red');
    log(`   Starting Price: $${product.starting_price}`, 'blue');
    log(`   Image URL: ${product.image_url}`, 'blue');
    log(`   Seller ID: ${product.seller_id}`, 'blue');
    log(`   Created At: ${product.created_at}`, 'blue');

    return {
      success: statusMatch,
      product: product,
      statusMatch: statusMatch
    };
  } catch (error) {
    log(`❌ Database Query Error`, 'red');
    log(`   Error: ${error.message}`, 'red');
    return {
      success: false,
      error: error.message
    };
  }
}

// STEP 4: Admin Approves Product
async function approveProductAsAdmin(adminToken, productId) {
  log('\n✅ STEP 4: Admin Approving Product', 'cyan');
  log('='.repeat(60), 'cyan');

  try {
    log(`   Product ID: ${productId}`, 'blue');
    
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
    log(`   Product ID: ${response.data.product?.id || productId}`, 'green');
    log(`   Status: ${response.data.product?.status || 'approved'}`, 'green');
    log(`   Message: ${response.data.message}`, 'green');

    return {
      success: true,
      product: response.data.product,
      apiResponse: response.data
    };
  } catch (error) {
    log(`❌ Failed to approve product`, 'red');
    if (error.response) {
      log(`   Status Code: ${error.response.status}`, 'red');
      log(`   Error: ${JSON.stringify(error.response.data, null, 2)}`, 'red');
    } else {
      log(`   Error: ${error.message}`, 'red');
    }
    return {
      success: false,
      error: error.response?.data || error.message
    };
  }
}

// STEP 5: Verify Product Status Changed to Approved
async function verifyProductApproved(productId) {
  log('\n🔍 STEP 5: Verifying Product Status Changed to Approved', 'cyan');
  log('='.repeat(60), 'cyan');

  try {
    const result = await pool.query(
      `SELECT id, title, status, image_url, seller_id, auction_end_time, created_at
       FROM products 
       WHERE id = $1`,
      [productId]
    );

    if (result.rows.length === 0) {
      log(`❌ Product Not Found`, 'red');
      return { success: false, error: 'Product not found' };
    }

    const product = result.rows[0];
    const isApproved = product.status === 'approved';

    log(`${isApproved ? '✅' : '❌'} Product Status Verification`, isApproved ? 'green' : 'red');
    log(`   Product ID: ${product.id}`, 'blue');
    log(`   Title: ${product.title}`, 'blue');
    log(`   Status: ${product.status} ${isApproved ? '✅' : '❌'}`, isApproved ? 'green' : 'red');
    log(`   Auction End Time: ${product.auction_end_time}`, 'blue');
    log(`   Created At: ${product.created_at}`, 'blue');

    return {
      success: isApproved,
      product: product,
      isApproved: isApproved
    };
  } catch (error) {
    log(`❌ Database Query Error`, 'red');
    log(`   Error: ${error.message}`, 'red');
    return {
      success: false,
      error: error.message
    };
  }
}

// STEP 6: Verify Product in Admin Pending List
async function verifyProductInAdminPendingList(adminToken) {
  log('\n📋 STEP 6: Verifying Product in Admin Pending List', 'cyan');
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

    const pendingProducts = response.data.filter(p => p.status === 'pending');
    log(`✅ Admin Pending Products Retrieved`, 'green');
    log(`   Total Pending Products: ${pendingProducts.length}`, 'blue');
    
    if (pendingProducts.length > 0) {
      log(`   Latest Pending Product:`, 'blue');
      const latest = pendingProducts[0];
      log(`     - ID: ${latest.id}`, 'blue');
      log(`     - Title: ${latest.title}`, 'blue');
      log(`     - Status: ${latest.status}`, 'blue');
    }

    return {
      success: true,
      pendingProducts: pendingProducts,
      count: pendingProducts.length
    };
  } catch (error) {
    log(`❌ Failed to fetch pending products`, 'red');
    if (error.response) {
      log(`   Status Code: ${error.response.status}`, 'red');
      log(`   Error: ${JSON.stringify(error.response.data, null, 2)}`, 'red');
    } else {
      log(`   Error: ${error.message}`, 'red');
    }
    return {
      success: false,
      error: error.response?.data || error.message
    };
  }
}

// STEP 7: Buyer Fetches Approved Products
async function fetchProductsAsBuyer(buyerToken, productId) {
  log('\n🛒 STEP 7: Buyer Fetching Approved Products', 'cyan');
  log('='.repeat(60), 'cyan');

  try {
    // Fetch products (public endpoint, but we'll use buyer token for consistency)
    const response = await axios.get(
      `${BASE_URL}/products`,
      {
        headers: {
          'Authorization': `Bearer ${buyerToken}`,
          'Content-Type': 'application/json'
        },
        params: {
          page: 1,
          limit: 50
        }
      }
    );

    if (!response.data.success) {
      throw new Error('Invalid response format');
    }

    const products = response.data.data || [];
    const testProduct = products.find(p => p.id === productId);
    const approvedProducts = products.filter(p => p.status === 'approved');
    const pendingProducts = products.filter(p => p.status === 'pending');

    log(`✅ Products Retrieved Successfully`, 'green');
    log(`   Total Products: ${products.length}`, 'blue');
    log(`   Approved Products: ${approvedProducts.length}`, 'green');
    log(`   Pending Products: ${pendingProducts.length}`, 'yellow');

    if (testProduct) {
      log(`✅ Test Product Found in Buyer List`, 'green');
      log(`   Product ID: ${testProduct.id}`, 'blue');
      log(`   Title: ${testProduct.title}`, 'blue');
      log(`   Status: ${testProduct.status}`, testProduct.status === 'approved' ? 'green' : 'red');
      log(`   Current Price: $${testProduct.current_price || testProduct.starting_price}`, 'blue');
      log(`   Image URL: ${testProduct.image_url}`, 'blue');
      
      // Verify image URL is accessible
      if (testProduct.image_url) {
        try {
          const imageResponse = await axios.head(testProduct.image_url, { timeout: 5000 });
          log(`   Image URL Status: ${imageResponse.status} ✅`, 'green');
        } catch (imgError) {
          log(`   Image URL Status: Not accessible ⚠️`, 'yellow');
        }
      }
    } else {
      log(`❌ Test Product NOT Found in Buyer List`, 'red');
      log(`   This means the product is not visible to buyers`, 'red');
    }

    // Verify no pending products are visible to buyers
    if (pendingProducts.length > 0) {
      log(`⚠️ Warning: ${pendingProducts.length} pending product(s) visible to buyers`, 'yellow');
      log(`   This should not happen - buyers should only see approved products`, 'yellow');
    }

    return {
      success: true,
      testProductFound: !!testProduct,
      testProductStatus: testProduct?.status,
      approvedCount: approvedProducts.length,
      pendingCount: pendingProducts.length,
      products: products
    };
  } catch (error) {
    log(`❌ Failed to fetch products`, 'red');
    if (error.response) {
      log(`   Status Code: ${error.response.status}`, 'red');
      log(`   Error: ${JSON.stringify(error.response.data, null, 2)}`, 'red');
    } else {
      log(`   Error: ${error.message}`, 'red');
    }
    return {
      success: false,
      error: error.response?.data || error.message
    };
  }
}

// STEP 8: Database Consistency Check
async function verifyDatabaseConsistency(productId) {
  log('\n🗄️ STEP 8: Database Consistency Check', 'cyan');
  log('='.repeat(60), 'cyan');

  try {
    const result = await pool.query(
      `SELECT id, title, description, status, image_url, starting_price, seller_id, 
              created_at, auction_end_time
       FROM products 
       WHERE id = $1`,
      [productId]
    );

    if (result.rows.length === 0) {
      log(`❌ Product Not Found`, 'red');
      return { success: false };
    }

    const product = result.rows[0];

    log(`✅ Database Record Verified`, 'green');
    log(`   ID: ${product.id}`, 'blue');
    log(`   Title: ${product.title}`, 'blue');
    log(`   Status: ${product.status}`, product.status === 'approved' ? 'green' : 'yellow');
    log(`   Image URL: ${product.image_url || 'N/A'}`, 'blue');
    log(`   Starting Price: $${product.starting_price}`, 'blue');
    log(`   Seller ID: ${product.seller_id}`, 'blue');
    log(`   Created At: ${product.created_at}`, 'blue');
    log(`   Auction End Time: ${product.auction_end_time || 'N/A'}`, 'blue');

    // Verify auction end time is in the future
    if (product.auction_end_time) {
      const endTime = new Date(product.auction_end_time);
      const now = new Date();
      const isValid = endTime > now;
      log(`   Auction Timer: ${isValid ? '✅ Active' : '❌ Expired'}`, isValid ? 'green' : 'red');
      if (isValid) {
        const hoursLeft = Math.floor((endTime - now) / (1000 * 60 * 60));
        log(`   Hours Remaining: ${hoursLeft}`, 'blue');
      }
    }

    return {
      success: true,
      product: product
    };
  } catch (error) {
    log(`❌ Database Query Error`, 'red');
    log(`   Error: ${error.message}`, 'red');
    return {
      success: false,
      error: error.message
    };
  }
}

// Main Test Execution
async function runE2ETest() {
  log('\n' + '='.repeat(60), 'magenta');
  log('🚀 BIDMASTER E2E PRODUCT LIFECYCLE TEST', 'magenta');
  log('='.repeat(60), 'magenta');
  log(`Base URL: ${BASE_URL}`, 'blue');
  log(`Timestamp: ${new Date().toISOString()}`, 'blue');

  const testReport = {
    timestamp: new Date().toISOString(),
    baseUrl: BASE_URL,
    steps: {},
    summary: {}
  };

  try {
    // Get test users
    log('\n📋 Getting Test Users', 'cyan');
    const seller = await getUserByRole('seller');
    const admin = await getUserByRole('superadmin') || await getUserByRole('admin');
    const buyer = await getUserByRole('buyer');

    log(`   Seller: ${seller.name} (ID: ${seller.id}, Phone: ${seller.phone})`, 'blue');
    log(`   Admin: ${admin.name} (ID: ${admin.id}, Phone: ${admin.phone})`, 'blue');
    log(`   Buyer: ${buyer.name} (ID: ${buyer.id}, Phone: ${buyer.phone})`, 'blue');

    // Generate tokens
    const sellerToken = generateToken(seller);
    const adminToken = generateToken(admin);
    const buyerToken = generateToken(buyer);

    // STEP 1: Upload Image
    const uploadResult = await uploadImage(sellerToken);
    testReport.steps.step1_uploadImage = uploadResult;
    if (!uploadResult.success) {
      log('\n❌ Test Failed at Step 1: Image Upload', 'red');
      return testReport;
    }

    // STEP 2: Create Product
    const createResult = await createProductAsSeller(sellerToken, uploadResult.imageUrl);
    testReport.steps.step2_createProduct = createResult;
    if (!createResult.success) {
      log('\n❌ Test Failed at Step 2: Product Creation', 'red');
      return testReport;
    }

    const productId = createResult.productId;

    // STEP 3: Verify Product in Database (Pending)
    const verifyPending = await verifyProductInDatabase(productId, 'pending');
    testReport.steps.step3_verifyPending = verifyPending;
    if (!verifyPending.success || !verifyPending.statusMatch) {
      log('\n⚠️ Warning: Product status verification failed', 'yellow');
    }

    // STEP 4: Admin Approves Product
    const approveResult = await approveProductAsAdmin(adminToken, productId);
    testReport.steps.step4_approveProduct = approveResult;
    if (!approveResult.success) {
      log('\n❌ Test Failed at Step 4: Product Approval', 'red');
      return testReport;
    }

    // STEP 5: Verify Product Status Changed
    const verifyApproved = await verifyProductApproved(productId);
    testReport.steps.step5_verifyApproved = verifyApproved;

    // STEP 6: Verify in Admin Pending List (should be empty or not include this product)
    const adminPending = await verifyProductInAdminPendingList(adminToken);
    testReport.steps.step6_adminPendingList = adminPending;

    // STEP 7: Buyer Fetches Products
    const buyerProducts = await fetchProductsAsBuyer(buyerToken, productId);
    testReport.steps.step7_buyerProducts = buyerProducts;

    // STEP 8: Database Consistency
    const dbConsistency = await verifyDatabaseConsistency(productId);
    testReport.steps.step8_databaseConsistency = dbConsistency;

    // Generate Summary
    // Check if admin approval worked by verifying the product status in buyer list
    const adminApprovalWorked = approveResult.success && buyerProducts.testProductStatus === 'approved';
    const adminVerificationWorked = verifyApproved.success !== false; // Allow for database column issues
    
    testReport.summary = {
      overallSuccess: createResult.success && approveResult.success && buyerProducts.testProductFound && buyerProducts.testProductStatus === 'approved',
      sellerLayer: createResult.success && verifyPending.statusMatch ? '✅ Working perfectly' : '❌ Not functional',
      adminLayer: adminApprovalWorked && adminVerificationWorked ? '✅ Working perfectly' : approveResult.success ? '⚠️ Working (verification issue)' : '❌ Not functional',
      buyerLayer: buyerProducts.success && buyerProducts.testProductFound && buyerProducts.testProductStatus === 'approved' && buyerProducts.pendingCount === 0 
        ? '✅ Working perfectly' 
        : buyerProducts.testProductFound && buyerProducts.testProductStatus === 'approved' 
          ? '⚠️ Partially working (pending products visible)' 
          : '❌ Not functional',
      imageUpload: uploadResult.success ? '✅ Working perfectly' : '❌ Not functional',
      productId: productId
    };

    // Final Report
    log('\n' + '='.repeat(60), 'magenta');
    log('📊 TEST SUMMARY', 'magenta');
    log('='.repeat(60), 'magenta');
    log(`Overall Success: ${testReport.summary.overallSuccess ? '✅ PASSED' : '❌ FAILED'}`, 
        testReport.summary.overallSuccess ? 'green' : 'red');
    log(`\nLayer Status:`, 'cyan');
    log(`  Seller Layer: ${testReport.summary.sellerLayer}`, 
        testReport.summary.sellerLayer.includes('✅') ? 'green' : 'red');
    log(`  Admin Layer: ${testReport.summary.adminLayer}`, 
        testReport.summary.adminLayer.includes('✅') ? 'green' : 'red');
    log(`  Buyer Layer: ${testReport.summary.buyerLayer}`, 
        testReport.summary.buyerLayer.includes('✅') ? 'green' : 
        testReport.summary.buyerLayer.includes('⚠️') ? 'yellow' : 'red');
    log(`  Image Upload: ${testReport.summary.imageUpload}`, 
        testReport.summary.imageUpload.includes('✅') ? 'green' : 'red');
    log(`\nProduct ID: ${productId}`, 'blue');

  } catch (error) {
    log(`\n❌ Fatal Error: ${error.message}`, 'red');
    log(`   Stack: ${error.stack}`, 'red');
    testReport.error = error.message;
    testReport.stack = error.stack;
  } finally {
    await pool.end();
  }

  return testReport;
}

// Run the test
runE2ETest()
  .then((report) => {
    // Save report to file
    const reportPath = path.join(__dirname, '../logs/e2e_test_report.json');
    const reportDir = path.dirname(reportPath);
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    log(`\n📄 Test report saved to: ${reportPath}`, 'blue');
    process.exit(report.summary?.overallSuccess ? 0 : 1);
  })
  .catch((error) => {
    log(`\n❌ Test execution failed: ${error.message}`, 'red');
    process.exit(1);
  });

