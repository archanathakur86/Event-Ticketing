import { Router } from "express";
import {
  sendNotification,
  getNotifications,
  markAsRead,
  markAllAsRead,
} from "../controllers/NotificationController.js";
import { verifyToken } from "../middleware/AuthMiddleware.js";
import { checkNotificationPermission } from "../middleware/NotificationAuthMiddleware.js";

const notificationRoutes = Router();

notificationRoutes.post(
  "/send",
  verifyToken,
  checkNotificationPermission,
  sendNotification,
);

notificationRoutes.get("/", verifyToken, getNotifications);

notificationRoutes.post("/:id/read", verifyToken, markAsRead);

notificationRoutes.post("/mark-all-read", verifyToken, markAllAsRead);

export default notificationRoutes;
