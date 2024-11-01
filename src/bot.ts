import { Bot, GrammyError, HttpError } from "grammy";
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
  handleCancelPurchase,
} from "./commands/buy";
import { handleSupportCommand } from "./commands/support";

// Import the Express server
import "./server";

dotenv.config();

const bot = new Bot(process.env.BOT_TOKEN || "");

// Start command to show the main menu
bot.command("start", (ctx) => handleStartCommand(ctx));

// Handle balance check
bot.hears("📊 رصيد", async (ctx) => await handleBalanceCommand(ctx));

// Handle product viewing by category
bot.hears("🛍️ المنتجات", async (ctx) => await handleProductsCommand(ctx));

// Handle support command
bot.hears("📞 دعم", async (ctx) => handleSupportCommand(ctx));

// Handle category selection for products
bot.callbackQuery(/^category_(.*)$/, async (ctx) => {
  const categoryId = ctx.match[1];
  await handleCategorySelection(ctx, categoryId);
  ctx.answerCallbackQuery();
});

// Handle purchase initiation
bot.callbackQuery(/^buy_(.*)$/, async (ctx) => {
  const productId = ctx.match[1];
  await initiateBuyCommand(ctx, productId);
  ctx.answerCallbackQuery();
});

// Handle confirmation for purchase
bot.callbackQuery(/^confirm_(.*)$/, async (ctx) => {
  const productId = ctx.match[1];
  await handleBuyConfirmation(ctx, productId);
  ctx.answerCallbackQuery();
});

// Handle cancellation of purchase
bot.callbackQuery(/^cancel_(.*)$/, async (ctx) => {
  await handleCancelPurchase(ctx);
  ctx.answerCallbackQuery();
});

// Global error handler to prevent bot shutdown on error
bot.catch((error) => {
  const ctx = error.ctx;
  console.error("Error while handling update:", error.error);
  if (error.error instanceof GrammyError) {
    console.error("GrammyError:", error.error.description);
  } else if (error.error instanceof HttpError) {
    console.error("HttpError:", error.error.message);
  } else {
    console.error("Unknown error:", error.error);
  }
  ctx.reply(
    "حدث خطأ غير متوقع. الرجاء المحاولة مرة أخرى لاحقًا أو التواصل مع الدعم."
  );
});

// Start the bot
bot.start();
console.log("Bot is running...");
