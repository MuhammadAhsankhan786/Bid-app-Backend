import pool from "../config/db.js";
import axios from "axios";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = process.env.BASE_URL || process.env.PRODUCTION_URL || "https://bidmaster-api.onrender.com/api";
const JWT_SECRET = process.env.JWT_SECRET;
const MONITOR_INTERVAL = 10 * 60 * 1000; // 10 minutes in milliseconds
const REPORTS_DIR = path.join(__dirname, '../logs/monitoring');

// Ensure reports directory exists
if (!fs.existsSync(REPORTS_DIR)) {
  fs.mkdirSync(REPORTS_DIR, { recursive: true });
}

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
  const timestamp = new Date().toISOString();
  console.log(`${colors[color]}[${timestamp}] ${message}${colors.reset}`);
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
    throw new Error(`No ${role} user found in database.`);
  }
  return result.rows[0];
}

async function performHealthCheck() {
  const checkId = Date.now();
  const report = {
    checkId,
    timestamp: new Date().toISOString(),
    baseUrl: BASE_URL,
    status: 'running',
    steps: {},
    summary: {},
    errors: []
  };

  try {
    log('\n' + '='.repeat(70), 'magenta');
    log(`🔄 JWT AUTO-REFRESH PRODUCTION MONITOR - Check #${checkId}`, 'magenta');
    log('='.repeat(70), 'magenta');
    log(`Base URL: ${BASE_URL}`, 'blue');

    // STEP 1: Login as Seller
    log('\n📋 STEP 1: Login as Seller', 'cyan');
    const seller = await getUserByRole('seller_products');
    log(`   Seller: ${seller.name} (ID: ${seller.id}, Phone: ${seller.phone})`, 'blue');

    // Send OTP
    await axios.post(`${BASE_URL}/auth/send-otp`, {
      phone: seller.phone
    });
    // OTP is sent via Twilio Verify API
    // For testing, check SMS for OTP code
    const otp = process.env.TEST_OTP || 'CHECK_SMS_FOR_OTP';

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
    log(`   Access Token: ${accessToken.substring(0, 30)}...`, 'blue');
    log(`   Refresh Token: ${refreshToken.substring(0, 30)}...`, 'blue');
    log(`   Role: ${loginResponse.data.role}`, 'blue');

    report.steps.login = {
      success: true,
      hasAccessToken: !!accessToken,
      hasRefreshToken: !!refreshToken,
      role: loginResponse.data.role
    };

    // STEP 2: Verify Token Expiry
    log('\n📋 STEP 2: Verifying Token Expiry', 'cyan');
    const decoded = jwt.decode(accessToken);
    const expiresAt = new Date(decoded.exp * 1000);
    const now = new Date();
    const expiresInMinutes = Math.floor((expiresAt - now) / (1000 * 60));

    log(`   Token expires at: ${expiresAt.toISOString()}`, 'blue');
    log(`   Expires in: ${expiresInMinutes} minutes`, 'blue');

    report.steps.tokenExpiry = {
      success: true,
      expiresInMinutes,
      expiresAt: expiresAt.toISOString()
    };

    // STEP 3: Test Protected Route with Valid Token
    log('\n📋 STEP 3: Testing Protected Route with Valid Token', 'cyan');
    try {
      const productsResponse = await axios.get(
        `${BASE_URL}/products/mine`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        }
      );

      log('✅ Protected route accessible with valid token', 'green');
      log(`   Products found: ${productsResponse.data.data?.length || 0}`, 'blue');

      report.steps.validTokenRequest = {
        success: true,
        productsCount: productsResponse.data.data?.length || 0
      };
    } catch (error) {
      log(`❌ Protected route failed: ${error.message}`, 'red');
      report.steps.validTokenRequest = {
        success: false,
        error: error.response?.data || error.message
      };
      report.errors.push(`Valid token request failed: ${error.message}`);
    }

    // STEP 4: Simulate Token Expiry and Auto-Refresh
    log('\n📋 STEP 4: Simulating Token Expiry and Auto-Refresh', 'cyan');
    
    // Create expired token
    const expiredTokenPayload = {
      id: seller.id,
      phone: seller.phone,
      role: 'seller_products'
    };
    const expiredToken = jwt.sign(expiredTokenPayload, JWT_SECRET, { expiresIn: '-1h' });

    log('   Using expired access token...', 'blue');

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
      report.steps.expiredTokenTest = {
        success: false,
        error: 'Request succeeded with expired token'
      };
      report.errors.push('Expired token was accepted');
    } catch (expiredError) {
      const statusCode = expiredError.response?.status || expiredError.response?.statusCode;
      if (statusCode === 401) {
        const errorData = expiredError.response.data || {};
        log('✅ Expired token correctly rejected (401)', 'green');
        log(`   Error code: ${errorData.error || 'unknown'}`, 'blue');

        if (errorData.error === 'token_expired' || errorData.error === 'invalid_token') {
          log('✅ Error code indicates token expiry (correct)', 'green');

          // Test refresh endpoint
          log('\n   Calling /api/auth/refresh...', 'blue');
          try {
            const refreshResponse = await axios.post(
              `${BASE_URL}/auth/refresh`,
              {
                refreshToken: refreshToken
              }
            );

            if (refreshResponse.data.success && refreshResponse.data.accessToken) {
              const newAccessToken = refreshResponse.data.accessToken;
              const newRefreshToken = refreshResponse.data.refreshToken;

              log('✅ Token refresh successful', 'green');
              log(`   New Access Token: ${newAccessToken.substring(0, 30)}...`, 'blue');
              log(`   New Refresh Token: ${newRefreshToken.substring(0, 30)}...`, 'blue');
              log(`   Role: ${refreshResponse.data.role}`, 'blue');

              // Verify new token works
              log('\n   Testing new access token on protected route...', 'blue');
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

              report.steps.expiredTokenTest = {
                success: true,
                errorCode: errorData.error,
                refreshSuccess: true,
                newTokenWorks: true,
                productsCount: testResponse.data.data?.length || 0
              };

              // STEP 5: Verify Token Rotation
              log('\n📋 STEP 5: Verifying Token Rotation', 'cyan');
              log('   Attempting to use old refresh token (should fail)...', 'blue');
              
              try {
                await axios.post(
                  `${BASE_URL}/auth/refresh`,
                  {
                    refreshToken: refreshToken // Old refresh token
                  }
                );
                log('⚠️  Old refresh token still works (rotation issue)', 'yellow');
                report.steps.tokenRotation = {
                  success: false,
                  error: 'Old refresh token still valid'
                };
                report.errors.push('Token rotation not working - old token still valid');
              } catch (rotationError) {
                const rotationStatusCode = rotationError.response?.status || rotationError.response?.statusCode;
                if (rotationStatusCode === 401) {
                  const rotationErrorData = rotationError.response.data || {};
                  log('✅ Old refresh token correctly rejected (rotation working)', 'green');
                  log(`   Error: ${rotationErrorData.message || rotationErrorData.error}`, 'blue');
                  report.steps.tokenRotation = {
                    success: true,
                    errorCode: rotationErrorData.error
                  };
                } else {
                  log(`❌ Unexpected error: ${rotationError.message}`, 'red');
                  report.steps.tokenRotation = {
                    success: false,
                    error: rotationError.message
                  };
                  report.errors.push(`Token rotation test failed: ${rotationError.message}`);
                }
              }
            } else {
              throw new Error('Refresh response invalid');
            }
          } catch (refreshError) {
            log(`❌ Token refresh failed: ${refreshError.message}`, 'red');
            log(`   Error: ${refreshError.response?.data?.message || refreshError.message}`, 'red');
            report.steps.expiredTokenTest = {
              success: true, // Expired token detection worked
              errorCode: errorData.error,
              refreshSuccess: false,
              error: refreshError.response?.data || refreshError.message
            };
            report.errors.push(`Token refresh failed: ${refreshError.message}`);
          }
        } else {
          log(`⚠️  Unexpected error code: ${errorData.error}`, 'yellow');
          report.steps.expiredTokenTest = {
            success: false,
            errorCode: errorData.error,
            expected: 'token_expired or invalid_token'
          };
          report.errors.push(`Unexpected error code: ${errorData.error}`);
        }
      } else {
        log(`❌ Unexpected status code: ${statusCode}`, 'red');
        report.steps.expiredTokenTest = {
          success: false,
          statusCode: statusCode,
          error: expiredError.message
        };
        report.errors.push(`Unexpected status code: ${statusCode}`);
      }
    }

    // Generate Summary
    const allStepsPassed = 
      report.steps.login?.success &&
      report.steps.tokenExpiry?.success &&
      report.steps.validTokenRequest?.success &&
      report.steps.expiredTokenTest?.success &&
      report.steps.expiredTokenTest?.refreshSuccess &&
      report.steps.tokenRotation?.success;

    report.summary = {
      overallSuccess: allStepsPassed || false,
      login: report.steps.login?.success ? '✅ Working' : '❌ Failed',
      tokenExpiry: report.steps.tokenExpiry?.success ? '✅ Working' : '❌ Failed',
      validRequest: report.steps.validTokenRequest?.success ? '✅ Working' : '❌ Failed',
      autoRefresh: report.steps.expiredTokenTest?.refreshSuccess ? '✅ Working' : '❌ Failed',
      tokenRotation: report.steps.tokenRotation?.success ? '✅ Working' : '❌ Failed',
      errorCount: report.errors.length
    };

    report.status = allStepsPassed ? 'success' : 'failed';

    // Final Report
    log('\n' + '='.repeat(70), 'magenta');
    log('📊 MONITORING SUMMARY', 'magenta');
    log('='.repeat(70), 'magenta');
    log(`Overall Status: ${report.summary.overallSuccess ? '✅ HEALTHY' : '❌ UNHEALTHY'}`, 
        report.summary.overallSuccess ? 'green' : 'red');
    log(`\nComponent Status:`, 'cyan');
    log(`  Login: ${report.summary.login}`, 
        report.summary.login.includes('✅') ? 'green' : 'red');
    log(`  Token Expiry: ${report.summary.tokenExpiry}`, 
        report.summary.tokenExpiry.includes('✅') ? 'green' : 'red');
    log(`  Valid Request: ${report.summary.validRequest}`, 
        report.summary.validRequest.includes('✅') ? 'green' : 'red');
    log(`  Auto-Refresh: ${report.summary.autoRefresh}`, 
        report.summary.autoRefresh.includes('✅') ? 'green' : 'red');
    log(`  Token Rotation: ${report.summary.tokenRotation}`, 
        report.summary.tokenRotation.includes('✅') ? 'green' : 'red');
    
    if (report.errors.length > 0) {
      log(`\n⚠️  Errors (${report.errors.length}):`, 'yellow');
      report.errors.forEach((error, index) => {
        log(`   ${index + 1}. ${error}`, 'yellow');
      });
    }

    return report;

  } catch (error) {
    log(`\n❌ Fatal Error: ${error.message}`, 'red');
    console.error(error);
    report.status = 'error';
    report.error = error.message;
    report.stack = error.stack;
    report.summary = {
      overallSuccess: false,
      error: error.message
    };
    return report;
  }
}

