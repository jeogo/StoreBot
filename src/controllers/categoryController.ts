// src/controllers/categoryController.ts
import { Request, Response } from "express";
import { ObjectId } from "mongodb";
import { connectToDB } from "../db";
import { Category } from "../models/category";
import { HistoryEntry } from "../models/history";

// Fetch all categories
export const getAllCategories = async (_req: Request, res: Response) => {
  try {
    const db = await connectToDB();
    const categories = await db
      .collection<Category>("categories")
      .find()
      .toArray();
    res.status(200).json(categories);
  } catch (error) {
    console.error("Error fetching categories:", error);
    res.status(500).json({ error: "Error fetching categories" });
  }
};

// Fetch a single category by ID
export const getCategoryById = async (req: Request, res: Response) => {
  try {
    const db = await connectToDB();
    const categoryId = new ObjectId(req.params.id);
    const category = await db
      .collection<Category>("categories")
      .findOne({ _id: categoryId });
    if (!category) return res.status(404).json({ error: "Category not found" });
    res.status(200).json(category);
  } catch (error) {
    console.error("Error fetching category:", error);
    res.status(500).json({ error: "Error fetching category" });
  }
};

// Create a new category
export const createCategory = async (req: Request, res: Response) => {
  try {
    const db = await connectToDB();
    const { name } = req.body;

    const newCategory: Category = {
      name,
      createdDate: new Date(),
      isActive: true,
    };

    const result = await db
      .collection<Category>("categories")
      .insertOne(newCategory);

    // Log the creation in the centralized history collection
    const historyEntry: HistoryEntry = {
      entity: "category",
      entityId: result.insertedId,
      action: "created",
      timestamp: new Date(),
      performedBy: {
        type: "admin",
        id: null, // Replace with admin ID if available
      },
      details: `Category '${name}' created`,
      metadata: {
        categoryId: result.insertedId,
        name,
      },
    };
    await db.collection<HistoryEntry>("history").insertOne(historyEntry);

    res.status(201).json({
      message: "Category created",
      categoryId: result.insertedId,
    });
  } catch (error) {
    console.error("Error creating category:", error);
    res.status(500).json({ error: "Error creating category" });
  }
};

// Update a category by ID
export const updateCategoryById = async (req: Request, res: Response) => {
  try {
    const db = await connectToDB();
    const categoryId = new ObjectId(req.params.id);
    const { name, isActive } = req.body;

    // Check if the category exists
    const category = await db
      .collection<Category>("categories")
      .findOne({ _id: categoryId });
    if (!category) return res.status(404).json({ error: "Category not found" });

    // Prepare updated fields
    const updatedFields: Partial<Category> = {};
    if (name) updatedFields.name = name;
    if (typeof isActive === "boolean") updatedFields.isActive = isActive;

    // Update the category
    const result = await db
      .collection<Category>("categories")
      .updateOne({ _id: categoryId }, { $set: updatedFields });

    // Log the update in the centralized history collection
    const historyEntry: HistoryEntry = {
      entity: "category",
      entityId: categoryId,
      action: "updated",
      timestamp: new Date(),
      performedBy: {
        type: "admin",
        id: null, // Replace with admin ID if available
      },
      details: `Category '${category.name}' updated`,
      metadata: {
        categoryId,
        updatedFields,
      },
    };
    await db.collection<HistoryEntry>("history").insertOne(historyEntry);

    res.status(200).json({ message: "Category updated" });
  } catch (error) {
    console.error("Error updating category:", error);
    res.status(500).json({ error: "Error updating category" });
  }
};

// Delete a category by ID
export const deleteCategoryById = async (req: Request, res: Response) => {
  try {
    const db = await connectToDB();
    const categoryId = new ObjectId(req.params.id);

    // Check if the category exists
    const category = await db
      .collection<Category>("categories")
      .findOne({ _id: categoryId });
    if (!category) return res.status(404).json({ error: "Category not found" });

    // Delete the category
    const result = await db
      .collection<Category>("categories")
      .deleteOne({ _id: categoryId });
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: "Category not found" });
    }

    // Log the deletion in the centralized history collection
    const historyEntry: HistoryEntry = {
      entity: "category",
      entityId: categoryId,
      action: "deleted",
      timestamp: new Date(),
      performedBy: {
        type: "admin",
        id: null, // Replace with admin ID if available
      },
      details: `Category '${category.name}' deleted`,
      metadata: {
        categoryId,
        name: category.name,
      },
    };
    await db.collection<HistoryEntry>("history").insertOne(historyEntry);

    res.status(200).json({ message: "Category deleted" });
  } catch (error) {
    console.error("Error deleting category:", error);
    res.status(500).json({ error: "Error deleting category" });
  }
};
