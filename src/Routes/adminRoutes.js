import express from "express";
import { AdminController } from "../controllers/adminController.js";
import { DashboardController } from "../controllers/dashboardController.js";
import { ProductController } from "../controllers/productController.js";
import { OrderController } from "../controllers/orderController.js";
import { AnalyticsController } from "../controllers/analyticsController.js";
import { AuctionController } from "../controllers/auctionController.js";
import { NotificationsController } from "../controllers/notificationsController.js";
import { SettingsController, upload } from "../controllers/settingsController.js";
import { verifyAdmin } from "../middleware/authMiddleware.js";
import { authorizeRoles } from "../middleware/roleMiddleware.js";

const router = express.Router();

// 🔒 All routes require admin authentication (verifyAdmin ensures user is admin)
// Then role-based access control is applied per route
// Login is now handled via /api/auth/login-phone
router.use(verifyAdmin);

// --- USERS ---
// GET /users - superadmin, moderator
router.get("/users", authorizeRoles("superadmin", "moderator"), AdminController.getUsers);
// POST /users - superadmin only
router.post("/users", authorizeRoles("superadmin"), AdminController.createUser);
// PUT /users/:id - superadmin, moderator
router.put("/users/:id", authorizeRoles("superadmin", "moderator"), AdminController.updateUser);
// DELETE /users/:id - superadmin only
router.delete("/users/:id", authorizeRoles("superadmin"), AdminController.deleteUser);
// PUT /users/:id/role - superadmin only
router.put("/users/:id/role", authorizeRoles("superadmin"), AdminController.updateUserRole);
// PATCH /users/approve/:id - superadmin, moderator
router.patch("/users/approve/:id", authorizeRoles("superadmin", "moderator"), AdminController.approveUser);
// PATCH /users/block/:id - superadmin, moderator
router.patch("/users/block/:id", authorizeRoles("superadmin", "moderator"), AdminController.blockUser);

// --- DASHBOARD ---
// GET /dashboard - superadmin, moderator, viewer (dashboard summary)
router.get("/dashboard", authorizeRoles("superadmin", "moderator", "viewer"), DashboardController.getDashboard);
// GET /dashboard/charts - superadmin, moderator, viewer
router.get("/dashboard/charts", authorizeRoles("superadmin", "moderator", "viewer"), DashboardController.getChartData);
// GET /dashboard/categories - superadmin, moderator, viewer
router.get("/dashboard/categories", authorizeRoles("superadmin", "moderator", "viewer"), DashboardController.getCategoryData);

// --- PRODUCTS ---
// GET /products - superadmin, moderator, viewer
router.get("/products", authorizeRoles("superadmin", "moderator", "viewer"), ProductController.getProducts);
// GET /products/pending - superadmin, moderator
router.get("/products/pending", authorizeRoles("superadmin", "moderator"), ProductController.getPendingProducts);
// GET /products/live - superadmin, moderator, viewer
router.get("/products/live", authorizeRoles("superadmin", "moderator", "viewer"), ProductController.getLiveAuctions);
// GET /products/:id - superadmin, moderator, viewer
router.get("/products/:id", authorizeRoles("superadmin", "moderator", "viewer"), ProductController.getProductById);
// PATCH /products/approve/:id - superadmin only
router.patch("/products/approve/:id", authorizeRoles("superadmin"), ProductController.approveProduct);
// PATCH /products/reject/:id - superadmin only
router.patch("/products/reject/:id", authorizeRoles("superadmin"), ProductController.rejectProduct);

// --- ORDERS ---
// GET /orders - superadmin, moderator
router.get("/orders", authorizeRoles("superadmin", "moderator"), OrderController.getOrders);
// GET /orders/stats - superadmin, moderator
router.get("/orders/stats", authorizeRoles("superadmin", "moderator"), OrderController.getOrderStats);
// PATCH /orders/:id/status - superadmin, moderator
router.patch("/orders/:id/status", authorizeRoles("superadmin", "moderator"), OrderController.updateOrderStatus);

// --- ANALYTICS ---
// GET /analytics/weekly - superadmin, viewer
router.get("/analytics/weekly", authorizeRoles("superadmin", "viewer"), AnalyticsController.getWeeklyData);
// GET /analytics/monthly - superadmin, viewer
router.get("/analytics/monthly", authorizeRoles("superadmin", "viewer"), AnalyticsController.getMonthlyData);
// GET /analytics/categories - superadmin, viewer
router.get("/analytics/categories", authorizeRoles("superadmin", "viewer"), AnalyticsController.getCategoryDistribution);
// GET /analytics/top-products - superadmin, viewer
router.get("/analytics/top-products", authorizeRoles("superadmin", "viewer"), AnalyticsController.getTopProducts);

// --- AUCTIONS ---
// GET /auctions/active - superadmin, moderator, viewer
router.get("/auctions/active", authorizeRoles("superadmin", "moderator", "viewer"), AuctionController.getActiveAuctions);
// GET /auctions/:id/bids - superadmin, moderator, viewer
router.get("/auctions/:id/bids", authorizeRoles("superadmin", "moderator", "viewer"), AuctionController.getAuctionBids);

// --- NOTIFICATIONS (Admin - all notifications) ---
// GET /notifications - superadmin, moderator, viewer
router.get("/notifications", authorizeRoles("superadmin", "moderator", "viewer"), NotificationsController.getAllNotifications);

// --- DOCUMENTS ---
// GET /products/:id/documents - superadmin, moderator, viewer
router.get("/products/:id/documents", authorizeRoles("superadmin", "moderator", "viewer"), ProductController.getProductDocuments);

// --- PAYMENTS ---
// GET /payments - superadmin, moderator
router.get("/payments", authorizeRoles("superadmin", "moderator"), OrderController.getPayments);

// --- SETTINGS ---
// POST /settings/logo - superadmin only (upload logo)
router.post("/settings/logo", authorizeRoles("superadmin"), upload.single('logo'), SettingsController.uploadLogo);
// GET /settings/logo - superadmin only (get current logo)
router.get("/settings/logo", authorizeRoles("superadmin"), SettingsController.getLogo);

export default router;
