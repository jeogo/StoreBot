import express from "express";
import {
  getAllUsers,
  getUserById,
  updateUserById,
  deleteUserById,
  updateUserBalanceById,
} from "../controllers/userController";
import { asyncHandler } from "../utils/asyncHandler";

const router = express.Router();

// Route to get all users
router.get("/", asyncHandler(getAllUsers));

// Route to get a user by ID
router.get("/:id", asyncHandler(getUserById));

// Route to update a user by ID
router.put("/:id", asyncHandler(updateUserById));

// Route to delete a user by ID
router.delete("/:id", asyncHandler(deleteUserById));

// Route to update user balance by ID
router.put("/:id/balance", asyncHandler(updateUserBalanceById));

// Route to reset user balance by ID

export default router;
