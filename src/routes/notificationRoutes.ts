// src/routes/notificationRoutes.ts
import express from "express";
import {
  getAllNotifications,
  getNotificationById,
  createNotification,
  updateNotificationById,
  deleteNotificationById,
  sendNotificationById,
} from "../controllers/notificationController";
import { asyncHandler } from "../utils/asyncHandler";

const router = express.Router();

// Route to get all notifications
router.get("/", asyncHandler(getAllNotifications));

// Route to get a notification by ID
router.get("/:id", asyncHandler(getNotificationById));

// Route to create a new notification
router.post("/", asyncHandler(createNotification));

// Route to update a notification by ID
router.put("/:id", asyncHandler(updateNotificationById));

// Route to delete a notification by ID
router.delete("/:id", asyncHandler(deleteNotificationById));

// Route to send a notification to all users (multiple times)
router.post("/:id/send", asyncHandler(sendNotificationById));

export default router;
