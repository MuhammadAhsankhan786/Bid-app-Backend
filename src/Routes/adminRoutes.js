import express from "express";
import { AdminController } from "../controllers/adminController.js";
import { DashboardController } from "../controllers/dashboardController.js";
import { ProductController } from "../controllers/productController.js";
import { OrderController } from "../controllers/orderController.js";
import { AnalyticsController } from "../controllers/analyticsController.js";
import { verifyAdmin } from "../middleware/authMiddleware.js";

const router = express.Router();

// Login route (no middleware)
router.post("/login", AdminController.login);

// 🔒 Protect all routes below
router.use(verifyAdmin);

// --- USERS ---
router.get("/users", AdminController.getUsers);
router.delete("/users/:id", AdminController.deleteUser);
router.patch("/users/approve/:id", AdminController.approveUser);
router.patch("/users/block/:id", AdminController.blockUser);

// --- DASHBOARD ---
router.get("/dashboard", DashboardController.getDashboard);
router.get("/dashboard/charts", DashboardController.getChartData);
router.get("/dashboard/categories", DashboardController.getCategoryData);

// --- PRODUCTS ---
router.get("/products", ProductController.getProducts);
router.get("/products/pending", ProductController.getPendingProducts);
router.get("/products/live", ProductController.getLiveAuctions);
router.get("/products/:id", ProductController.getProductById);
router.patch("/products/approve/:id", ProductController.approveProduct);
router.patch("/products/reject/:id", ProductController.rejectProduct);

// --- ORDERS ---
router.get("/orders", OrderController.getOrders);
router.get("/orders/stats", OrderController.getOrderStats);
router.patch("/orders/:id/status", OrderController.updateOrderStatus);

// --- ANALYTICS ---
router.get("/analytics/weekly", AnalyticsController.getWeeklyData);
router.get("/analytics/monthly", AnalyticsController.getMonthlyData);
router.get("/analytics/categories", AnalyticsController.getCategoryDistribution);
router.get("/analytics/top-products", AnalyticsController.getTopProducts);

export default router;
