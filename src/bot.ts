import { Bot, Context, session, SessionFlavor } from "grammy";
import dotenv from "dotenv";
import {
  handleStartCommand,
  handleFullNameInput,
  handlePhoneNumberInput,
} from "./commands/start";
import { handleBalanceCommand } from "./commands/balance";
import {
  handleProductsCommand,
  handleCategorySelection,
} from "./commands/products";
import {
  initiateBuyCommand,
  handleBuyConfirmation,
  handlePreOrderMessage,
  handleCancelPurchase,
  handlePreOrderConfirmation,
} from "./commands/buy";
import { handleAccountCommand } from "./commands/account";
import { handleSupportCommand } from "./commands/support";
import { startServer } from "./server";

// Load environment variables
dotenv.config();

if (!process.env.BOT_TOKEN) {
  throw new Error("BOT_TOKEN is not set in environment variables.");
}

// Define session data interface
interface SessionData {
  awaitingPreOrderMessage?: boolean;
  preOrderProductId?: string | null;
  awaitingFullName?: boolean;
  awaitingPhoneNumber?: boolean;
}

// Extend Context type to include session data
type MyContext = Context & SessionFlavor<SessionData>;

// Create the bot instance
const bot = new Bot<MyContext>(process.env.BOT_TOKEN);

// Initialize session middleware
bot.use(
  session({
    initial: (): SessionData => ({
      awaitingPreOrderMessage: false,
      preOrderProductId: null,
      awaitingFullName: false,
      awaitingPhoneNumber: false,
    }),
  })
);

// Command Handlers
bot.command("start", async (ctx) => handleStartCommand(ctx));
bot.hears("📊 عرض الرصيد", async (ctx) => handleBalanceCommand(ctx));
bot.hears("🛍️ عرض المنتجات", async (ctx) => handleProductsCommand(ctx));
bot.hears("📞 التواصل مع الدعم", async (ctx) => handleSupportCommand(ctx));
bot.hears("حسابي", async (ctx) => handleAccountCommand(ctx));

// Callback Query Handlers
bot.callbackQuery(/^category_(.*)$/, async (ctx) => {
  try {
    const categoryId = ctx.match[1];
    await handleCategorySelection(ctx, categoryId);
    await ctx.answerCallbackQuery();
  } catch (error) {
    console.error("Error in category selection:", error);
    await ctx.reply("⚠️ حدث خطأ أثناء عرض الفئة. يُرجى المحاولة مرة أخرى.");
  }
});

bot.callbackQuery(/^buy_(.*)$/, async (ctx) => {
  try {
    const productId = ctx.match[1];
    await initiateBuyCommand(ctx, productId);
    await ctx.answerCallbackQuery();
  } catch (error) {
    console.error("Error in purchase initiation:", error);
    await ctx.reply("⚠️ حدث خطأ أثناء بدء الشراء. يُرجى المحاولة مرة أخرى.");
  }
});

bot.callbackQuery(/^confirm_(.*)$/, async (ctx) => {
  try {
    const productId = ctx.match[1];
    await handleBuyConfirmation(ctx, productId);
    await ctx.answerCallbackQuery();
  } catch (error) {
    console.error("Error in purchase confirmation:", error);
    await ctx.reply("⚠️ حدث خطأ أثناء تأكيد الشراء. يُرجى المحاولة مرة أخرى.");
  }
});

bot.callbackQuery(/^preorder_(.*)$/, async (ctx) => {
  try {
    const productId = ctx.match[1];
    await handlePreOrderConfirmation(ctx, productId);
    await ctx.answerCallbackQuery();
  } catch (error) {
    console.error("Error in pre-order confirmation:", error);
    await ctx.reply(
      "⚠️ حدث خطأ أثناء تأكيد الطلب المسبق. يُرجى المحاولة مرة أخرى."
    );
  }
});

bot.callbackQuery(/^cancel_(.*)$/, async (ctx) => {
  try {
    await handleCancelPurchase(ctx);
    await ctx.answerCallbackQuery();
  } catch (error) {
    console.error("Error in cancellation:", error);
    await ctx.reply("⚠️ حدث خطأ أثناء إلغاء العملية. يُرجى المحاولة مرة أخرى.");
  }
});

// Message Handlers for User Input
bot.on("message:text", async (ctx) => {
  try {
    if (ctx.session.awaitingFullName) {
      await handleFullNameInput(ctx);
    } else if (ctx.session.awaitingPhoneNumber) {
      await handlePhoneNumberInput(ctx);
    } else if (ctx.session.awaitingPreOrderMessage) {
      await handlePreOrderMessage(ctx);
    }
  } catch (error) {
    console.error("Error in message handler:", error);
    await ctx.reply(
      "⚠️ حدث خطأ أثناء معالجة الرسالة. يُرجى المحاولة مرة أخرى."
    );
  }
});

// Global Error Handler
bot.catch((error) => {
  const ctx = error.ctx;
  console.error("Error while handling update:", error.error);
  ctx.reply(
    "⚠️ حدث خطأ غير متوقع. الرجاء المحاولة مرة أخرى لاحقًا أو التواصل مع الدعم."
  );
});

// Start the server and bot
startServer()
  .then(() => {
    bot.start();
    console.log("🤖 تم تشغيل البوت بنجاح...");
  })
  .catch((err) => {
    console.error("⚠️ فشل تشغيل الخادم:", err);
  });

export { bot };
