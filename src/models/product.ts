import { ObjectId } from "mongodb";

// Define the types for the Product's history
export interface ProductHistoryEntry {
  action: "create" | "update" | "delete" | "sale"; // Added 'sale' to the action type
  date: Date;
  details: string;
  updatedFields?: Record<string, any>;
  userDetails?: { fullName: string; phone: string }; // Optional user details
  productDetails?: { productName: string; categoryName: string }; // Optional product details
}

export interface Product {
  _id: ObjectId;
  name: string;
  description: string;
  price: number;
  emails: string[];
  categoryId: ObjectId;
  isAvailable: boolean;
  allowPreOrder: boolean;
  createdDate: Date;
  archive: Array<any>;
  salesHistory?: ProductSaleEvent[];
  history?: ProductHistoryEntry[]; // Ensure history is defined as an array if you are pushing to it
}

// Define the Sale Event model (unchanged)
export interface ProductSaleEvent {
  userId: ObjectId;
  fullName: string;
  date: Date;
  price: number;
  emailPassword: string;
}
