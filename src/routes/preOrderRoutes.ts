// src/routes/preOrderRoutes.ts

import express from "express";
import {
  getAllPreOrders,
  getPreOrderById,
  updatePreOrderStatus,
  fulfillPreOrder,
  deletePreOrderById,
} from "../controllers/preOrderController";
import { asyncHandler } from "../utils/asyncHandler";

const router = express.Router();

// Get all pre-orders
router.get("/", asyncHandler(getAllPreOrders));

// Get a specific pre-order
router.get("/:id", asyncHandler(getPreOrderById));

// Update pre-order status (e.g., cancel)
router.put("/:id/status", asyncHandler(updatePreOrderStatus));

// Fulfill a pre-order
router.put("/:id/fulfill", asyncHandler(fulfillPreOrder));

// Delete a pre-order
router.delete("/:id", asyncHandler(deletePreOrderById));

export default router;
