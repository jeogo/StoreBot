import { ObjectId } from "mongodb";

export interface PreOrder {
  _id: ObjectId;
  userId: ObjectId;
  productId: ObjectId;
  date: Date;
  status: string;
  message: string; // Original message, could be an internal note
  clientMessage?: string;
  clientMessageData?: string; // New field for the message sent to the client
  fulfillmentDate?: Date;
  userName: string;
  fullName: string;
  userTelegramId: string;
  productName: string;
  productPrice: number;
  fulfillmentDetails?: string;
}
