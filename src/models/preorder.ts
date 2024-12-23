import { ObjectId } from "mongodb";

export interface PreOrder {
  _id: ObjectId;
  userId: ObjectId;
  productId: ObjectId;
  date: Date;
  status: string;
  message: string; // Original message from the user
  clientMessage?: string; // Message you sent to the user
  clientMessageData?: string; // Data/details included in the message sent
  fulfillmentDate?: Date;
  userName: string;
  fullName: string; // Full name of the user
  userTelegramId: string;
  productName: string;
  productPrice: number;
  fulfillmentDetails?: string;
}
