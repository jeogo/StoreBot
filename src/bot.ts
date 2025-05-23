import { Bot, Context, session, SessionFlavor } from "grammy";
import dotenv from "dotenv";
import { MongoClient } from "mongodb"; // Assuming MongoDB for user data storage
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
import { startSalesReportScheduler } from './helpers/salesReportScheduler';

// Load environment variables
dotenv.config();

const {BOT_TOKEN} = process.env;
if (!BOT_TOKEN) {
  throw new Error("BOT_TOKEN is not set in environment variables.");
}

const client = new MongoClient(process.env.MONGODB_URI || ""); // Fallback if MONGO_URI is not set
const db = client.db("test");
const usersCollection = db.collection("users");

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
const bot = new Bot<MyContext>(BOT_TOKEN);

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

// Function to check if the user is accepted
async function isUserAccepted(telegramId: number): Promise<boolean> {
  try {
    const user = await usersCollection.findOne({
      telegramId: telegramId.toString(), // Convert to string to match the model
    });

    // Check multiple conditions for user acceptance
    if (!user) {
      console.log(`No user found for telegramId: ${telegramId}`);
      return false;
    }

    // Ensure all required fields are filled
    if (!user.fullName || !user.phoneNumber) {
      console.log(`User missing fullName or phoneNumber: ${telegramId}`);
      return false;
    }

    // Explicitly log the isAccepted status
    console.log(`isAccepted for ${telegramId}: ${user.isAccepted}`);

    // Check isAccepted flag
    return user.isAccepted === true;
  } catch (error) {
    console.error("Error checking user acceptance:", error);
    return false;
  }
}

// Command Handlers with User Acceptance Check
bot.command("start", async (ctx) => {
  handleStartCommand(ctx); // Proceed with the command if accepted
});

bot.hears("تحديث", async (ctx) => {
  const telegramId = ctx.from?.id;

  if (!telegramId) {
    return ctx.reply(
      "⚠️ لم تتم الموافقة على استخدامك للبوت. الرجاء الانتظار للموافقة."
    );
  }

  const isAccepted = await isUserAccepted(telegramId);
  if (!isAccepted) {
    return ctx.reply(
      "⚠️ لم تتم الموافقة على استخدامك للبوت. الرجاء الانتظار للموافقة."
    );
  }

  handleStartCommand(ctx); // Proceed with the command if accepted
});

bot.hears("📊 عرض الرصيد", async (ctx) => {
  const telegramId = ctx.from?.id;

  if (!telegramId) {
    return ctx.reply(
      "⚠️ لم تتم الموافقة على استخدامك للبوت. الرجاء الانتظار للموافقة."
    );
  }

  const isAccepted = await isUserAccepted(telegramId);
  if (!isAccepted) {
    return ctx.reply(
      "⚠️ لم تتم الموافقة على استخدامك للبوت. الرجاء الانتظار للموافقة."
    );
  }

  handleBalanceCommand(ctx); // Proceed with the command if accepted
});

bot.hears("🛍️ عرض المنتجات", async (ctx) => {
  const telegramId = ctx.from?.id;

  if (!telegramId) {
    return ctx.reply(
      "⚠️ لم تتم الموافقة على استخدامك للبوت. الرجاء الانتظار للموافقة."
    );
  }

  const isAccepted = await isUserAccepted(telegramId);
  if (!isAccepted) {
    return ctx.reply(
      "⚠️ لم تتم الموافقة على استخدامك للبوت. الرجاء الانتظار للموافقة."
    );
  }

  handleProductsCommand(ctx); // Proceed with the command if accepted
});

bot.hears("📞 التواصل مع الدعم", async (ctx) => {
  const telegramId = ctx.from?.id;

  if (!telegramId) {
    return ctx.reply(
      "⚠️ لم تتم الموافقة على استخدامك للبوت. الرجاء الانتظار للموافقة."
    );
  }

  const isAccepted = await isUserAccepted(telegramId);
  if (!isAccepted) {
    return ctx.reply(
      "⚠️ لم تتم الموافقة على استخدامك للبوت. الرجاء الانتظار للموافقة."
    );
  }

  handleSupportCommand(ctx); // Proceed with the command if accepted
});

