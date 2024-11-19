import { Router } from "express";
import {
  getAllHistoricEntries,
  getEntityHistoricEntries, // Fetch history by entity
  deleteHistoricEntryById,
} from "../controllers/historicController";
import { asyncHandler } from "../utils/asyncHandler";

const router = Router();

// Fetch all historic records
router.get("/", asyncHandler(getAllHistoricEntries));

// Fetch all history records for a specific entity (user or product)
router.get("/:entity/:id", asyncHandler(getEntityHistoricEntries));

// Delete a historic record by ID
router.delete("/:id", asyncHandler(deleteHistoricEntryById));

export default router;
