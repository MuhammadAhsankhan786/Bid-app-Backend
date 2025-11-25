# JWT Auto-Refresh Production Monitor Setup

## Overview

The JWT Auto-Refresh Production Monitor continuously verifies that:
- Access tokens expire correctly (15 minutes)
- Expired tokens trigger automatic refresh via `/api/auth/refresh`
- New tokens are received and work correctly
- Token rotation prevents reuse of old refresh tokens
- All secure API routes continue working without 401/403 errors

## Quick Start

### Run Once (Test)
```bash
npm run monitor:jwt-once
```

### Run Continuously (Production)
```bash
npm run monitor:jwt
```

The monitor runs every 10 minutes automatically.

## Configuration

### Environment Variables

Set in `.env`:
```env
BASE_URL=https://bidmaster-api.onrender.com/api  # Production URL
# OR
PRODUCTION_URL=https://bidmaster-api.onrender.com/api

JWT_SECRET=your-secret-key
DATABASE_URL=your-database-url
```

### Monitor Interval

Default: 10 minutes (600,000 ms)

To change, edit `MONITOR_INTERVAL` in `jwt_refresh_monitor.js`:
```javascript
const MONITOR_INTERVAL = 10 * 60 * 1000; // 10 minutes
```

## Reports

### Report Locations

All reports are saved in: `src/logs/monitoring/`

### Report Files

1. **Individual Reports**: `jwt_monitor_YYYY-MM-DDTHH-MM-SS.json`
   - One report per monitoring cycle
   - Contains full test results

2. **Latest Report**: `jwt_monitor_latest.json`
   - Always contains the most recent check
   - Updated after each cycle

3. **Rolling Summary**: `jwt_monitor_summary.json`
   - Aggregated data from last 24 hours
   - Includes uptime percentage
   - Component health status
   - Recent errors

### Report Structure

```json
{
  "checkId": 1234567890,
  "timestamp": "2024-01-15T10:30:00.000Z",
  "baseUrl": "https://bidmaster-api.onrender.com/api",
  "status": "success",
  "steps": {
    "login": { "success": true, ... },
    "tokenExpiry": { "success": true, ... },
    "validTokenRequest": { "success": true, ... },
    "expiredTokenTest": { "success": true, ... },
    "tokenRotation": { "success": true, ... }
  },
  "summary": {
    "overallSuccess": true,
    "login": "✅ Working",
    "tokenExpiry": "✅ Working",
    "validRequest": "✅ Working",
    "autoRefresh": "✅ Working",
    "tokenRotation": "✅ Working",
    "errorCount": 0
  },
  "errors": []
}
```

## Running in Production

### Option 1: PM2 (Recommended)

```bash
# Install PM2 globally
npm install -g pm2

# Start monitor
pm2 start src/scripts/jwt_refresh_monitor.js --name jwt-monitor

# View logs
pm2 logs jwt-monitor

# View status
pm2 status

# Stop monitor
pm2 stop jwt-monitor

# Restart monitor
pm2 restart jwt-monitor
```

### Option 2: Systemd Service (Linux)

Create `/etc/systemd/system/jwt-monitor.service`:

```ini
[Unit]
Description=JWT Auto-Refresh Monitor
After=network.target

[Service]
Type=simple
User=your-user
WorkingDirectory=/path/to/Bid app Backend
ExecStart=/usr/bin/node src/scripts/jwt_refresh_monitor.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

Then:
```bash
sudo systemctl enable jwt-monitor
sudo systemctl start jwt-monitor
sudo systemctl status jwt-monitor
```

### Option 3: Cron Job

Add to crontab (`crontab -e`):
```cron
*/10 * * * * cd /path/to/Bid\ app\ Backend && npm run monitor:jwt-once >> /var/log/jwt-monitor.log 2>&1
```

### Option 4: Docker

Add to `docker-compose.yml`:
```yaml
services:
  jwt-monitor:
    build: .
    command: npm run monitor:jwt
    environment:
      - BASE_URL=${PRODUCTION_URL}
      - JWT_SECRET=${JWT_SECRET}
      - DATABASE_URL=${DATABASE_URL}
    restart: unless-stopped
