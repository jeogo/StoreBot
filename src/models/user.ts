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
  totalRecharge?: number; // Tracks total recharges
  balance: number;
  registerDate: Date;
  isActive: boolean;
  isAccepted: boolean; // Controls bot access
}
