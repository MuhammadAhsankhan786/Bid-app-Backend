import express from "express";
import { NotificationsController } from "../controllers/notificationsController.js";
import { verifyUser } from "../middleware/authMiddleware.js";

const router = express.Router();

// Protected routes
router.get("/", verifyUser, NotificationsController.getNotifications);
router.patch("/read/:id", verifyUser, NotificationsController.markAsRead);

export default router;

