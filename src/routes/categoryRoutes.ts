// src/routes/categoryRoutes.ts
import express from "express";
import {
  getAllCategories,
  getCategoryById,
  createCategory,
  updateCategoryById,
  deleteCategoryById,
} from "../controllers/categoryController";
import { asyncHandler } from "../utils/asyncHandler";
asyncHandler;

const router = express.Router();

// Get all categories
router.get("/", getAllCategories);

// Get a single category by ID
router.get("/:id", asyncHandler(getCategoryById));

// Create a new category
router.post("/", createCategory);

// Update a category by ID
router.put("/:id", asyncHandler(updateCategoryById));

// Delete a category by ID
router.delete("/:id", asyncHandler(deleteCategoryById));

export default router;
