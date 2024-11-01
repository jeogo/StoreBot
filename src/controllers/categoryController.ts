// src/controllers/categoryController.ts
import { Request, Response } from "express";
import { ObjectId } from "mongodb";
import { connectToDB } from "../db";
import { CategoryHistoryEntry } from "../models/category"; // Ensure to import CategoryHistoryEntry interface

// Fetch all categories
export const getAllCategories = async (_req: Request, res: Response) => {
  try {
    const db = await connectToDB();
    const categories = await db.collection("categories").find().toArray();
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
      .collection("categories")
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

    const newCategory = {
      name,
      categoryHistory: [
        {
          date: new Date(),
          type: "created",
          description: `Category '${name}' created`,
        } as CategoryHistoryEntry,
      ],
    };

    const result = await db.collection("categories").insertOne(newCategory);
    res
      .status(201)
      .json({ message: "Category created", categoryId: result.insertedId });
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
    const { name } = req.body;

    // Check if the category exists
    const category = await db
      .collection("categories")
      .findOne({ _id: categoryId });
    if (!category) return res.status(404).json({ error: "Category not found" });

    const updatedHistoryEntry: CategoryHistoryEntry = {
      date: new Date(),
      type: "updated",
      description: `Category name updated to '${name}'`,
    };

    const result = await db.collection("categories").updateOne(
      { _id: categoryId },
      {
        $set: { name },
        $push: { categoryHistory: updatedHistoryEntry as unknown as any },
      }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: "Category not found" });
    }

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
    const result = await db
      .collection("categories")
      .deleteOne({ _id: categoryId });
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: "Category not found" });
    }
    res.status(200).json({ message: "Category deleted" });
  } catch (error) {
    console.error("Error deleting category:", error);
    res.status(500).json({ error: "Error deleting category" });
  }
};
