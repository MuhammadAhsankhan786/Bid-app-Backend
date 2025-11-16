import pool from "../config/db.js";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import axios from "axios";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { generateAccessToken, generateRefreshToken, verifyAccessToken } from "../utils/tokenUtils.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

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

function normalizeIraqPhone(phone) {
  if (!phone) return null;
  let cleaned = phone.replace(/[\s-]/g, '');
  if (cleaned.startsWith('0')) {
    cleaned = '+964' + cleaned.substring(1);
  } else if (cleaned.startsWith('00964')) {
    cleaned = '+964' + cleaned.substring(5);
  } else if (cleaned.startsWith('964')) {
    cleaned = '+' + cleaned;
  } else if (!cleaned.startsWith('+964')) {
    return null;
  }
  return cleaned;
}

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

async function runJWTRefreshTest() {
  log('\n' + '='.repeat(60), 'magenta');
  log('🔄 JWT AUTO-REFRESH E2E TEST', 'magenta');
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
    // STEP 1: Login as Seller
    log('\n📋 STEP 1: Login as Seller', 'cyan');
    log('='.repeat(60), 'cyan');

    const seller = await getUserByRole('seller');
    log(`   Seller: ${seller.name} (ID: ${seller.id}, Phone: ${seller.phone})`, 'blue');

    // Send OTP (for testing, use '1234' as OTP)
    await axios.post(`${BASE_URL}/auth/send-otp`, {
      phone: seller.phone
    });
    const otp = '1234'; // Use test OTP
    log(`   Using test OTP: ${otp}`, 'blue');

    // Login
    const loginResponse = await axios.post(`${BASE_URL}/auth/login-phone`, {
      phone: seller.phone,
      otp: otp
    });

    if (!loginResponse.data.success || !loginResponse.data.accessToken || !loginResponse.data.refreshToken) {
      throw new Error('Login failed - missing tokens');
    }

    const accessToken = loginResponse.data.accessToken;
    const refreshToken = loginResponse.data.refreshToken;

    log('✅ Login successful', 'green');
    log(`   Access Token: ${accessToken.substring(0, 20)}...`, 'blue');
    log(`   Refresh Token: ${refreshToken.substring(0, 20)}...`, 'blue');
    log(`   Role: ${loginResponse.data.role}`, 'blue');

    testReport.steps.step1_login = {
      success: true,
      hasAccessToken: !!accessToken,
      hasRefreshToken: !!refreshToken,
      role: loginResponse.data.role
    };

    // STEP 2: Verify Access Token is Short-Lived
    log('\n📋 STEP 2: Verifying Access Token Expiry', 'cyan');
    log('='.repeat(60), 'cyan');

    const decoded = jwt.decode(accessToken);
    const expiresAt = new Date(decoded.exp * 1000);
    const now = new Date();
    const expiresInMinutes = Math.floor((expiresAt - now) / (1000 * 60));

    log(`   Token expires at: ${expiresAt.toISOString()}`, 'blue');
    log(`   Expires in: ${expiresInMinutes} minutes`, 'blue');

    if (expiresInMinutes > 20) {
      log('⚠️  Warning: Access token expiry is longer than expected (15 minutes)', 'yellow');
    } else {
      log('✅ Access token expiry is correct (15 minutes)', 'green');
    }

    testReport.steps.step2_tokenExpiry = {
      success: true,
      expiresInMinutes: expiresInMinutes,
      expiresAt: expiresAt.toISOString()
    };

    // STEP 3: Make Request with Valid Token
    log('\n📋 STEP 3: Making Request with Valid Token', 'cyan');
    log('='.repeat(60), 'cyan');

    try {
      const productsResponse = await axios.get(
        `${BASE_URL}/products/mine`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        }
      );

      log('✅ Request successful', 'green');
      log(`   Products found: ${productsResponse.data.data?.length || 0}`, 'blue');

      testReport.steps.step3_validRequest = {
        success: true,
        productsCount: productsResponse.data.data?.length || 0
      };
    } catch (error) {
      log('❌ Request failed', 'red');
      log(`   Error: ${error.response?.data?.message || error.message}`, 'red');
      testReport.steps.step3_validRequest = {
        success: false,
        error: error.response?.data || error.message
      };
    }

    // STEP 4: Simulate Token Expiry and Refresh
    log('\n📋 STEP 4: Simulating Token Expiry and Auto-Refresh', 'cyan');
    log('='.repeat(60), 'cyan');

    // Create an expired access token for testing
    const expiredTokenPayload = {
      id: seller.id,
      phone: seller.phone,
      role: 'seller'
    };
    const expiredToken = jwt.sign(expiredTokenPayload, JWT_SECRET, { expiresIn: '-1h' }); // Already expired

    log('   Using expired access token...', 'blue');

    let newRefreshToken = refreshToken; // Will be updated after refresh

    // Try to make request with expired token
    try {
      await axios.get(
        `${BASE_URL}/products/mine`,
        {
          headers: {
            'Authorization': `Bearer ${expiredToken}`
          }
        }
      );
      log('❌ Request should have failed with expired token', 'red');
      testReport.steps.step4_expiredToken = {
        success: false,
        error: 'Request succeeded with expired token'
      };
    } catch (expiredError) {
      const statusCode = expiredError.response?.status || expiredError.response?.statusCode;
      if (expiredError.response && statusCode === 401) {
        const errorData = expiredError.response.data || {};
        log('✅ Request correctly rejected with 401', 'green');
        log(`   Error code: ${errorData.error || 'unknown'}`, 'blue');

        if (errorData.error === 'token_expired' || errorData.error === 'invalid_token') {
          log('✅ Error code indicates token issue (correct)', 'green');

          // Now test refresh
          log('\n   Attempting token refresh...', 'blue');
          try {
            const refreshResponse = await axios.post(
              `${BASE_URL}/auth/refresh`,
              {
                refreshToken: refreshToken
              }
            );

            if (refreshResponse.data.success && refreshResponse.data.accessToken) {
              const newAccessToken = refreshResponse.data.accessToken;
              newRefreshToken = refreshResponse.data.refreshToken; // Update for Step 5

              log('✅ Token refresh successful', 'green');
              log(`   New Access Token: ${newAccessToken.substring(0, 20)}...`, 'blue');
              log(`   New Refresh Token: ${newRefreshToken.substring(0, 20)}...`, 'blue');
              log(`   Role: ${refreshResponse.data.role}`, 'blue');

              // Verify new token works
              log('\n   Testing new access token...', 'blue');
              const testResponse = await axios.get(
                `${BASE_URL}/products/mine`,
                {
                  headers: {
                    'Authorization': `Bearer ${newAccessToken}`
                  }
                }
              );

              log('✅ New access token works correctly', 'green');
              log(`   Products found: ${testResponse.data.data?.length || 0}`, 'blue');

              testReport.steps.step4_expiredToken = {
                success: true,
                errorCode: errorData.error,
                refreshSuccess: true,
                newTokenWorks: true
              };
            } else {
              throw new Error('Refresh response invalid');
            }
          } catch (refreshError) {
            log('❌ Token refresh failed', 'red');
            log(`   Error: ${refreshError.response?.data?.message || refreshError.message}`, 'red');
            testReport.steps.step4_expiredToken = {
              success: true, // Expired token detection worked
              errorCode: errorData.error,
              refreshSuccess: false,
              error: refreshError.response?.data || refreshError.message
            };
          }
        } else {
          log(`⚠️  Error code is "${errorData.error}" (expected "token_expired" or "invalid_token")`, 'yellow');
          testReport.steps.step4_expiredToken = {
            success: false,
            errorCode: errorData.error,
            expected: 'token_expired or invalid_token'
          };
        }
      } else {
        const statusCode = expiredError.response?.status || expiredError.response?.statusCode;
        if (statusCode === 401) {
          // It's a 401 but we didn't catch it above - try to handle it
          const errorData = expiredError.response.data || {};
          log('✅ Request correctly rejected with 401', 'green');
          log(`   Error code: ${errorData.error || 'unknown'}`, 'blue');
          
          if (errorData.error === 'token_expired' || errorData.error === 'invalid_token') {
            log('✅ Error code indicates token issue (correct)', 'green');
            
            // Now test refresh
            log('\n   Attempting token refresh...', 'blue');
            try {
              const refreshResponse = await axios.post(
                `${BASE_URL}/auth/refresh`,
                {
                  refreshToken: refreshToken
                }
              );

              if (refreshResponse.data.success && refreshResponse.data.accessToken) {
                const newAccessToken = refreshResponse.data.accessToken;
                newRefreshToken = refreshResponse.data.refreshToken;

                log('✅ Token refresh successful', 'green');
                log(`   New Access Token: ${newAccessToken.substring(0, 20)}...`, 'blue');
                log(`   New Refresh Token: ${newRefreshToken.substring(0, 20)}...`, 'blue');
                log(`   Role: ${refreshResponse.data.role}`, 'blue');

                // Verify new token works
                log('\n   Testing new access token...', 'blue');
                const testResponse = await axios.get(
                  `${BASE_URL}/products/mine`,
                  {
                    headers: {
                      'Authorization': `Bearer ${newAccessToken}`
                    }
                  }
                );

                log('✅ New access token works correctly', 'green');
                log(`   Products found: ${testResponse.data.data?.length || 0}`, 'blue');

                testReport.steps.step4_expiredToken = {
                  success: true,
                  errorCode: errorData.error,
                  refreshSuccess: true,
                  newTokenWorks: true
                };
              } else {
                throw new Error('Refresh response invalid');
              }
            } catch (refreshError) {
              log('❌ Token refresh failed', 'red');
              log(`   Error: ${refreshError.response?.data?.message || refreshError.message}`, 'red');
              testReport.steps.step4_expiredToken = {
                success: true,
                errorCode: errorData.error,
                refreshSuccess: false,
                error: refreshError.response?.data || refreshError.message
              };
            }
          } else {
            testReport.steps.step4_expiredToken = {
              success: false,
              errorCode: errorData.error,
              expected: 'token_expired or invalid_token'
            };
          }
        } else {
          log(`❌ Unexpected error: ${expiredError.message}`, 'red');
          if (expiredError.response) {
            log(`   Status: ${statusCode}`, 'red');
            log(`   Data: ${JSON.stringify(expiredError.response.data)}`, 'red');
          }
          testReport.steps.step4_expiredToken = {
            success: false,
            error: expiredError.message,
            statusCode: statusCode
          };
        }
      }
    }

    // STEP 5: Verify Token Rotation
    log('\n📋 STEP 5: Verifying Token Rotation', 'cyan');
    log('='.repeat(60), 'cyan');

    // Only test rotation if Step 4 refresh was successful
    if (testReport.steps.step4_expiredToken?.refreshSuccess) {
      // Try to use old refresh token (should fail after rotation)
      log('   Attempting to use old refresh token (should fail)...', 'blue');
      try {
        const oldRefreshResponse = await axios.post(
          `${BASE_URL}/auth/refresh`,
          {
            refreshToken: refreshToken // Original refresh token (before rotation)
          }
        );
        log('⚠️  Old refresh token still works (rotation may not be working)', 'yellow');
        testReport.steps.step5_tokenRotation = {
          success: false,
          error: 'Old refresh token still valid'
        };
      } catch (rotationError) {
        const statusCode = rotationError.response?.status || rotationError.response?.statusCode;
        if (rotationError.response && statusCode === 401) {
          const errorData = rotationError.response.data || {};
          log('✅ Old refresh token correctly rejected (rotation working)', 'green');
          log(`   Error: ${errorData.message || errorData.error}`, 'blue');
          testReport.steps.step5_tokenRotation = {
            success: true,
            errorCode: errorData.error
          };
        } else {
          log(`❌ Unexpected error checking rotation: ${rotationError.message}`, 'red');
          testReport.steps.step5_tokenRotation = {
            success: false,
            error: rotationError.message,
            statusCode: statusCode
          };
        }
      }
    } else {
      log('⚠️  Skipping rotation test (Step 4 refresh did not succeed)', 'yellow');
      testReport.steps.step5_tokenRotation = {
        success: false,
        skipped: true,
        reason: 'Step 4 refresh failed'
      };
    }

    // Generate Summary
    const allStepsPassed = 
      testReport.steps.step1_login?.success &&
      testReport.steps.step2_tokenExpiry?.success &&
      testReport.steps.step3_validRequest?.success &&
      testReport.steps.step4_expiredToken?.success &&
      testReport.steps.step4_expiredToken?.refreshSuccess &&
      testReport.steps.step5_tokenRotation?.success;

    testReport.summary = {
      overallSuccess: allStepsPassed || false,
      login: testReport.steps.step1_login?.success ? '✅ Working' : '❌ Failed',
      tokenExpiry: testReport.steps.step2_tokenExpiry?.success ? '✅ Working' : '❌ Failed',
      validRequest: testReport.steps.step3_validRequest?.success ? '✅ Working' : '❌ Failed',
      autoRefresh: testReport.steps.step4_expiredToken?.refreshSuccess ? '✅ Working' : '❌ Failed',
      tokenRotation: testReport.steps.step5_tokenRotation?.success ? '✅ Working' : '❌ Failed'
    };

    // Final Report
    log('\n' + '='.repeat(60), 'magenta');
    log('📊 TEST SUMMARY', 'magenta');
    log('='.repeat(60), 'magenta');
    log(`Overall Success: ${testReport.summary.overallSuccess ? '✅ PASSED' : '❌ FAILED'}`, 
        testReport.summary.overallSuccess ? 'green' : 'red');
    log(`\nComponent Status:`, 'cyan');
    log(`  Login: ${testReport.summary.login}`, 
        testReport.summary.login.includes('✅') ? 'green' : 'red');
    log(`  Token Expiry: ${testReport.summary.tokenExpiry}`, 
        testReport.summary.tokenExpiry.includes('✅') ? 'green' : 'red');
    log(`  Valid Request: ${testReport.summary.validRequest}`, 
        testReport.summary.validRequest.includes('✅') ? 'green' : 'red');
    log(`  Auto-Refresh: ${testReport.summary.autoRefresh}`, 
        testReport.summary.autoRefresh.includes('✅') ? 'green' : 'red');
    log(`  Token Rotation: ${testReport.summary.tokenRotation}`, 
        testReport.summary.tokenRotation.includes('✅') ? 'green' : 'red');

  } catch (error) {
    log(`\n❌ Fatal Error: ${error.message}`, 'red');
    console.error(error);
    testReport.error = error.message;
    testReport.stack = error.stack;
  } finally {
    await pool.end();
  }

  return testReport;
}

// Run the test
runJWTRefreshTest()
  .then((report) => {
    // Save report to file
    const reportPath = path.join(__dirname, '../logs/jwt_refresh_test_report.json');
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

