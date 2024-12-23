import { asyncHandler } from "./../utils/asyncHandler";
import { Router } from "express";
import { getAllHistory, getHistoryById } from "../controllers/history";

const router = Router();

// Route to get all history entries
router.get("/", getAllHistory);

// Route to get a single history entry by ID
router.get("/:id", asyncHandler(getHistoryById));

export default router;
