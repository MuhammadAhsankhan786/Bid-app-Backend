import express from "express";
import dotenv from "dotenv";
import adminRoutes from "./Routes/adminRoutes.js";
import authRoutes from "./Routes/authRoutes.js";
import productRoutes from "./Routes/productRoutes.js";
import bidRoutes from "./Routes/bidRoutes.js";
import auctionRoutes from "./Routes/auctionRoutes.js";
import orderRoutes from "./Routes/orderRoutes.js";
import notificationRoutes from "./Routes/notificationRoutes.js";
import cors from "cors";

dotenv.config();
const app = express();
app.use(express.json());

// CORS configuration for Flutter web compatibility
const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);

    // Allow any localhost port for development
    if (origin.startsWith("http://localhost")) {
      return callback(null, true);
    }

    // Allow specific production origins
    if (
      origin.startsWith("https://bidmaster-web.app") ||
      origin.startsWith("https://bidmaster-api.onrender.com")
    ) {
      return callback(null, true);
    }

    return callback(new Error("Not allowed by CORS"));
  },
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  credentials: true,
  preflightContinue: false,
  optionsSuccessStatus: 204,
};

// Apply CORS middleware
app.use(cors(corsOptions));

// Handle preflight requests explicitly for all routes
app.options(/.*/, cors(corsOptions))


// Admin routes (existing)
app.use("/api/admin", adminRoutes);

// Auth routes (existing + new mobile app routes)
app.use("/api/auth", authRoutes);

// Mobile app routes
app.use("/api/products", productRoutes);
app.use("/api/bids", bidRoutes);
app.use("/api/auction", auctionRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/notifications", notificationRoutes);

app.get("/", (req, res) => res.send("BidMaster Admin API running"));
app.listen(process.env.PORT, () => console.log(`🚀 Server running on port ${process.env.PORT}`));
