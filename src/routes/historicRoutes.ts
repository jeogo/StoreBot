import express from "express";
import {
  getAllHistoricEntries,
  getHistoricEntryById,
  deleteHistoricEntryById,
} from "../controllers/historicController";
import { asyncHandler } from "../utils/asyncHandler";

const router = express.Router();

// Fetch all historic records
router.get("/", asyncHandler(getAllHistoricEntries));

// Fetch a specific historic record by ID
router.get("/:id", asyncHandler(getHistoricEntryById));

// Delete a historic record by ID
router.delete("/:id", asyncHandler(deleteHistoricEntryById));

export default router;
