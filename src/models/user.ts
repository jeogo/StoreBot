// src/models/user.ts
import { ObjectId } from "mongodb";

export interface User {
  _id?: ObjectId;
  telegramId: string;
  chatId: string;
  username: string;
  name: string;
  fullName?: string; // User's full name
  phoneNumber?: string; // User's phone number
  balance: number;
  registerDate: Date; // Date of user registration
  isAccepted: boolean; // Controls bot access
  history?: UserEvent[]; // Combined history of user events
}

// Unified User Event Interface
export interface UserEvent {
  type: "recharge" | "status" | "delete" | "purchase"; // Added "purchase" type
  date: Date;
  amount?: number; // Optional for recharge
  status?: string; // Optional for status
  productId?: ObjectId; // Optional for purchase
  productName?: string; // Optional for purchase
  price?: number; // Price of the purchased product
  emailSold?: string; // New field for storing sold email
  categoryName?: string; // Add this field
  adminAction?: "Recharge" | "Discount"; // New field for specifying admin action type
}
