import { asyncHandler } from "./../utils/asyncHandler";
// src/routes/productRoutes.ts
import express from "express";
import {
  getAllProducts,
  getProductById,
  createProduct,
  updateProductById,
  deleteProductById,
} from "../controllers/productController";

const router = express.Router();

// Get all products
router.get("/", getAllProducts);

// Get a single product by ID
router.get("/:id", asyncHandler(getProductById));

// Create a new product
router.post("/", asyncHandler(createProduct));

// Update a product by ID
router.put("/:id", asyncHandler(updateProductById));

// Delete a product by ID
router.delete("/:id", asyncHandler(deleteProductById));

export default router;
