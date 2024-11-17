// src/models/preorder.ts

import { ObjectId } from "mongodb";

export interface PreOrder {
  _id: ObjectId;
  userId: ObjectId;
  productId: ObjectId;
  date: Date;
  status: string;
  message: string;
  fulfillmentDate?: Date;
  userName: string;
  userTelegramId: string;
  productName: string;
  productPrice: number;
  fulfillmentDetails?: string;
}
