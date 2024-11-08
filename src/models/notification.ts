// src/models/notification.ts
import { ObjectId } from "mongodb";

export interface Notification {
  _id?: ObjectId;
  title: string;
  message: string;
  notificationHistory?: NotificationHistoryEntry[];
}

export interface NotificationHistoryEntry {
  date: Date;
  description: string;
}
