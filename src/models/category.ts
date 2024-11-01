import { ObjectId } from 'mongodb';

// Category interface for MongoDB
export interface Category {
    _id?: ObjectId;
    name: string; // Name of the category

    // History tracking of category changes
    categoryHistory: CategoryHistoryEntry[];
}

// History entry for tracking each interaction on the category level
export interface CategoryHistoryEntry {
  date: Date; // Date of the interaction
  type: "created" | "updated"; // Type of interaction
  description: string; // Details of the interaction
}
