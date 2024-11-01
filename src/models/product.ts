import { ObjectId } from "mongodb";

// Product interface for MongoDB
export interface Product {
  _id?: ObjectId;
  name: string; // Name of the product
  description?: string; // Optional description of the product
  price: number; // Price of the product
  emails: string[]; // List of associated emails
  categoryId: ObjectId; // Reference to the category the product belongs to
  password: string; // Password for all emails associated with the product

  // Derived quantity calculated from the count of emails
  get quantity(): number;
  // History tracking of product interactions (sales, edits, etc.)
  productHistory: ProductHistoryEntry[];
}

// History entry for tracking each interaction on the product level
export interface ProductHistoryEntry {
  date: Date; // Date of the interaction
  type: "created" | "updated" | "sold"; // Type of interaction
  userId?: ObjectId; // User who purchased or updated (if applicable)
  description: string; // Details of the action or sale
}
