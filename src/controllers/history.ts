import { Request, Response } from "express";
import { ObjectId } from "mongodb";
import { History } from "../models/history"; // Assuming this is the path to your model
import { db } from "../db"; // Your database connection file, replace with actual path

// Controller to get all history records
export const getAllHistory = async (req: Request, res: Response) => {
  try {
    const history = await db.collection<History>("history").find().toArray(); // Fetch all history entries
    res.status(200).json({
      success: true,
      data: history,
    });
  } catch (error) {
    console.error("Error fetching history:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch history",
    });
  }
};

// Controller to get history by ID
export const getHistoryById = async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!ObjectId.isValid(id)) {
    return res.status(400).json({
      success: false,
      message: "Invalid history ID",
    });
  }

  try {
    const history = await db
      .collection<History>("history")
      .findOne({ _id: new ObjectId(id) });

    if (!history) {
      return res.status(404).json({
        success: false,
        message: "History entry not found",
      });
    }

    res.status(200).json({
      success: true,
      data: history,
    });
  } catch (error) {
    console.error("Error fetching history by ID:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch history by ID",
    });
  }
};
