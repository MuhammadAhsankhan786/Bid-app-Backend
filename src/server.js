import express from "express";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import adminRoutes from "./Routes/adminRoutes.js";
import authRoutes from "./Routes/authRoutes.js";
import productRoutes from "./Routes/productRoutes.js";
import bidRoutes from "./Routes/bidRoutes.js";
import auctionRoutes from "./Routes/auctionRoutes.js";
import orderRoutes from "./Routes/orderRoutes.js";
import notificationRoutes from "./Routes/notificationRoutes.js";
import uploadRoutes from "./Routes/uploadRoutes.js";
import categoryRoutes from "./Routes/categoryRoutes.js";
import referralRoutes from "./Routes/referralRoutes.js";
import walletRoutes from "./Routes/walletRoutes.js";
import buyerBiddingHistoryRoutes from "./Routes/buyerBiddingHistoryRoutes.js";
import sellerEarningsRoutes from "./Routes/sellerEarningsRoutes.js";
import cors from "cors";
import pool from "./config/db.js";
import { errorHandler } from "./middleware/errorHandler.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();
const app = express();

/* ======================================================
   ✅ CORS FIX for Flutter Web + Render API
   Works for Express v5 (no crash on wildcard)
====================================================== */

// CORS configuration - allow localhost, Render, LAN IPs & future web app
const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true); // mobile, Postman
    if (origin.includes("localhost") || origin.includes("127.0.0.1")) {
      return callback(null, true);
    }
    if (origin.includes("10.0.2.2")) {
      return callback(null, true); // Android emulator
    }
    if (origin.match(/^http:\/\/192\.168\.\d+\.\d+:\d+$/)) {
      return callback(null, true); // LAN IPs for physical devices
    }
    if (origin.includes("bidmaster-api.onrender.com")) {
      return callback(null, true);
    }
    // Allow all temporarily for development
    return callback(null, true);
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: [
    "Origin",
    "X-Requested-With",
    "Content-Type",
    "Accept",
    "Authorization",
  ],
  exposedHeaders: ["Content-Range", "X-Content-Range"],
  optionsSuccessStatus: 204,
  maxAge: 86400, // 24 hours
};

// ✅ Handle preflight requests (Express v5 safe)
app.options(/.*/, cors(corsOptions), (req, res) => {
  const origin = req.headers.origin;
  res.header("Access-Control-Allow-Origin", origin || "*");
  res.header("Access-Control-Allow-Credentials", "true");
  res.header(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, PATCH, OPTIONS"
  );
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization"
  );
  res.header("Access-Control-Max-Age", "86400");
  return res.sendStatus(204); // no content
});

// ✅ Apply global CORS middleware
app.use(cors(corsOptions));

// ✅ Fallback header middleware (extra safety)
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin) {
    res.header("Access-Control-Allow-Origin", origin);
    res.header("Access-Control-Allow-Credentials", "true");
  }
  res.header(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, PATCH, OPTIONS"
  );
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization"
  );
  next();
});

// ✅ JSON parsing after CORS
app.use(express.json());

// ✅ Serve static files (uploads)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

/* ======================================================
   ✅ Routes
====================================================== */
app.use("/api/admin", adminRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/bids", bidRoutes);
app.use("/api/auction", auctionRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/uploads", uploadRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/referral", referralRoutes);
app.use("/api/wallet", walletRoutes);
app.use("/api/buyer/bidding-history", buyerBiddingHistoryRoutes);
app.use("/api/seller/earnings", sellerEarningsRoutes);

// Health check routes
app.get("/", (req, res) => res.send("BidMaster Admin API running ✅"));

// API health check endpoint for monitoring
app.get("/api/health", async (req, res) => {
  try {
    // Test database connection
    const dbTest = await pool.query('SELECT NOW() as current_time');
    res.json({
      status: 'healthy',
      database: 'connected',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      dbTime: dbTest.rows[0].current_time
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      database: 'disconnected',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      error: error.message
    });
  }
});

// ✅ Global Error Handler (must be last middleware)
app.use((err, req, res, next) => {
  console.error('❌ Unhandled Error:', err);
  console.error('Error Stack:', err.stack);
  
  // Don't send response if already sent
  if (res.headersSent) {
    return next(err);
  }
  
  const statusCode = err.statusCode || err.status || 500;
  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// ✅ 404 Handler (must be after all routes)
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.path} not found`
  });
});

/* ======================================================
   ✅ Error Handling for Unhandled Rejections
====================================================== */
// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled Promise Rejection:', err);
  console.error('Error Stack:', err.stack);
  // Don't exit in production, just log
  if (process.env.NODE_ENV !== 'production') {
    // In development, we might want to see the error more clearly
  }
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
  console.error('Error Stack:', err.stack);
  // Exit process for uncaught exceptions (they're more serious)
  process.exit(1);
});

/* ======================================================
   ✅ Start Server
====================================================== */
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
