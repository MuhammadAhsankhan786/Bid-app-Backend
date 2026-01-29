import http from "http";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const HEALTH_URL = "http://localhost:5000/api/health";
const PING_INTERVAL = 5000; // 5 seconds
const SUMMARY_INTERVAL = 12; // Every 12 checks (≈1 minute)
const LOG_FILE = path.join(__dirname, "..", "..", "logs", "system_health.log");

// Ensure logs directory exists
const logDir = path.join(__dirname, "..", "..", "logs");
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

let consecutiveFailures = 0;
let checkCount = 0;
let successCount = 0;
let failureCount = 0;
let isMonitoring = true;
let startTime = Date.now();

// Get ISO timestamp
function getISOTimestamp() {
  return new Date().toISOString();
}

// Append to log file
function appendLog(message) {
  const logLine = `[${getISOTimestamp()}] ${message}\n`;
  try {
    fs.appendFileSync(LOG_FILE, logLine);
  } catch (error) {
    // Silently fail if logging fails
  }
}

// Ping health endpoint
function pingHealth() {
  return new Promise((resolve) => {
    const startPing = Date.now();
    const timestamp = getISOTimestamp();
    
    http.get(HEALTH_URL, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        const latency = Date.now() - startPing;
        
        try {
          const health = JSON.parse(data);
          
          if (res.statusCode === 200 && health.status === 'healthy' && health.database === 'connected') {
            consecutiveFailures = 0;
            successCount++;
            const statusMessage = `🟢 Server Healthy — API online & DB connected | Latency: ${latency}ms`;
            console.log(`[${timestamp}] ${statusMessage}`);
            
            const logMessage = `status: healthy | DB: connected | latency: ${latency}ms`;
            appendLog(logMessage);
            
            resolve({ success: true, health, latency });
          } else {
            consecutiveFailures++;
            failureCount++;
            const statusMessage = `🔴 Server Down — no response or DB disconnected | Status: ${health.status} | DB: ${health.database}`;
            console.log(`[${timestamp}] ${statusMessage}`);
            
            const logMessage = `status: ${health.status} | DB: ${health.database} | latency: ${latency}ms`;
            appendLog(logMessage);
            
            if (consecutiveFailures >= 3) {
              const warningMessage = `❌ System unstable — investigate backend or DB. (${consecutiveFailures} consecutive failures)`;
              console.log(`[${timestamp}] ${warningMessage}`);
              appendLog(`WARNING: ${warningMessage}`);
            }
            
            resolve({ success: false, health, latency });
          }
        } catch (error) {
          consecutiveFailures++;
          failureCount++;
          const statusMessage = `🔴 Server Down — no response or DB disconnected | Parse Error: ${error.message}`;
          console.log(`[${timestamp}] ${statusMessage}`);
          
          const logMessage = `status: error | DB: unknown | latency: ${latency}ms | error: ${error.message}`;
          appendLog(logMessage);
          
          if (consecutiveFailures >= 3) {
            const warningMessage = `❌ System unstable — investigate backend or DB. (${consecutiveFailures} consecutive failures)`;
            console.log(`[${timestamp}] ${warningMessage}`);
            appendLog(`WARNING: ${warningMessage}`);
          }
          
          resolve({ success: false, error: error.message, latency });
        }
      });
    }).on('error', (error) => {
      consecutiveFailures++;
      failureCount++;
      const timestamp = getISOTimestamp();
      const statusMessage = `🔴 Server Down — no response or DB disconnected | Error: ${error.message}`;
      console.log(`[${timestamp}] ${statusMessage}`);
      
      const logMessage = `status: error | DB: unknown | latency: timeout | error: ${error.message}`;
      appendLog(logMessage);
      
      if (consecutiveFailures >= 3) {
        const warningMessage = `❌ System unstable — investigate backend or DB. (${consecutiveFailures} consecutive failures)`;
        console.log(`[${timestamp}] ${warningMessage}`);
        appendLog(`WARNING: ${warningMessage}`);
      }
      
      resolve({ success: false, error: error.message, latency: null });
    });
    
    // Set timeout for request (10 seconds)
    res?.socket?.setTimeout?.(10000, () => {
      consecutiveFailures++;
      failureCount++;
      const timestamp = getISOTimestamp();
      const statusMessage = `🔴 Server Down — no response or DB disconnected | Timeout`;
      console.log(`[${timestamp}] ${statusMessage}`);
      
      const logMessage = `status: timeout | DB: unknown | latency: >10000ms`;
      appendLog(logMessage);
      
      if (consecutiveFailures >= 3) {
        const warningMessage = `❌ System unstable — investigate backend or DB. (${consecutiveFailures} consecutive failures)`;
        console.log(`[${timestamp}] ${warningMessage}`);
        appendLog(`WARNING: ${warningMessage}`);
      }
      
      resolve({ success: false, error: 'Request timeout', latency: null });
    });
  });
}

