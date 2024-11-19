// src/commands/buy.ts

import { InlineKeyboard, Context, SessionFlavor } from "grammy";
import { ObjectId } from "mongodb";
import { connectToDB } from "../db";
import { User } from "../models/user";
import { Product } from "../models/product";
import { HistoryEntry } from "../models/history";
import { bot } from "../bot";
import {
  createPreOrderInDB,
  notifyUserAboutPreOrder,
  notifyAdminAboutPreOrder,
} from "./preorder"; // Import pre-order functions

const ADMIN_TELEGRAM_ID = process.env.ADMIN_TELEGRAM_ID || "5565239578"; // Admin Telegram ID
const formatCurrency = (amount: number): string => `${amount.toFixed(2)} وحدة`; // Customize your currency format

// Define SessionData and MyContext locally
interface SessionData {
  awaitingPreOrderMessage?: boolean;
  preOrderProductId?: string | null;
}

type MyContext = Context & SessionFlavor<SessionData>;

// Map to keep track of confirmation timeouts per user
const confirmationTimeouts: { [key: string]: NodeJS.Timeout } = {};

// Function to send a support message with a WhatsApp button
const sendSupportMessage = async (ctx: MyContext) => {
  const supportKeyboard = new InlineKeyboard().url(
    "📞 تواصل عبر WhatsApp",
    "https://wa.me/1234567890" // Replace with your actual WhatsApp number
  );

  await ctx.reply(
    "رصيدك غير كافٍ لإتمام هذه العملية. يُرجى التواصل مع الدعم الفني لإعادة شحن رصيدك.",
    { reply_markup: supportKeyboard }
  );
};

// Function to initiate the buy command and ask for confirmation
export const initiateBuyCommand = async (
  ctx: MyContext,
  productId: string
): Promise<void> => {
  try {
    const db = await connectToDB();
    const product = await db.collection<Product>("products").findOne({
      _id: new ObjectId(productId),
    });

    if (!product) {
      await ctx.reply("❌ المنتج غير موجود.");
      return;
    }

    const user = await db.collection<User>("users").findOne({
      telegramId: ctx.from?.id.toString(),
    });

    if (!user) {
      await ctx.reply("❌ المستخدم غير موجود.");
      return;
    }

    // Check product availability
    if (!product.isAvailable) {
      // Product is out of stock
      if (product.allowPreOrder) {
        // Offer pre-order option
        const keyboard = new InlineKeyboard()
          .text("🔄 طلب مسبق", `preorder_${product._id}`)
          .row()
          .text("❌ إلغاء", `cancel_${product._id}`);

        await ctx.reply(
          `المنتج "${product.name}" غير متوفر حاليًا. هل ترغب في طلبه مسبقًا؟`,
          {
            reply_markup: keyboard,
          }
        );
      } else {
        await ctx.reply(
          `عذرًا، المنتج "${product.name}" غير متوفر حاليًا ولا يدعم الطلب المسبق.`
        );
      }
      return;
    }

    // Proceed with normal purchase flow
    const keyboard = new InlineKeyboard()
      .text("✅ تأكيد الشراء", `confirm_${product._id}`)
      .row()
      .text("❌ إلغاء", `cancel_${product._id}`);

    await ctx.reply(
      `هل ترغب في شراء المنتج "${product.name}" بسعر ${product.price} وحدة؟`,
      {
        reply_markup: keyboard,
      }
    );

    // Set a timeout to cancel the purchase after a certain period
    const telegramId = ctx.from?.id.toString();
    if (telegramId) {
      confirmationTimeouts[telegramId] = setTimeout(() => {
        delete confirmationTimeouts[telegramId];
        ctx.reply(
          "⏳ انتهى وقت التأكيد. يُرجى إعادة المحاولة إذا كنت لا تزال ترغب في الشراء."
        );
      }, 300000); // 5 minutes timeout
    }
  } catch (error) {
    console.error("Error in initiateBuyCommand:", error);
    await ctx.reply("حدث خطأ. يرجى المحاولة مرة أخرى لاحقًا.");
  }
};

