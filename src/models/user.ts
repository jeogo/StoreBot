// src/models/user.ts
import { ObjectId } from "mongodb";

export interface User {
  _id?: ObjectId;
  telegramId: string;
  username: string;
  name: string;
  balance: number;
  registerDate: Date;
  isActive: boolean;
  isAccepted: boolean; // Field to control access to the bot
}
