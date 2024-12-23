import { ObjectId } from "mongodb";

export interface ClientHistoryEntry {
  action: "purchase" | "preorder"; // Client action type
  date: Date; // Action timestamp
  userId: ObjectId; // User who performed the action
  fullName: string; // Full name of the user
  email: string; // Email associated with the purchase or preorder
  productId: ObjectId; // Product involved in the action
  productName: string; // Name of the product involved
  price: number; // Price of the product
  status?: string; // Preorder status if applicable (e.g., "pending", "fulfilled")
  message?: string; // Optional message for preorders (client message)
  responseMessage?: string; // Response from the admin for preorders
  fulfillmentDate?: Date; // Fulfillment date for preorders
}

export interface AdminHistoryEntry {
  action: "create" | "update" | "delete"; // Admin/system action type
  date: Date; // Action timestamp
  adminId: ObjectId; // Admin who performed the action
  entity: "product" | "user" | "category" | "preorder" | "notification"; // Entity affected by the action
  entityId: ObjectId; // ID of the affected entity (product, user, etc.)
  entityName?: string; // Name of the entity (e.g., product name, user name)
  updatedFields?: Record<string, any>; // Fields that were updated, with old and new values
  details?: string; // Optional details about the change
}

export interface History {
  _id: ObjectId; // Unique ID for the history entry
  type: "client" | "admin"; // Type of the entry (client or admin)
  entry: ClientHistoryEntry | AdminHistoryEntry; // Client or Admin history entry
}