async function saveReport(report) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const reportPath = path.join(REPORTS_DIR, `jwt_monitor_${timestamp}.json`);
  
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  
  // Also save latest report
  const latestPath = path.join(REPORTS_DIR, 'jwt_monitor_latest.json');
  fs.writeFileSync(latestPath, JSON.stringify(report, null, 2));
  
  // Generate rolling summary (last 24 hours)
  await generateRollingSummary();
  
  log(`📄 Report saved: ${reportPath}`, 'blue');
  log(`📄 Latest report: ${latestPath}`, 'blue');
}

async function generateRollingSummary() {
  try {
    const files = fs.readdirSync(REPORTS_DIR)
      .filter(f => f.startsWith('jwt_monitor_') && f.endsWith('.json') && f !== 'jwt_monitor_latest.json')
      .map(f => ({
        name: f,
        path: path.join(REPORTS_DIR, f),
        time: fs.statSync(path.join(REPORTS_DIR, f)).mtime
      }))
      .sort((a, b) => b.time - a.time);

    const last24Hours = files.filter(f => {
      const hoursAgo = (Date.now() - f.time.getTime()) / (1000 * 60 * 60);
      return hoursAgo <= 24;
    });

    const summary = {
      generatedAt: new Date().toISOString(),
      period: '24 hours',
      totalChecks: last24Hours.length,
      successfulChecks: 0,
      failedChecks: 0,
      errorChecks: 0,
      components: {
        login: { working: 0, failed: 0 },
        tokenExpiry: { working: 0, failed: 0 },
        validRequest: { working: 0, failed: 0 },
        autoRefresh: { working: 0, failed: 0 },
        tokenRotation: { working: 0, failed: 0 }
      },
      recentErrors: [],
      uptime: {
        percentage: 0,
        status: 'unknown'
      }
    };

    for (const file of last24Hours) {
      try {
        const report = JSON.parse(fs.readFileSync(file.path, 'utf8'));
        
        if (report.status === 'success') {
          summary.successfulChecks++;
        } else if (report.status === 'failed') {
          summary.failedChecks++;
        } else if (report.status === 'error') {
          summary.errorChecks++;
        }

        // Component status
        if (report.summary) {
          if (report.summary.login?.includes('✅')) summary.components.login.working++;
          else summary.components.login.failed++;
          
          if (report.summary.tokenExpiry?.includes('✅')) summary.components.tokenExpiry.working++;
          else summary.components.tokenExpiry.failed++;
          
          if (report.summary.validRequest?.includes('✅')) summary.components.validRequest.working++;
          else summary.components.validRequest.failed++;
          
          if (report.summary.autoRefresh?.includes('✅')) summary.components.autoRefresh.working++;
          else summary.components.autoRefresh.failed++;
          
          if (report.summary.tokenRotation?.includes('✅')) summary.components.tokenRotation.working++;
          else summary.components.tokenRotation.failed++;
        }

        // Collect recent errors
        if (report.errors && report.errors.length > 0) {
          summary.recentErrors.push({
            timestamp: report.timestamp,
            errors: report.errors
          });
        }
      } catch (parseError) {
        // Skip corrupted files
      }
    }

    // Calculate uptime
    if (summary.totalChecks > 0) {
      summary.uptime.percentage = (summary.successfulChecks / summary.totalChecks) * 100;
      summary.uptime.status = summary.uptime.percentage >= 95 ? 'excellent' :
                              summary.uptime.percentage >= 80 ? 'good' :
                              summary.uptime.percentage >= 60 ? 'degraded' : 'poor';
    }

    // Keep only last 10 errors
    summary.recentErrors = summary.recentErrors.slice(-10);

    const summaryPath = path.join(REPORTS_DIR, 'jwt_monitor_summary.json');
    fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
    
    log(`📊 Rolling summary generated (${summary.totalChecks} checks in last 24h)`, 'blue');
    log(`   Uptime: ${summary.uptime.percentage.toFixed(2)}% (${summary.uptime.status})`, 
        summary.uptime.percentage >= 95 ? 'green' : 
        summary.uptime.percentage >= 80 ? 'yellow' : 'red');
    
  } catch (error) {
    log(`⚠️  Error generating summary: ${error.message}`, 'yellow');
  }
}

