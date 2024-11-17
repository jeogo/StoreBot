// src/commands/buy.ts

import { InlineKeyboard, Context, SessionFlavor } from "grammy";
import { ObjectId } from "mongodb";
import { connectToDB } from "../db";
import { User } from "../models/user";
import { Product } from "../models/product";
import { PreOrder } from "../models/preorder";
import { HistoryEntry } from "../models/history";
import { formatOutOfStockMessage } from "../utils/messages";

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

    // Clear any existing timeout
    if (confirmationTimeouts[telegramId]) {
      clearTimeout(confirmationTimeouts[telegramId]);
      delete confirmationTimeouts[telegramId];
    }

    const db = await connectToDB();
    const user = await db.collection<User>("users").findOne({ telegramId });
    const product = await db
      .collection<Product>("products")
      .findOne({ _id: new ObjectId(productId) });

    if (!user || !product) {
      await sendSupportMessage(ctx);
      return;
    }

    // Check if user has enough balance
    if (user.balance < product.price) {
      await sendSupportMessage(ctx);
      return;
    }

    // Check product availability
    if (product.emails.length === 0) {
      await ctx.reply(formatOutOfStockMessage());
      return;
    }

    // Proceed with the purchase
    const email = product.emails.shift();
    if (!email) {
      await ctx.reply(formatOutOfStockMessage());
      return;
    }

    const newBalance = user.balance - product.price;

    // Update user's balance
    await db
      .collection<User>("users")
      .updateOne({ telegramId }, { $set: { balance: newBalance } });

    // Update product email list and availability
    await db.collection<Product>("products").updateOne(
      { _id: new ObjectId(productId) },
      {
        $set: {
          emails: product.emails,
          isAvailable: product.emails.length > 0,
        },
      }
    );

    // Log the purchase in the history
    const historyEntry: HistoryEntry = {
      entity: "purchase",
      entityId: new ObjectId(), // Assign a new ObjectId or use an existing one if relevant
      action: "purchase_made",
      timestamp: new Date(), // Assign Date object
      performedBy: {
        type: "user",
        id: user._id.toHexString(), // Convert ObjectId to string
      },
      details: `User '${user.username}' purchased product '${product.name}'`,
      metadata: {
        userId: user._id,
        productId: product._id,
        price: product.price,
        emailProvided: email,
      },
    };

    await db.collection<HistoryEntry>("history").insertOne(historyEntry);

    // Send the purchased email to the user
    await ctx.reply(
      `🎉 تهانينا! لقد تم شراء المنتج "${product.name}" بنجاح.\n\n📧 البريد الإلكتروني: ${email}\n\nشكرًا لتسوقك معنا!`
    );
  } catch (error) {
    console.error("Error in handleBuyConfirmation:", error);
    await sendSupportMessage(ctx);
  }
};

// Function to handle pre-order confirmation
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
    // Save the state that the bot is waiting for the user's message
    ctx.session.awaitingPreOrderMessage = true;
    ctx.session.preOrderProductId = productId;
  } catch (error) {
    console.error("Error in handlePreOrderConfirmation:", error);
    await ctx.reply(
      "حدث خطأ أثناء معالجة الطلب المسبق. يرجى المحاولة مرة أخرى لاحقًا."
    );
  }
};

// Function to handle the user's message for pre-order
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

      const product = await db.collection<Product>("products").findOne({
        _id: new ObjectId(productId),
      });

      const user = await db.collection<User>("users").findOne({
        telegramId,
      });

      if (!product || !user) {
        await ctx.reply("❌ حدث خطأ. المنتج أو المستخدم غير موجود.");
        return;
      }

      // Check if user has enough balance (again, just in case)
      if (user.balance < product.price) {
        await ctx.reply("❌ ليس لديك رصيد كافٍ لإتمام الطلب المسبق.");
        return;
      }

      // Deduct the price from user's balance
      const newBalance = user.balance - product.price;
      await db
        .collection<User>("users")
        .updateOne({ _id: user._id }, { $set: { balance: newBalance } });

      // Create the pre-order
      const newPreOrder: PreOrder = {
        _id: new ObjectId(), // Assign a new ObjectId
        userId: user._id,
        productId: product._id,
        date: new Date(),
        status: "pending",
        message: message,
        userName: user.username,
        userTelegramId: user.telegramId,
        productName: product.name,
        productPrice: product.price,
      };

      const result = await db
        .collection<PreOrder>("preorders")
        .insertOne(newPreOrder);

      // Log the pre-order in history
      const historyEntry: HistoryEntry = {
        entity: "preorder",
        entityId: result.insertedId, // Assign the inserted pre-order's ObjectId
        action: "preorder_created",
        timestamp: new Date(), // Assign Date object
        performedBy: {
          type: "user",
          id: user._id.toHexString(), // Convert ObjectId to string
        },
        details: `User '${user.username}' created a pre-order for product '${product.name}'`,
        metadata: {
          userId: user._id,
          productId: product._id,
          price: product.price,
          message: message,
        },
      };

      await db.collection<HistoryEntry>("history").insertOne(historyEntry);

      // Send confirmation message to the user
      await ctx.reply(
        `✅ تم إنشاء طلبك المسبق للمنتج "${product.name}" بنجاح.\n\n💬 رسالتك: "${message}"\n\nسنقوم بإعلامك عندما يصبح المنتج متوفرًا. شكرًا لك!`
      );

      // Clear the session variables
      ctx.session.awaitingPreOrderMessage = false;
      ctx.session.preOrderProductId = null;
    } else {
      // If the bot wasn't expecting a pre-order message
      await ctx.reply("❌ لا يوجد عملية طلب مسبق نشطة.");
    }
  } catch (error) {
    console.error("Error in handlePreOrderMessage:", error);
    await ctx.reply(
      "حدث خطأ أثناء معالجة رسالتك للطلب المسبق. يرجى المحاولة مرة أخرى لاحقًا."
    );
  }
};

// Function to handle cancellation of purchase or pre-order
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
