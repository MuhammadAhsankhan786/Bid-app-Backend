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
import cors from "cors";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();
const app = express();

/* ======================================================
   ✅ CORS FIX for Flutter Web + Render API
   Works for Express v5 (no crash on wildcard)
====================================================== */

// CORS configuration - allow localhost, Render & future web app
const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true); // mobile, Postman
    if (origin.includes("localhost") || origin.includes("127.0.0.1")) {
      return callback(null, true);
    }
    if (origin.includes("bidmaster-api.onrender.com")) {
      return callback(null, true);
    }
    // Allow all temporarily
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

// Health check route
app.get("/", (req, res) => res.send("BidMaster Admin API running ✅"));

/* ======================================================
   ✅ Start Server
====================================================== */
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