// Print summary
function printSummary() {
  const currentStatus = consecutiveFailures >= 3 ? '🔴' : (consecutiveFailures === 0 ? '🟢' : '🟡');
  const timestamp = getISOTimestamp();
  
  console.log('\n' + '='.repeat(70));
  console.log(`🔁 Health Summary (last 60s) - [${timestamp}]`);
  console.log(`   - Successful checks: ${successCount}`);
  console.log(`   - Failures: ${failureCount}`);
  console.log(`   - Current Status: ${currentStatus}`);
  console.log('='.repeat(70) + '\n');
  
  appendLog(`SUMMARY: successful: ${successCount}, failures: ${failureCount}, status: ${currentStatus}`);
  
  // Reset counters for next interval
  successCount = 0;
  failureCount = 0;
}

// Main monitoring loop
async function startMonitoring() {
  console.log('🔍 BidMaster Auto Health Monitor Started');
  console.log(`   Health Endpoint: ${HEALTH_URL}`);
  console.log(`   Ping Interval: ${PING_INTERVAL / 1000} seconds`);
  console.log(`   Summary Every: ${SUMMARY_INTERVAL} checks (≈${(SUMMARY_INTERVAL * PING_INTERVAL / 1000)}s)`);
  console.log(`   Log File: ${LOG_FILE}`);
  console.log('   Press Ctrl+C to stop monitoring\n');
  console.log('='.repeat(70));
  
  appendLog('Auto Health Monitor Started');
  
  // Initial ping
  await pingHealth();
  checkCount++;
  
  // Set up interval
  const intervalId = setInterval(async () => {
    if (!isMonitoring) {
      clearInterval(intervalId);
      return;
    }
    
    await pingHealth();
    checkCount++;
    
    // Print summary every 12 checks
    if (checkCount % SUMMARY_INTERVAL === 0) {
      printSummary();
    }
  }, PING_INTERVAL);
  
  // Handle Ctrl+C
  process.on('SIGINT', () => {
    console.log('\n' + '='.repeat(70));
    console.log('🛑 Monitoring stopped by user');
    const totalTime = Math.floor((Date.now() - startTime) / 1000);
    console.log(`   Total checks: ${checkCount}`);
    console.log(`   Total time: ${totalTime}s`);
    console.log('='.repeat(70));
    
    appendLog(`Monitoring stopped. Total checks: ${checkCount}, Total time: ${totalTime}s`);
    isMonitoring = false;
    clearInterval(intervalId);
    process.exit(0);
  });
  
  // Handle other termination signals
  process.on('SIGTERM', () => {
    console.log('\n🛑 Monitoring stopped');
    appendLog('Monitoring stopped (SIGTERM)');
    isMonitoring = false;
    clearInterval(intervalId);
    process.exit(0);
  });
}

// Start monitoring
startMonitoring().catch((error) => {
  console.error('❌ Fatal error in monitoring:', error);
  appendLog(`FATAL ERROR: ${error.message}`);
  process.exit(1);
});


