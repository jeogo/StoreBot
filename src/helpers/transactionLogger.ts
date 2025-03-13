// src/helpers/transactionLogger.ts
import { User, UserEvent } from "../models/user";
import { Context } from "grammy";

export const logTransaction = (user: User, entry: UserEvent) => {
  user.history = user.history || [];
  user.history.push(entry); // Add the new entry to the user's history
};

// Send a message to the client about their new balance
export const sendBalanceUpdateMessage = async (
  ctx: Context,
  user: User,
  oldBalance: number
) => {
  const newBalance = user.balance;
  await ctx.reply(
    `رصيدك السابق كان: ${oldBalance} وحدة.\nرصيدك الجديد هو: ${newBalance} وحدة.`
  );
};

// Handle a purchase and update user’s history
export const handlePurchase = async (
  ctx: Context,
  user: User,
  productName: string,
  productPrice: number
) => {
  const oldBalance = user.balance;
  user.balance -= productPrice; // Deduct purchase amount

  logTransaction(user, {
    date: new Date(),
    type: "purchase",
    amount: productPrice,
    productName
  });

  await sendBalanceUpdateMessage(ctx, user, oldBalance);
};
