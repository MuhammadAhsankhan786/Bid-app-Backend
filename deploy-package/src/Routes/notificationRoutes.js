import express from "express";
import { NotificationsController } from "../controllers/notificationsController.js";
import { verifyUser } from "../middleware/authMiddleware.js";

const router = express.Router();

// Protected routes
router.get("/", verifyUser, NotificationsController.getNotifications);
router.get("/settings", verifyUser, NotificationsController.getSettings);
router.put("/settings", verifyUser, NotificationsController.updateSettings);
router.patch("/read/:id", verifyUser, NotificationsController.markAsRead);

export default router;

