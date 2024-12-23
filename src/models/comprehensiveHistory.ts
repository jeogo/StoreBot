import { ObjectId } from "mongodb";

export interface ComprehensiveHistory {
  _id: ObjectId;
  userId: ObjectId; // ID of the user who performed the action
  actionType: string; // e.g., "update", "purchase", "preOrder"
  date: Date; // Date of the action
  description: string; // Description of the action
  previousState?: any; // Previous state of the entity (if applicable)
  newState?: any; // New state of the entity (if applicable)
  emailSold?: string; // Email sold during purchase
  productId?: ObjectId; // ID of the product involved in the action
  productName?: string; // Name of the product
  categoryId?: ObjectId; // ID of the category
  categoryName?: string; // Name of the category
  price?: number; // Price of the product
  deliveryTime?: Date; // Delivery time for pre-orders
  userMessage?: string; // message that user sent
  clientMessageData?: string;
}
