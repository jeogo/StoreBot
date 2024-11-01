import { Request, Response } from "express";
import { ObjectId } from "mongodb";
import { connectToDB } from "../db";
import { HistoryEntry } from "../models/user"; // Ensure to import the HistoryEntry interface

// Fetch all users
export const getAllUsers = async (_req: Request, res: Response) => {
  try {
    const db = await connectToDB();
    const users = await db.collection("users").find().toArray();
    res.status(200).json(users);
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ error: "Error fetching users" });
  }
};

// Fetch a single user by ID
export const getUserById = async (req: Request, res: Response) => {
  try {
    const db = await connectToDB();
    const userId = new ObjectId(req.params.id);
    const user = await db.collection("users").findOne({ _id: userId });
    if (!user) return res.status(404).json({ error: "User not found" });
    res.status(200).json(user);
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({ error: "Error fetching user" });
  }
};

// Update an existing user's balance by ID and save to history
export const updateUserById = async (req: Request, res: Response) => {
  try {
    const db = await connectToDB();
    const userId = new ObjectId(req.params.id);
    const { balance: balanceChange } = req.body;

    // Validate that balanceChange is a number
    if (typeof balanceChange !== "number") {
      return res.status(400).json({ error: "Balance change must be a number" });
    }

    // Find the current user balance
    const user = await db.collection("users").findOne({ _id: userId });
    if (!user) return res.status(404).json({ error: "User not found" });

    // Calculate the new balance
    const newBalance = user.balance + balanceChange;

    // Create a new history entry
    const newHistoryEntry: HistoryEntry = {
      date: new Date(),
      type: "charge",
      amount: balanceChange,
      description: `Balance ${
        balanceChange >= 0 ? "added" : "deducted"
      }: ${balanceChange}`,
    };

    // Update the user's balance and push to history
    const result = await db.collection("users").updateOne(
      { _id: userId },
      {
        $set: { balance: newBalance },
        $push: { history: newHistoryEntry as unknown as any }, // Direct push to history
      }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    res.status(200).json({ message: "User balance updated", newBalance });
  } catch (error) {
    console.error("Error updating user balance:", error);
    res.status(500).json({ error: "Error updating user balance" });
  }
};

// Delete a user by ID
export const deleteUserById = async (req: Request, res: Response) => {
  try {
    const db = await connectToDB();
    const userId = new ObjectId(req.params.id);
    const result = await db.collection("users").deleteOne({ _id: userId });
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: "User not found" });
    }
    res.status(200).json({ message: "User deleted" });
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).json({ error: "Error deleting user" });
  }
};
export const updateUserBalanceById = async (req: Request, res: Response) => {
  try {
    const db = await connectToDB();
    const userId = new ObjectId(req.params.id);
    const { amount } = req.body;

    // Validate that amount is a number
    if (typeof amount !== "number") {
      return res.status(400).json({ error: "Amount must be a number" });
    }

    // Find the current user
    const user = await db.collection("users").findOne({ _id: userId });
    if (!user) return res.status(404).json({ error: "User not found" });

    // Calculate the new balance
    const newBalance = user.balance + amount;

    // Create a new history entry, using "charge" as the type for both additions and deductions
    const newHistoryEntry: HistoryEntry = {
      date: new Date(),
      type: "charge", // Use "charge" for both additions and deductions
      amount: amount,
      description:
        amount >= 0
          ? `Balance added: ${amount}`
          : `Balance deducted: ${Math.abs(amount)}`,
    };

    // Update the user's balance and push to history
    await db.collection("users").updateOne(
      { _id: userId },
      {
        $set: { balance: newBalance },
        $push: { history: newHistoryEntry as unknown as any },
      }
    );

    res.status(200).json({ message: "User balance updated", newBalance });
  } catch (error) {
    console.error("Error updating user balance:", error);
    res.status(500).json({ error: "Error updating user balance" });
  }
};

// Reset user balance and history by ID
export const resetUserAccountById = async (req: Request, res: Response) => {
  try {
    const db = await connectToDB();
    const userId = new ObjectId(req.params.id);

    // Find the user
    const user = await db.collection("users").findOne({ _id: userId });
    if (!user) return res.status(404).json({ error: "User not found" });

    // Reset balance and history
    await db.collection("users").updateOne(
      { _id: userId },
      {
        $set: { balance: 0, history: [] },
      }
    );

    res.status(200).json({ message: "User account reset successfully" });
  } catch (error) {
    console.error("Error resetting user account:", error);
    res.status(500).json({ error: "Error resetting user account" });
  }
};