bot.hears("حسابي", async (ctx) => {
  const telegramId = ctx.from?.id;

  if (!telegramId) {
    return ctx.reply(
      "⚠️ لم تتم الموافقة على استخدامك للبوت. الرجاء الانتظار للموافقة."
    );
  }

  const isAccepted = await isUserAccepted(telegramId);
  if (!isAccepted) {
    return ctx.reply(
      "⚠️ لم تتم الموافقة على استخدامك للبوت. الرجاء الانتظار للموافقة."
    );
  }

  handleAccountCommand(ctx); // Proceed with the command if accepted
});

// Callback Query Handlers
bot.callbackQuery(/^category_(.*)$/, async (ctx) => {
  const telegramId = ctx.from?.id;
  if (!telegramId) {
    return ctx.reply(
      "⚠️ لم تتم الموافقة على استخدامك للبوت. الرجاء الانتظار للموافقة."
    );
  }

  const isAccepted = await isUserAccepted(telegramId);
  if (!isAccepted) {
    return ctx.reply(
      "⚠️ لم تتم الموافقة على استخدامك للبوت. الرجاء الانتظار للموافقة."
    );
  }

  const categoryId = ctx.match[1];
  await handleCategorySelection(ctx, categoryId);
  await ctx.answerCallbackQuery();
});

bot.callbackQuery(/^buy_(.*)$/, async (ctx) => {
  const telegramId = ctx.from?.id;
  if (!telegramId) {
    return ctx.reply(
      "⚠️ لم تتم الموافقة على استخدامك للبوت. الرجاء الانتظار للموافقة."
    );
  }

  const isAccepted = await isUserAccepted(telegramId);
  if (!isAccepted) {
    return ctx.reply(
      "⚠️ لم تتم الموافقة على استخدامك للبوت. الرجاء الانتظار للموافقة."
    );
  }

  const productId = ctx.match[1];
  await initiateBuyCommand(ctx, productId);
  await ctx.answerCallbackQuery();
});

bot.callbackQuery(/^confirm_(.*)$/, async (ctx) => {
  const telegramId = ctx.from?.id;
  if (!telegramId) {
    return ctx.reply(
      "⚠️ لم تتم الموافقة على استخدامك للبوت. الرجاء الانتظار للموافقة."
    );
  }

  const isAccepted = await isUserAccepted(telegramId);
  if (!isAccepted) {
    return ctx.reply(
      "⚠️ لم تتم الموافقة على استخدامك للبوت. الرجاء الانتظار للموافقة."
    );
  }

  const productId = ctx.match[1];
  await handleBuyConfirmation(ctx, productId);
  await ctx.answerCallbackQuery();
});

bot.callbackQuery(/^preorder_(.*)$/, async (ctx) => {
  const telegramId = ctx.from?.id;
  if (!telegramId) {
    return ctx.reply(
      "⚠️ لم تتم الموافقة على استخدامك للبوت. الرجاء الانتظار للموافقة."
    );
  }

  const isAccepted = await isUserAccepted(telegramId);
  if (!isAccepted) {
    return ctx.reply(
      "⚠️ لم تتم الموافقة على استخدامك للبوت. الرجاء الانتظار للموافقة."
    );
  }

  const productId = ctx.match[1];
  await handlePreOrderConfirmation(ctx, productId);
  await ctx.answerCallbackQuery();
});

bot.callbackQuery(/^cancel_(.*)$/, async (ctx) => {
  const telegramId = ctx.from?.id;
  if (!telegramId) {
    return ctx.reply(
      "⚠️ لم تتم الموافقة على استخدامك للبوت. الرجاء الانتظار للموافقة."
    );
  }

  await handleCancelPurchase(ctx);
  await ctx.answerCallbackQuery();
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
    await ctx.reply("⚠️ حدث خطأ غير متوقع. الرجاء المحاولة مرة أخرى لاحقًا.");
  }
});

// Global Error Handler
bot.catch((error) => {
  const {ctx} = error;
  console.error("Error while handling update:", error.error);
  ctx.reply(
    "⚠️ حدث خطأ غير متوقع. الرجاء المحاولة مرة أخرى لاحقًا أو التواصل مع الدعم."
  );
});

// Start the server and bot
startServer()
  .then(() => {
    bot.start();
    startSalesReportScheduler(); // تشغيل جدولة تقارير المبيعات
    console.log('🤖 تم تشغيل البوت بنجاح...');
  })
  .catch((err) => {
    console.error('Failed to start server or bot:', err);
  });

export { bot };