async function runMonitoringCycle() {
  const report = await performHealthCheck();
  await saveReport(report);
  
  // Don't close pool - keep connection alive for continuous monitoring
  return report;
}

export async function runOnce() {
  try {
    const report = await runMonitoringCycle();
    // Close pool after one-time run
    await pool.end();
    return report;
  } catch (error) {
    await pool.end();
    throw error;
  }
}

// Main execution
async function startMonitoring() {
  log('\n🚀 Starting JWT Auto-Refresh Production Monitor', 'magenta');
  log(`   Interval: ${MONITOR_INTERVAL / 1000 / 60} minutes`, 'blue');
  log(`   Base URL: ${BASE_URL}`, 'blue');
  log(`   Reports Directory: ${REPORTS_DIR}`, 'blue');
  log('\n' + '='.repeat(70), 'magenta');

  // Run initial check
  await runMonitoringCycle();

  // Set up interval for continuous monitoring
  const intervalId = setInterval(async () => {
    try {
      await runMonitoringCycle();
    } catch (error) {
      log(`❌ Monitoring cycle error: ${error.message}`, 'red');
    }
  }, MONITOR_INTERVAL);

  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    log('\n\n🛑 Shutting down monitor...', 'yellow');
    clearInterval(intervalId);
    await pool.end();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    log('\n\n🛑 Shutting down monitor...', 'yellow');
    clearInterval(intervalId);
    await pool.end();
    process.exit(0);
  });

  log('\n✅ Monitor running. Press Ctrl+C to stop.', 'green');
}

// Run if executed directly
const isMainModule = import.meta.url === `file://${process.argv[1]}` || 
                     (process.argv[1] && process.argv[1].includes('jwt_refresh_monitor.js')) ||
                     import.meta.url.endsWith('jwt_refresh_monitor.js');

if (isMainModule) {
  startMonitoring().catch((error) => {
    log(`❌ Fatal error: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
  });
}

export { runMonitoringCycle, performHealthCheck };

