// src/helpers/balanceUpdater.ts
import { Context } from "grammy";
import { User, HistoryEntry, PaymentHistoryEntry } from "../models/user";
import { db } from "../db"; // MongoDB connection

// Log a transaction in the user's history
export const logTransaction = async (user: User, entry: HistoryEntry) => {
  console.log("Logging transaction:", entry);
  user.history.push(entry);
  await db
    .collection("users")
    .updateOne({ _id: user._id }, { $set: { history: user.history } });
  console.log("Transaction logged successfully.");
};

// Update user balance, log the transaction, and notify the user
export const updateBalance = async (
  ctx: Context,
  user: User,
  amount: number
) => {
  const oldBalance = user.balance;
  user.balance += amount;

  console.log(
    `Updating balance for user ${user.telegramId}. Old: ${oldBalance}, New: ${user.balance}`
  );

  // Log the balance update in payment history
  const paymentEntry: PaymentHistoryEntry = {
    date: new Date(),
    amount: amount,
    description: `Balance updated by ${amount} points.`,
  };
  user.paymentHistory.push(paymentEntry);

  // Log transaction history
  const historyEntry: HistoryEntry = {
    date: new Date(),
    type: "charge",
    amount: amount,
    description: `Balance increased by ${amount} points.`,
  };
  await logTransaction(user, historyEntry);

  // Update the user in the database
  await db
    .collection("users")
    .updateOne(
      { _id: user._id },
      { $set: { balance: user.balance, paymentHistory: user.paymentHistory } }
    );

  // Send balance update message directly here
  try {
    console.log(
      "Attempting to send balance update message to:",
      user.telegramId
    );
    await ctx.api.sendMessage(
      user.telegramId,
      `🔔 Your balance has been updated. New balance: ${user.balance} points.`
    );
    console.log(`Balance update message sent to ${user.telegramId}`);
  } catch (error) {
    console.error(`Failed to send balance update message: ${error}`);
  }
};
