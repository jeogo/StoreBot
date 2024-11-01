import { ObjectId } from "mongodb";

// User interface for MongoDB
export interface User {
  _id?: ObjectId;
  telegramId: string; // Telegram user ID
  username: string; // Telegram username
  name: string; // Full name of the user
  balance: number; // User's balance
  registerDate: Date; // Registration date
  history: HistoryEntry[]; // User's history (charges, purchases, etc.)
  paymentHistory: PaymentHistoryEntry[]; // Payment history for tracking balance additions
}

// HistoryEntry interface to log each interaction in the system
export interface HistoryEntry {
  date: Date; // Date of the interaction
  type: "register" | "charge" | "purchase"; // Type of interaction
  amount?: number; // Amount (for charges or purchases)
  productId?: ObjectId; // ID of the product (if applicable)
  productName?: string; // Product name (in case of purchase)
  description: string; // Description of the interaction
}

// Payment history entry for tracking balance changes
export interface PaymentHistoryEntry {
  date: Date; // Date of the balance change
  amount: number; // Amount added to the balance
  description: string; // Details of the payment
}