// Function to handle purchase confirmation
export const handleBuyConfirmation = async (
  ctx: MyContext,
  productId: string
): Promise<void> => {
  try {
    const telegramId = ctx.from?.id.toString();
    if (!telegramId) return;

    const db = await connectToDB();
    const user = await db.collection<User>("users").findOne({ telegramId });
    const product = await db
      .collection<Product>("products")
      .findOne({ _id: new ObjectId(productId) });

    if (!user || !product) {
      await ctx.reply("❌ Error: User or product not found.");
      return;
    }

    // Check balance and product availability
    if (user.balance < product.price) {
      await ctx.reply("❌ Insufficient balance.");
      return;
    }

    if (product.emails.length === 0) {
      await ctx.reply("❌ Product out of stock.");
      return;
    }

    // Deduct balance and update product availability
    const email = product.emails.shift();
    const newBalance = user.balance - product.price;

    await db
      .collection<User>("users")
      .updateOne({ telegramId }, { $set: { balance: newBalance } });

    await db.collection<Product>("products").updateOne(
      { _id: new ObjectId(productId) },
      {
        $set: {
          emails: product.emails,
          isAvailable: product.emails.length > 0,
        },
      }
    );

    // Notify user about purchase
    await ctx.reply(
      `🎉 تم شراء المنتج "${product.name}" بنجاح.\n📧 البريد الإلكتروني: ${email}`
    );

    // Log purchase in history
    const historyEntry: HistoryEntry = {
      entity: "purchase",
      entityId: new ObjectId(productId),
      action: "purchase_made",
      timestamp: new Date(),
      performedBy: {
        type: "user",
        id: user._id.toHexString(),
      },
      details: `User '${user.username}' purchased '${product.name}'`,
      metadata: {
        userId: user._id,
        productId: product._id,
        price: product.price,
        email,
      },
    };

    await db.collection<HistoryEntry>("history").insertOne(historyEntry);

    // Notify admin about the purchase
    const adminMessage =
      `🛒 **تنبيه عملية شراء**:\n\n` +
      `👤 **المستخدم**: ${user.username} (ID: ${user._id})\n` +
      `📦 **المنتج**: ${product.name}\n` +
      `📉 **الكمية المتبقية**: ${product.emails.length}\n` +
      `💰 **السعر**: ${formatCurrency(product.price)}\n\n` +
      `يرجى مراجعة لوحة التحكم للتفاصيل.`;
    await bot.api.sendMessage(ADMIN_TELEGRAM_ID, adminMessage);
  } catch (error) {
    console.error("Error in handleBuyConfirmation:", error);
    await ctx.reply("❌ Error processing purchase. Please try again.");
  }
};

// Updated handlePreOrderMessage
export const handlePreOrderMessage = async (ctx: MyContext): Promise<void> => {
  try {
    const telegramId = ctx.from?.id.toString();
    if (!telegramId) return;

    if (
      ctx.session.awaitingPreOrderMessage &&
      ctx.session.preOrderProductId &&
      ctx.message?.text
    ) {
      const db = await connectToDB();
      const productId = ctx.session.preOrderProductId;
      const message = ctx.message.text;

      const user = await db.collection<User>("users").findOne({ telegramId });

      if (!user) {
        await ctx.reply("❌ المستخدم غير موجود.");
        return;
      }

      // Create pre-order in the database
      const preOrder = await createPreOrderInDB(
        new ObjectId(user._id),
        new ObjectId(productId),
        message
      );

      if (!preOrder) {
        await ctx.reply("❌ حدث خطأ أثناء إنشاء الطلب المسبق.");
        return;
      }

      // Notify user
      await notifyUserAboutPreOrder(preOrder);

      // Notify admin
      await notifyAdminAboutPreOrder(preOrder);

      // Clear session variables
      ctx.session.awaitingPreOrderMessage = false;
      ctx.session.preOrderProductId = null;
    } else {
      await ctx.reply("❌ لا يوجد عملية طلب مسبق نشطة.");
    }
  } catch (error) {
    console.error("Error in handlePreOrderMessage:", error);
    await ctx.reply(
      "حدث خطأ أثناء معالجة طلبك المسبق. يرجى المحاولة مرة أخرى لاحقًا."
    );
  }
};
export const handlePreOrderConfirmation = async (
  ctx: MyContext,
  productId: string
): Promise<void> => {
  try {
    const db = await connectToDB();
    const product = await db.collection<Product>("products").findOne({
      _id: new ObjectId(productId),
    });

    if (!product) {
      await ctx.reply("❌ المنتج غير موجود.");
      return;
    }

    const user = await db.collection<User>("users").findOne({
      telegramId: ctx.from?.id.toString(),
    });

    if (!user) {
      await ctx.reply("❌ المستخدم غير موجود.");
      return;
    }

    // Check if user has enough balance
    if (user.balance < product.price) {
      await ctx.reply("❌ ليس لديك رصيد كافٍ لإتمام الطلب المسبق.");
      return;
    }

    // Ask the user for a message to include with the pre-order
    await ctx.reply("يرجى كتابة رسالة أو ملاحظة تريد إرفاقها مع طلبك المسبق:");
    ctx.session.awaitingPreOrderMessage = true;
    ctx.session.preOrderProductId = productId;
  } catch (error) {
    console.error("Error in handlePreOrderConfirmation:", error);
    await ctx.reply(
      "حدث خطأ أثناء تأكيد الطلب المسبق. يرجى المحاولة مرة أخرى لاحقًا."
    );
  }
};
export const handleCancelPurchase = async (ctx: MyContext): Promise<void> => {
  const telegramId = ctx.from?.id.toString();
  if (telegramId && confirmationTimeouts[telegramId]) {
    clearTimeout(confirmationTimeouts[telegramId]);
    delete confirmationTimeouts[telegramId];
  }
  // Clear session variables if any
  ctx.session.awaitingPreOrderMessage = false;
  ctx.session.preOrderProductId = null;
  await ctx.reply("❌ تم إلغاء العملية.");
};
