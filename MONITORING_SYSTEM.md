# 🔍 BidMaster Continuous Live Monitoring System

## Overview

A real-time monitoring system that continuously checks the health of the BidMaster backend server and database connection.

## Features

- ✅ Pings `/api/health` endpoint every 5 seconds
- ✅ Shows server status (Online/Offline)
- ✅ Displays database connection status
- ✅ Shows uptime and latency
- ✅ Detects system instability (3 consecutive failures)
- ✅ Graceful error handling
- ✅ Easy stop with Ctrl+C

## Usage

### Start Monitoring

```bash
cd "Bid app Backend"
npm run monitor
```

### Expected Output

**When System is Healthy:**
```
🔍 BidMaster System Monitor Started
   Health Endpoint: http://localhost:5000/api/health
   Ping Interval: 5 seconds
   Press Ctrl+C to stop monitoring

======================================================================
[11/11/2025, 00:30:15] 🟢 Server Online (DB Connected) | Uptime: 0s | Latency: 45ms
[11/11/2025, 00:30:20] 🟢 Server Online (DB Connected) | Uptime: 5s | Latency: 42ms
[11/11/2025, 00:30:25] 🟢 Server Online (DB Connected) | Uptime: 10s | Latency: 38ms
```

**When System is Unhealthy:**
```
[11/11/2025, 00:30:15] 🔴 Server Offline or DB Disconnected | Error: connect ECONNREFUSED
[11/11/2025, 00:30:20] 🔴 Server Offline or DB Disconnected | Error: connect ECONNREFUSED
[11/11/2025, 00:30:25] 🔴 Server Offline or DB Disconnected | Error: connect ECONNREFUSED
[11/11/2025, 00:30:25] ❌ System unstable — check backend or Neon DB connection. (3 consecutive failures)
```

### Stop Monitoring

Press `Ctrl+C` to stop monitoring gracefully.

## Health Endpoint

The monitoring system uses `/api/health` endpoint which returns:

**Healthy Response (200):**
```json
{
  "status": "healthy",
  "database": "connected",
  "timestamp": "2025-11-11T00:30:15.123Z",
  "uptime": 3600.5,
  "dbTime": "2025-11-11T00:30:15.123Z"
}
```

**Unhealthy Response (503):**
```json
{
  "status": "unhealthy",
  "database": "disconnected",
  "timestamp": "2025-11-11T00:30:15.123Z",
  "uptime": 3600.5,
  "error": "Connection timeout"
}
```

## Configuration

### Monitoring Interval

Default: **5 seconds** (5000ms)

To change, edit `src/scripts/systemMonitor.js`:
```javascript
const PING_INTERVAL = 5000; // Change to desired milliseconds
```

### Health Endpoint URL

Default: `http://localhost:5000/api/health`

To change, edit `src/scripts/systemMonitor.js`:
```javascript
const HEALTH_URL = "http://localhost:5000/api/health";
```

## System Requirements

- Backend server must be running on port 5000
- `/api/health` endpoint must be accessible
- Node.js installed

## Troubleshooting

### "Server Offline" Messages

1. **Check if backend is running:**
   ```bash
   npm run dev
   ```

2. **Check if port 5000 is in use:**
   ```bash
   netstat -ano | findstr :5000
   ```

3. **Verify health endpoint:**
   ```bash
   curl http://localhost:5000/api/health
   ```

### "DB Disconnected" Messages

1. **Check database connection:**
   - Verify `.env` file has correct `DATABASE_URL`
   - Test database connection separately
   - Check Neon PostgreSQL dashboard

2. **Check backend logs:**
   - Look for database connection errors
   - Verify SSL settings for Neon

### "System Unstable" Warning

This appears after 3 consecutive failed pings. Actions:

1. Check backend server status
2. Check database connection
3. Review backend logs for errors
4. Restart backend server if needed

## Integration

### Run with Backend

**Terminal 1 - Backend:**
```bash
cd "Bid app Backend"
npm run dev
```

**Terminal 2 - Monitor:**
```bash
cd "Bid app Backend"
npm run monitor
```

### Production Monitoring

For production, consider:
- Running monitor as a service
- Logging to file
- Sending alerts on failures
- Using process managers (PM2, forever)

## Files

- **Monitoring Script:** `src/scripts/systemMonitor.js`
- **Health Endpoint:** `src/server.js` (line 117-137)
- **NPM Script:** `package.json` (line 11)

---

**Created:** 2025-11-11  
**Status:** ✅ Ready to use


