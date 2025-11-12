# 🚀 Start Backend Server

## Quick Start

```bash
cd "Bid app Backend"
npm run dev
```

## Expected Output

```
🚀 Server running on port 5000
✅ Connected to Neon PostgreSQL Database
✅ Database connection test successful
```

## Verify Server is Running

Open in browser: `http://localhost:5000`

Should show: "BidMaster Admin API running ✅"

## Test Health Endpoint

```bash
curl http://localhost:5000/api/health
```

Should return JSON with status: "healthy"


