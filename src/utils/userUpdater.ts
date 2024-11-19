// src/utils/userUpdater.ts
import { connectToDB } from "../db";
import { User } from "../models/user";
import { ObjectId } from "mongodb";

export const updateUsersWithMissingFields = async (): Promise<void> => {
  try {
    const db = await connectToDB();
    const users = await db.collection<User>("users").find().toArray();

    for (const user of users) {
      const updates: Partial<User> = {};

      if (!user.fullName) {
        updates.fullName = "غير متوفر"; // Default value for full name
      }

      if (!user.phoneNumber) {
        updates.phoneNumber = "غير متوفر"; // Default value for phone number
      }

      if (typeof user.totalRecharge === "undefined") {
        updates.totalRecharge = 0; // Initialize totalRecharge if missing
      }

      if (Object.keys(updates).length > 0) {
        await db
          .collection<User>("users")
          .updateOne({ _id: user._id }, { $set: updates });
        console.log(`Updated user ${user.username || user.telegramId}`);
      }
    }

    console.log("All users updated with missing fields.");
  } catch (error) {
    console.error("Error updating users with missing fields:", error);
  }
};
