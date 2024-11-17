// src/bot.ts

import { Bot, Context, session, SessionFlavor } from "grammy";
import dotenv from "dotenv";
import { handleStartCommand } from "./commands/start";
import { handleBalanceCommand } from "./commands/balance";
import {
  handleProductsCommand,
  handleCategorySelection,
} from "./commands/products";
import {
  initiateBuyCommand,
  handleBuyConfirmation,
  handlePreOrderConfirmation,
  handlePreOrderMessage,
  handleCancelPurchase,
} from "./commands/buy";
import { handleSupportCommand } from "./commands/support";
import { connectToDB } from "./db";
import { User } from "./models/user";
import { startServer } from "./server";

// Load environment variables from .env file
dotenv.config();

// Define the session data interface
interface SessionData {
  awaitingPreOrderMessage?: boolean;
  preOrderProductId?: string | null;
}

// Extend the Context type to include session data
type MyContext = Context & SessionFlavor<SessionData>;

// Create the bot instance with the custom context type
const bot = new Bot<MyContext>(process.env.BOT_TOKEN || "");

// Middleware to check if user is accepted
bot.use(async (ctx, next) => {
  if (ctx.from && ctx.message && ctx.message.text !== "/start") {
    const telegramId = ctx.from.id.toString();
    const db = await connectToDB();
    const user = await db.collection<User>("users").findOne({ telegramId });

    if (!user) {
      // User is not registered, ask them to use /start
      await ctx.reply("يُرجى إرسال /start للتسجيل في البوت.");
      return;
    }

    if (!user.isAccepted) {
      // User is not accepted yet
      await ctx.reply(
        "يُرجى الانتظار حتى يقوم المسؤول بالموافقة على حسابك. 🔒"
      );
      return;
    }

    // User is accepted, proceed to next middleware/handler
    await next();
  } else {
    await next();
  }
});

// Use session middleware to manage user sessions
bot.use(session({ initial: (): SessionData => ({}) }));

// Start command to show the main menu
bot.command("start", async (ctx) => handleStartCommand(ctx));

// Handle balance check
bot.hears("📊 رصيد", async (ctx) => handleBalanceCommand(ctx));

// Handle product viewing by category
bot.hears("🛍️ المنتجات", async (ctx) => handleProductsCommand(ctx));

// Handle support command
bot.hears("📞 دعم", async (ctx) => handleSupportCommand(ctx));

// Handle category selection for products
bot.callbackQuery(/^category_(.*)$/, async (ctx) => {
  const categoryId = ctx.match[1];
  await handleCategorySelection(ctx, categoryId);
  await ctx.answerCallbackQuery();
});

// Handle purchase initiation
bot.callbackQuery(/^buy_(.*)$/, async (ctx) => {
  const productId = ctx.match[1];
  await initiateBuyCommand(ctx, productId);
  await ctx.answerCallbackQuery();
});

// Handle confirmation for purchase
bot.callbackQuery(/^confirm_(.*)$/, async (ctx) => {
  const productId = ctx.match[1];
  await handleBuyConfirmation(ctx, productId);
  await ctx.answerCallbackQuery();
});

// Handle pre-order confirmation
bot.callbackQuery(/^preorder_(.*)$/, async (ctx) => {
  const productId = ctx.match[1];
  await handlePreOrderConfirmation(ctx, productId);
  await ctx.answerCallbackQuery();
});

// Handle cancellation of purchase or pre-order
bot.callbackQuery(/^cancel_(.*)$/, async (ctx) => {
  await handleCancelPurchase(ctx);
  await ctx.answerCallbackQuery();
});

// Handle messages when expecting a pre-order message
bot.on("message:text", async (ctx) => {
  if (ctx.session.awaitingPreOrderMessage) {
    await handlePreOrderMessage(ctx);
  }
});

// Global error handler to prevent bot shutdown on error
bot.catch((error) => {
  const ctx = error.ctx;
  console.error("Error while handling update:", error.error);
  ctx.reply(
    "حدث خطأ غير متوقع. الرجاء المحاولة مرة أخرى لاحقًا أو التواصل مع الدعم."
  );
});

// Start the server and then the bot
startServer()
  .then(() => {
    bot.start();
    console.log("Bot is running...");
  })
  .catch((err) => {
    console.error("Failed to start the server:", err);
  });

// Export the bot instance
export { bot };
