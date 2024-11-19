// src/controllers/userController.ts
import { Request, Response } from "express";
import { ObjectId } from "mongodb";
import { connectToDB } from "../db";
import { User } from "../models/user";
import { HistoryEntry } from "../models/history";
import { bot } from "../bot"; // Import the bot instance

const sendTelegramMessage = async (telegramId: string, message: string) => {
  try {
    await bot.api.sendMessage(telegramId, message);
  } catch (error) {
    console.error(`Failed to send Telegram message to ${telegramId}:`, error);
  }
};
// Fetch all users
export const getAllUsers = async (_req: Request, res: Response) => {
  try {
    const db = await connectToDB();
    const users = await db.collection<User>("users").find().toArray();
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
    const user = await db.collection<User>("users").findOne({ _id: userId });
    if (!user) return res.status(404).json({ error: "User not found" });
    res.status(200).json(user);
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({ error: "Error fetching user" });
  }
};

// Update a user's balance by ID and log to history
export const updateUserBalanceById = async (req: Request, res: Response) => {
  try {
    const db = await connectToDB();
    const userId = new ObjectId(req.params.id);
    const { amount } = req.body;

    if (typeof amount !== "number") {
      return res.status(400).json({ error: "Amount must be a number" });
    }

    const user = await db.collection<User>("users").findOne({ _id: userId });
    if (!user) return res.status(404).json({ error: "User not found" });

    const newBalance = user.balance + amount;

    // Prevent negative balances if required
    if (newBalance < 0) {
      return res.status(400).json({ error: "Insufficient balance" });
    }

    // Update totalRecharge only for positive amounts (recharges)
    const newTotalRecharge =
      amount > 0 ? (user.totalRecharge || 0) + amount : user.totalRecharge || 0;

    // Update the user's balance and totalRecharge
    await db
      .collection<User>("users")
      .updateOne(
        { _id: userId },
        { $set: { balance: newBalance, totalRecharge: newTotalRecharge } }
      ); 

    // Log the balance update to the history collection
    const historyEntry: HistoryEntry = {
      entity: "user",
      entityId: userId,
      action: "balance_update",
      timestamp: new Date(),
      performedBy: {
        type: "admin", // Replace with "user" if triggered by a user
        id: null, // Replace with the admin's ID if available
      },
      details: `Balance ${amount >= 0 ? "added" : "deducted"}: ${amount}`,
      metadata: {
        previousBalance: user.balance,
        newBalance,
        totalRecharge: newTotalRecharge,
      },
    };

    await db.collection<HistoryEntry>("history").insertOne(historyEntry);

    res.status(200).json({
      message: "User balance updated",
      newBalance,
      totalRecharge: newTotalRecharge,
    });
  } catch (error) {
    console.error("Error updating user balance:", error);
    res.status(500).json({ error: "Error updating user balance" });
  }
};

// Update a user by ID and log the action
export const updateUserById = async (req: Request, res: Response) => {
  try {
    const db = await connectToDB();
    const userId = new ObjectId(req.params.id);
    const updates = req.body;

    const allowedFields = ["username", "name", "isActive", "isAccepted"];
    const sanitizedUpdates: Partial<User> = {};

    for (const key of allowedFields) {
      if (key in updates) {
        sanitizedUpdates[key as keyof User] = updates[key];
      }
    }

    if (Object.keys(sanitizedUpdates).length === 0) {
      return res
        .status(400)
        .json({ error: "No valid fields provided for update" });
    }

    // Find the existing user to retrieve current values
    const existingUser = await db
      .collection<User>("users")
      .findOne({ _id: userId });
    if (!existingUser) return res.status(404).json({ error: "User not found" });

    // Update user document with sanitized fields
    await db
      .collection<User>("users")
      .updateOne({ _id: userId }, { $set: sanitizedUpdates });

    // Check and send Telegram messages for specific updates
    if ("isAccepted" in sanitizedUpdates) {
      const message = sanitizedUpdates.isAccepted
        ? "✅ تم قبول حسابك! يمكنك الآن استخدام البوت."
        : "🚫 لقد تم حظر حسابك من قبل المسؤول.";
      await sendTelegramMessage(existingUser.telegramId, message);
    }

    // Log the update to the history collection
    const historyEntry: HistoryEntry = {
      entity: "user",
      entityId: userId,
      action: "updated",
      timestamp: new Date(),
      performedBy: {
        type: "admin", // Replace with actual performer type
        id: null, // Replace with the actual admin ID
      },
      details: `User '${existingUser.username}' updated`,
      metadata: {
        userId,
        updatedFields: sanitizedUpdates,
        previousValues: {
          username: existingUser.username,
          name: existingUser.name,
          isActive: existingUser.isActive,
          isAccepted: existingUser.isAccepted,
        },
      },
    };

    await db.collection<HistoryEntry>("history").insertOne(historyEntry);

    res.status(200).json({ message: "User updated successfully" });
  } catch (error) {
    console.error("Error updating user:", error);
    res.status(500).json({ error: "Error updating user" });
  }
};

// Reset user balance
export const resetUserBalanceById = async (req: Request, res: Response) => {
  try {
    const db = await connectToDB();
    const userId = new ObjectId(req.params.id);

    const user = await db.collection<User>("users").findOne({ _id: userId });
    if (!user) return res.status(404).json({ error: "User not found" });

    await db
      .collection<User>("users")
      .updateOne({ _id: userId }, { $set: { balance: 0 } });

    // Log the balance reset to the history collection
    const historyEntry: HistoryEntry = {
      entity: "user",
      entityId: userId,
      action: "balance_reset",
      timestamp: new Date(),
      performedBy: {
        type: "admin", // Replace with actual performer type
        id: null, // Replace with the actual admin ID
      },
      details: "User balance reset to 0",
      metadata: {
        previousBalance: user.balance,
      },
    };

    await db.collection<HistoryEntry>("history").insertOne(historyEntry);

    res.status(200).json({ message: "User balance reset successfully" });
  } catch (error) {
    console.error("Error resetting user balance:", error);
    res.status(500).json({ error: "Error resetting user balance" });
  }
};

// Delete a user by ID and log the action
export const deleteUserById = async (req: Request, res: Response) => {
  try {
    const db = await connectToDB();
    const userId = new ObjectId(req.params.id);

    const user = await db.collection<User>("users").findOne({ _id: userId });
    if (!user) return res.status(404).json({ error: "User not found" });

    const result = await db
      .collection<User>("users")
      .deleteOne({ _id: userId });
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    // Log the deletion to the history collection
    const historyEntry: HistoryEntry = {
      entity: "user",
      entityId: userId,
      action: "deleted",
      timestamp: new Date(),
      performedBy: {
        type: "admin", // Replace with actual performer type
        id: null, // Replace with the actual admin ID
      },
      details: `User '${user.username}' deleted`,
      metadata: {
        username: user.username,
        balance: user.balance,
      },
    };

    await db.collection<HistoryEntry>("history").insertOne(historyEntry);

    res.status(200).json({ message: "User deleted" });
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).json({ error: "Error deleting user" });
  }
};
