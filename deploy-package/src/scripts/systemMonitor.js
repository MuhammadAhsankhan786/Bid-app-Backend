import http from "http";

const HEALTH_URL = "http://localhost:5000/api/health";
const PING_INTERVAL = 5000; // 5 seconds
let consecutiveFailures = 0;
let startTime = Date.now();
let isMonitoring = true;

// Format uptime
function formatUptime(seconds) {
  if (seconds < 60) return `${Math.floor(seconds)}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${Math.floor(seconds % 60)}s`;
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  return `${hours}h ${minutes}m ${secs}s`;
}

// Get current timestamp
function getTimestamp() {
  return new Date().toLocaleString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
}

// Ping health endpoint
function pingHealth() {
  return new Promise((resolve) => {
    const startPing = Date.now();
    let resolved = false;
    
    // Set timeout for request (10 seconds)
    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        consecutiveFailures++;
        console.log(`[${getTimestamp()}] 🔴 Server Offline or DB Disconnected | Timeout`);
        
        if (consecutiveFailures >= 3) {
          console.log(`[${getTimestamp()}] ❌ System unstable — check backend or Neon DB connection. (${consecutiveFailures} consecutive failures)`);
        }
        resolve({ success: false, error: 'Request timeout' });
      }
    }, 10000);
    
    const req = http.get(HEALTH_URL, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (resolved) return;
        resolved = true;
        clearTimeout(timeout);
        
        const latency = Date.now() - startPing;
        
        try {
          const health = JSON.parse(data);
          
          if (res.statusCode === 200 && health.status === 'healthy' && health.database === 'connected') {
            consecutiveFailures = 0;
            const uptime = (Date.now() - startTime) / 1000;
            console.log(`[${getTimestamp()}] 🟢 Server Online (DB Connected) | Uptime: ${formatUptime(uptime)} | Latency: ${latency}ms`);
            resolve({ success: true, health });
          } else {
            consecutiveFailures++;
            console.log(`[${getTimestamp()}] 🔴 Server Offline or DB Disconnected | Status: ${health.status} | DB: ${health.database}`);
            
            if (consecutiveFailures >= 3) {
              console.log(`[${getTimestamp()}] ❌ System unstable — check backend or Neon DB connection. (${consecutiveFailures} consecutive failures)`);
            }
            resolve({ success: false, health });
          }
        } catch (error) {
          consecutiveFailures++;
          console.log(`[${getTimestamp()}] 🔴 Server Offline or DB Disconnected | Parse Error: ${error.message}`);
          
          if (consecutiveFailures >= 3) {
            console.log(`[${getTimestamp()}] ❌ System unstable — check backend or Neon DB connection. (${consecutiveFailures} consecutive failures)`);
          }
          resolve({ success: false, error: error.message });
        }
      });
    });
    
    req.on('error', (error) => {
      if (resolved) return;
      resolved = true;
      clearTimeout(timeout);
      
      consecutiveFailures++;
      console.log(`[${getTimestamp()}] 🔴 Server Offline or DB Disconnected | Error: ${error.message}`);
      
      if (consecutiveFailures >= 3) {
        console.log(`[${getTimestamp()}] ❌ System unstable — check backend or Neon DB connection. (${consecutiveFailures} consecutive failures)`);
      }
      resolve({ success: false, error: error.message });
    });
  });
}

// Main monitoring loop
async function startMonitoring() {
  console.log('🔍 BidMaster System Monitor Started');
  console.log(`   Health Endpoint: ${HEALTH_URL}`);
  console.log(`   Ping Interval: ${PING_INTERVAL / 1000} seconds`);
  console.log('   Press Ctrl+C to stop monitoring\n');
  console.log('='.repeat(70));
  
  // Initial ping
  await pingHealth();
  
  // Set up interval
  const intervalId = setInterval(async () => {
    if (!isMonitoring) {
      clearInterval(intervalId);
      return;
    }
    await pingHealth();
  }, PING_INTERVAL);
  
  // Handle Ctrl+C
  process.on('SIGINT', () => {
    console.log('\n' + '='.repeat(70));
    console.log('🛑 Monitoring stopped by user');
    console.log(`   Total monitoring time: ${formatUptime((Date.now() - startTime) / 1000)}`);
    isMonitoring = false;
    clearInterval(intervalId);
    process.exit(0);
  });
  
  // Handle other termination signals
  process.on('SIGTERM', () => {
    console.log('\n🛑 Monitoring stopped');
    isMonitoring = false;
    clearInterval(intervalId);
    process.exit(0);
  });
}

// Start monitoring
startMonitoring().catch((error) => {
  console.error('❌ Fatal error in monitoring:', error);
  process.exit(1);
});

