import { Request, Response } from "express";
import { ObjectId } from "mongodb";
import { connectToDB } from "../db";
import { Category } from "../models/category";

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

    // Fetch category
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

    // Validate input
    if (!name) {
      return res.status(400).json({ error: "Category name is required" });
    }

    const newCategory: Category = {
      name,
      createdDate: new Date(),
      isActive: true,
    };

    // Insert category
    const result = await db
      .collection<Category>("categories")
      .insertOne(newCategory);

    res.status(201).json({
      message: "Category created successfully",
      category: newCategory,
    });
  } catch (error) {
    console.error("Error creating category:", error);
    res.status(500).json({ error: "Error creating category" });
  }
};

// Update a category
export const updateCategoryById = async (req: Request, res: Response) => {
  try {
    const db = await connectToDB();
    const categoryId = new ObjectId(req.params.id);
    const { name, isActive } = req.body;

    // Find existing category
    const existingCategory = await db
      .collection<Category>("categories")
      .findOne({ _id: categoryId });

    if (!existingCategory) {
      return res.status(404).json({ error: "Category not found" });
    }

    // Prepare update
    const updatedFields: Partial<Category> = { ...existingCategory };
    if (name) updatedFields.name = name;
    if (typeof isActive === "boolean") updatedFields.isActive = isActive;

    // Update category
    await db
      .collection<Category>("categories")
      .updateOne({ _id: categoryId }, { $set: updatedFields });

    res.status(200).json({
      message: "Category updated successfully",
      category: updatedFields,
    });
  } catch (error) {
    console.error("Error updating category:", error);
    res.status(500).json({ error: "Error updating category" });
  }
};

// Delete a category
export const deleteCategoryById = async (req: Request, res: Response) => {
  try {
    const db = await connectToDB();
    const categoryId = new ObjectId(req.params.id);

    // Find existing category
    const existingCategory = await db
      .collection<Category>("categories")
      .findOne({ _id: categoryId });

    if (!existingCategory) {
      return res.status(404).json({ error: "Category not found" });
    }

    // Delete category
    await db.collection<Category>("categories").deleteOne({ _id: categoryId });

    res.status(200).json({
      message: "Category deleted successfully",
      deletedCategory: existingCategory,
    });
  } catch (error) {
    console.error("Error deleting category:", error);
    res.status(500).json({ error: "Error deleting category" });
  }
};
