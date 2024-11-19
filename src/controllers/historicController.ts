import { Request, Response } from "express";
import { connectToDB } from "../db";
import { HistoryEntry } from "../models/history";
import { ObjectId } from "mongodb";

// Fetch all historic records
export const getAllHistoricEntries = async (req: Request, res: Response) => {
  try {
    const db = await connectToDB();
    const history = await db
      .collection<HistoryEntry>("history")
      .find()
      .toArray();
    res.status(200).json(history);
  } catch (error) {
    console.error("Error fetching historic entries:", error);
    res.status(500).json({ error: "Failed to fetch historic entries" });
  }
};

// Fetch all history records for a specific entity (user or product)
export const getEntityHistoricEntries = async (req: Request, res: Response) => {
  try {
    const db = await connectToDB();
    const { id, entity } = req.params;

    const historyEntries = await db
      .collection<HistoryEntry>("history")
      .find({ entityId: new ObjectId(id), entity })
      .toArray();

    if (historyEntries.length === 0) {
      return res
        .status(404)
        .json({ error: `No historic entries found for ${entity}.` });
    }

    res.status(200).json(historyEntries);
  } catch (error) {
    console.error("Error fetching entity historic entries:", error);
    res.status(500).json({ error: "Failed to fetch entity historic entries." });
  }
};

// Delete a historic record by ID
export const deleteHistoricEntryById = async (req: Request, res: Response) => {
  try {
    const db = await connectToDB();
    const { id } = req.params;

    const result = await db.collection<HistoryEntry>("history").deleteOne({
      _id: new ObjectId(id),
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: "Historic entry not found" });
    }

    res.status(200).json({ message: "Historic entry deleted successfully" });
  } catch (error) {
    console.error("Error deleting historic entry:", error);
    res.status(500).json({ error: "Failed to delete historic entry" });
  }
};
