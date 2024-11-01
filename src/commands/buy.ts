// src/commands/buy.ts
import { Context, InlineKeyboard } from "grammy";
import { ObjectId } from "mongodb";
import { connectToDB } from "../db";
import {
  logTransaction,
  sendBalanceUpdateMessage,
} from "../helpers/transactionLogger";
import {
  formatPurchaseMessage,
  formatOutOfStockMessage,
} from "../utils/messages";

const confirmationTimeouts: { [key: string]: NodeJS.Timeout } = {};

// Display a support message with a WhatsApp button
const sendSupportMessage = (ctx: Context) => {
  const supportKeyboard = new InlineKeyboard().url(
    "📞 تواصل عبر WhatsApp",
    "https://wa.me/1234567890" // Replace with actual WhatsApp number
  );

  ctx.reply(
    "رصيدك غير كافٍ لإتمام هذه العملية. يُرجى التواصل مع الدعم الفني لإعادة شحن رصيدك.",
    { reply_markup: supportKeyboard }
  );
};

// Initiate the buy command and ask for confirmation
export const initiateBuyCommand = async (
  ctx: Context,
  productId: string
): Promise<void> => {
  try {
    const telegramId = ctx.from?.id.toString();
    if (!telegramId) return;

    const db = await connectToDB();
    const user = await db.collection("users").findOne({ telegramId });
    const product = await db
      .collection("products")
      .findOne({ _id: new ObjectId(productId) });

    if (!user || !product) {
      sendSupportMessage(ctx); // Inform user to contact support if an issue occurs
      return;
    }

    // Check if user has enough balance
    if (user.balance < product.price) {
      sendSupportMessage(ctx); // Prompt user to contact support
      return;
    }

    // Ask for confirmation if balance is sufficient
    const keyboard = new InlineKeyboard()
      .text("✅ تأكيد", `confirm_${productId}`)
      .text("❌ إلغاء", `cancel_${productId}`);

    ctx.reply(`هل تريد شراء ${product.name} مقابل ${product.price} وحدة؟`, {
      reply_markup: keyboard,
    });

    // Set a timeout for automatic cancellation
    confirmationTimeouts[telegramId] = setTimeout(() => {
      ctx.reply("⏳ انتهت مهلة التأكيد. تم إلغاء العملية تلقائيًا.");
      delete confirmationTimeouts[telegramId];
    }, 30000); // 30 seconds
  } catch (error) {
    console.error("Error in initiateBuyCommand:", error);
    sendSupportMessage(ctx); // Send support message if an error occurs
  }
};

// Handle purchase confirmation and clear timeout
export const handleBuyConfirmation = async (
  ctx: Context,
  productId: string
): Promise<void> => {
  try {
    const telegramId = ctx.from?.id.toString();
    if (!telegramId) return;

    if (confirmationTimeouts[telegramId]) {
      clearTimeout(confirmationTimeouts[telegramId]);
      delete confirmationTimeouts[telegramId];
    }

    const db = await connectToDB();
    const user = await db.collection("users").findOne({ telegramId });
    const product = await db
      .collection("products")
      .findOne({ _id: new ObjectId(productId) });

    if (!user || !product) {
      sendSupportMessage(ctx); // Prompt user to contact support if any issue
      return;
    }

    // Check if user has enough balance
    if (user.balance < product.price) {
      sendSupportMessage(ctx); // Send support message if balance is insufficient
      return;
    }

    const email = product.emails.shift();
    if (!email) {
      ctx.reply(formatOutOfStockMessage());
      return;
    }

    const oldBalance = user.balance;
    const newBalance = oldBalance - product.price;

    // Update user's balance and log the transaction in MongoDB
    await db.collection("users").updateOne(
      { telegramId },
      {
        $set: { balance: newBalance },
        $push: {
          history: {
            date: new Date(),
            type: "purchase",
            amount: product.price,
            productName: product.name,
            description: `شراء منتج: ${product.name}`,
          } as any, // Use 'any' to satisfy PushOperator type
        },
      }
    );

    // Send the client a message with their updated balance and product details
    await sendBalanceUpdateMessage(
      ctx,
      { ...user, balance: newBalance } as any,
      oldBalance
    );
    ctx.reply(
      formatPurchaseMessage(product.name, product.price, newBalance, email) +
        `\n\nكلمة السر: ${product.password}`
    );

    // Update product email list in the database after purchase
    await db
      .collection("products")
      .updateOne(
        { _id: new ObjectId(productId) },
        { $set: { emails: product.emails } }
      );
  } catch (error) {
    console.error("Error in handleBuyConfirmation:", error);
    sendSupportMessage(ctx); // Send support message if an error occurs
  }
};

// Handle cancellation of purchase and clear timeout
export const handleCancelPurchase = async (ctx: Context): Promise<void> => {
  const telegramId = ctx.from?.id.toString();
  if (telegramId && confirmationTimeouts[telegramId]) {
    clearTimeout(confirmationTimeouts[telegramId]);
    delete confirmationTimeouts[telegramId];
  }
  ctx.reply("❌ تم إلغاء عملية الشراء.");
};
