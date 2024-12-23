import { asyncHandler } from "./../utils/asyncHandler";
import express from "express";
import {
  getAllProducts,
  getProductById,
  createProduct,
  updateProductById,
  deleteProductById,
  getArchivedProducts,
} from "../controllers/productController";

const router = express.Router();

// Get all products
router.get("/", asyncHandler(getAllProducts));

// Get a single product by ID
router.get("/:id", asyncHandler(getProductById));

// Get archived products
router.get("/archive", asyncHandler(getArchivedProducts));

// Create a new product
router.post("/", asyncHandler(createProduct));

// Update a product by ID
router.put("/:id", asyncHandler(updateProductById));

// Delete a product by ID and archive it
router.delete("/:id", asyncHandler(deleteProductById));

export default router;