```

## Monitoring Dashboard

### View Latest Status

```bash
cat src/logs/monitoring/jwt_monitor_latest.json | jq '.summary'
```

### View Rolling Summary

```bash
cat src/logs/monitoring/jwt_monitor_summary.json | jq '.'
```

### Check Uptime

```bash
cat src/logs/monitoring/jwt_monitor_summary.json | jq '.uptime'
```

## Alerts

### Setup Email Alerts

Modify `jwt_refresh_monitor.js` to add email notifications:

```javascript
import nodemailer from 'nodemailer';

async function sendAlert(report) {
  if (report.status !== 'success') {
    // Send email alert
    const transporter = nodemailer.createTransport({
      // Your email config
    });
    
    await transporter.sendMail({
      to: 'admin@example.com',
      subject: 'JWT Monitor Alert',
      text: `JWT Auto-Refresh Monitor detected issues:\n${JSON.stringify(report.summary, null, 2)}`
    });
  }
}
```

### Setup Slack Alerts

```javascript
import axios from 'axios';

async function sendSlackAlert(report) {
  if (report.status !== 'success') {
    await axios.post(process.env.SLACK_WEBHOOK_URL, {
      text: `🚨 JWT Monitor Alert: ${report.summary.overallSuccess ? 'Healthy' : 'Unhealthy'}`,
      attachments: [{
        color: report.summary.overallSuccess ? 'good' : 'danger',
        fields: Object.entries(report.summary).map(([key, value]) => ({
          title: key,
          value: value,
          short: true
        }))
      }]
    });
  }
}
```

## Troubleshooting

### Monitor Not Running

1. Check if process is running:
   ```bash
   ps aux | grep jwt_refresh_monitor
   ```

2. Check logs:
   ```bash
   tail -f src/logs/monitoring/jwt_monitor_latest.json
   ```

3. Test manually:
   ```bash
   npm run monitor:jwt-once
   ```

### Reports Not Generated

1. Check directory permissions:
   ```bash
   ls -la src/logs/monitoring/
   ```

2. Ensure directory exists:
   ```bash
   mkdir -p src/logs/monitoring
   ```

### Database Connection Issues

1. Verify DATABASE_URL in `.env`
2. Test connection:
   ```bash
   node -e "import('./src/config/db.js').then(p => p.default.query('SELECT NOW()').then(r => console.log(r.rows[0])))"
   ```

### API Connection Issues

1. Verify BASE_URL is correct
2. Test API endpoint:
   ```bash
   curl https://bidmaster-api.onrender.com/api/health
   ```

## Best Practices

1. **Run in Production Only**: Don't run monitor in development
2. **Monitor Logs**: Regularly check monitor logs for issues
3. **Set Up Alerts**: Configure email/Slack alerts for failures
4. **Review Reports**: Weekly review of rolling summary
5. **Clean Old Reports**: Archive reports older than 30 days

## Maintenance

### Clean Old Reports

```bash
# Remove reports older than 30 days
find src/logs/monitoring -name "jwt_monitor_*.json" -mtime +30 -delete
```

### Archive Reports

```bash
# Archive monthly
tar -czf jwt-monitor-$(date +%Y-%m).tar.gz src/logs/monitoring/jwt_monitor_*.json
```

## Status Codes

- `success`: All checks passed
- `failed`: One or more checks failed
- `error`: Fatal error occurred

## Component Status

Each component can be:
- `✅ Working`: Component functioning correctly
- `❌ Failed`: Component not working

## Uptime Calculation

Uptime is calculated as:
```
(Successful Checks / Total Checks) * 100
```

Status levels:
- `excellent`: ≥ 95%
- `good`: ≥ 80%
- `degraded`: ≥ 60%
- `poor`: < 60%













