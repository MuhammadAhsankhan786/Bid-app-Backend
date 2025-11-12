# 🔄 BidMaster Auto Health Monitor

## Overview

Upgraded continuous monitoring system that checks `/api/health` endpoint every 5 seconds, logs all system states in real-time, and provides periodic summaries.

## Features

- ✅ Continuous monitoring every 5 seconds
- ✅ Real-time formatted console logs with ISO timestamps
- ✅ Periodic summaries every 12 checks (≈1 minute)
- ✅ File logging to `/logs/system_health.log`
- ✅ Detects system instability (3 consecutive failures)
- ✅ Graceful error handling (never crashes)
- ✅ Runs indefinitely until stopped

## Usage

### Start Auto Monitoring

```bash
cd "Bid app Backend"
npm run auto-monitor
```

### Expected Output

**When System is Healthy:**
```
🔍 BidMaster Auto Health Monitor Started
   Health Endpoint: http://localhost:5000/api/health
   Ping Interval: 5 seconds
   Summary Every: 12 checks (≈60s)
   Log File: D:\...\logs\system_health.log
   Press Ctrl+C to stop monitoring

======================================================================
[2025-11-11T00:30:15.123Z] 🟢 Server Healthy — API online & DB connected | Latency: 45ms
[2025-11-11T00:30:20.123Z] 🟢 Server Healthy — API online & DB connected | Latency: 42ms
[2025-11-11T00:30:25.123Z] 🟢 Server Healthy — API online & DB connected | Latency: 38ms
...
[2025-11-11T00:31:15.123Z] 🟢 Server Healthy — API online & DB connected | Latency: 40ms

======================================================================
🔁 Health Summary (last 60s) - [2025-11-11T00:31:15.123Z]
   - Successful checks: 12
   - Failures: 0
   - Current Status: 🟢
======================================================================
```

**When System is Unhealthy:**
```
[2025-11-11T00:30:15.123Z] 🔴 Server Down — no response or DB disconnected | Error: connect ECONNREFUSED
[2025-11-11T00:30:20.123Z] 🔴 Server Down — no response or DB disconnected | Error: connect ECONNREFUSED
[2025-11-11T00:30:25.123Z] 🔴 Server Down — no response or DB disconnected | Error: connect ECONNREFUSED
[2025-11-11T00:30:25.123Z] ❌ System unstable — investigate backend or DB. (3 consecutive failures)

======================================================================
🔁 Health Summary (last 60s) - [2025-11-11T00:31:15.123Z]
   - Successful checks: 0
   - Failures: 12
   - Current Status: 🔴
======================================================================
```

### Stop Monitoring

Press `Ctrl+C` to stop monitoring gracefully.

## Log File

All health checks are logged to: `logs/system_health.log`

**Log Format:**
```
[2025-11-11T00:30:15.123Z] status: healthy | DB: connected | latency: 45ms
[2025-11-11T00:30:20.123Z] status: healthy | DB: connected | latency: 42ms
[2025-11-11T00:30:25.123Z] status: error | DB: unknown | latency: timeout | error: connect ECONNREFUSED
[2025-11-11T00:30:25.123Z] WARNING: ❌ System unstable — investigate backend or DB. (3 consecutive failures)
[2025-11-11T00:31:15.123Z] SUMMARY: successful: 12, failures: 0, status: 🟢
```

## Status Indicators

- 🟢 **Green:** System healthy (API online & DB connected)
- 🔴 **Red:** System down (no response or DB disconnected)
- 🟡 **Yellow:** System unstable (some failures but not critical)

## Configuration

### Monitoring Interval

Default: **5 seconds**

To change, edit `src/scripts/autoHealthMonitor.js`:
```javascript
const PING_INTERVAL = 5000; // Change to desired milliseconds
```

### Summary Interval

Default: **12 checks** (≈60 seconds)

To change, edit `src/scripts/autoHealthMonitor.js`:
```javascript
const SUMMARY_INTERVAL = 12; // Change to desired number of checks
```

### Health Endpoint URL

Default: `http://localhost:5000/api/health`

To change, edit `src/scripts/autoHealthMonitor.js`:
```javascript
const HEALTH_URL = "http://localhost:5000/api/health";
```

### Log File Location

Default: `logs/system_health.log`

Automatically created if `logs` directory doesn't exist.

## Error Handling

### 3 Consecutive Failures

When 3 consecutive health checks fail:
- Logs warning: `❌ System unstable — investigate backend or DB.`
- Continues monitoring (does not crash)
- Resets counter on next successful check

### Request Timeout

- Default timeout: 10 seconds
- Logs timeout error
- Continues monitoring

### File Logging Errors

- If log file write fails, monitoring continues
- Errors are silently handled (no crash)

## Comparison with Other Commands

| Command | Purpose | Frequency |
|---------|---------|-----------|
| `npm run health-check` | One-time comprehensive check | Manual |
| `npm run monitor` | Basic continuous monitoring | Every 5s |
| `npm run auto-monitor` | **Enhanced continuous monitoring with summaries** | Every 5s + summaries |

## Integration

### Run with Backend

**Terminal 1 - Backend:**
```bash
cd "Bid app Backend"
npm run dev
```

**Terminal 2 - Auto Monitor:**
```bash
cd "Bid app Backend"
npm run auto-monitor
```

## Troubleshooting

### "Server Down" Messages

1. **Check if backend is running:**
   ```bash
   npm run dev
   ```

2. **Verify health endpoint:**
   ```bash
   curl http://localhost:5000/api/health
   ```

3. **Check backend logs for errors**

### "System Unstable" Warning

After 3 consecutive failures:
1. Check backend server status
2. Check database connection
3. Review backend logs
4. Restart backend if needed

### Log File Issues

- Log file is created automatically
- If write fails, monitoring continues
- Check file permissions if needed

## Files

- **Script:** `src/scripts/autoHealthMonitor.js`
- **Log File:** `logs/system_health.log`
- **NPM Script:** `package.json` (line 12)

---

**Created:** 2025-11-11  
**Status:** ✅ Ready to use


