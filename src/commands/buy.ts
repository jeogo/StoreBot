import { InlineKeyboard, Context, SessionFlavor } from "grammy";
import { ObjectId } from "mongodb";
import { connectToDB } from "../db";
import { User } from "../models/user";
import { Product } from "../models/product";
import { Category } from "../models/category"; // Added Category model import
import { bot } from "../bot";
import {
  createPreOrderInDB,
  notifyUserAboutPreOrder,
  notifyAdminAboutPreOrder,
} from "./preorder";

const ADMIN_TELEGRAM_ID = process.env.ADMIN_TELEGRAM_ID || "5928329785";
const formatCurrency = (amount: number): string => `${amount.toFixed(2)}₪`;

interface SessionData {
  awaitingPreOrderMessage?: boolean;
  preOrderProductId?: string | null;
}

type MyContext = Context & SessionFlavor<SessionData>;

const confirmationTimeouts: { [key: string]: NodeJS.Timeout } = {};

// Notify Admin Function
const notifyAdmin = async (title: string, details: string): Promise<void> => {
  try {
    await bot.api.sendMessage(ADMIN_TELEGRAM_ID, `*${title}*\n\n${details}`, {
      parse_mode: "Markdown",
    });
  } catch (error) {
    console.error("Error notifying admin:", error);
  }
};

// Save to History Function
const saveToHistory = async (
  actionType: string,
  description: string,
  user: User,
  product?: Product,
  additionalDetails?: Partial<any>
): Promise<void> => {
  const db = await connectToDB();

  // Fetch category if product exists
  let categoryName = "غير محدد";
  if (product?.categoryId) {
    const category = await db.collection<Category>("categories").findOne({
      _id: new ObjectId(product.categoryId),
    });
    categoryName = category?.name || "غير محدد";
  }

  const historyRecord = {
    userId: user._id,
    actionType,
    description,
    date: new Date(),
    productId: product?._id,
    productName: product?.name,
    price: product?.price,
    categoryName, // Include category name in history
    fullName: user.fullName || "Unknown", // Include full name
    phoneNumber: user.phoneNumber || "Unknown", // Include phone number
    ...additionalDetails,
  };

  await db.collection("history").insertOne(historyRecord);
};

// Support Message
const sendSupportMessage = async (ctx: MyContext): Promise<void> => {
  const supportKeyboard = new InlineKeyboard().url(
    "📞 تواصل عبر WhatsApp",
    "https://wa.me/213557349101"
  );

  await ctx.reply(
    "رصيدك غير كافٍ لإتمام هذه العملية. يُرجى التواصل مع الدعم الفني لإعادة شحن رصيدك.",
    { reply_markup: supportKeyboard }
  );
};

// Initiate Purchase Command
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

    if (!product.isAvailable) {
      const keyboard = new InlineKeyboard()
        .text("🔄 طلب مسبق", `preorder_${product._id}`)
        .row()
        .text("❌ إلغاء", `cancel_${product._id}`);

      await ctx.reply(
        `المنتج "${product.name}" غير متوفر حاليًا. هل ترغب في طلبه مسبقًا؟`,
        { reply_markup: keyboard }
      );
      return;
    }

    const keyboard = new InlineKeyboard()
      .text("✅ تأكيد الشراء", `confirm_${product._id}`)
      .row()
      .text("❌ إلغاء", `cancel_${product._id}`);

    await ctx.reply(
      `هل ترغب في شراء المنتج "${product.name}" بسعر ${formatCurrency(
        product.price
      )}؟`,
      { reply_markup: keyboard }
    );

    const telegramId = ctx.from?.id.toString();
    if (telegramId) {
      confirmationTimeouts[telegramId] = setTimeout(() => {
        delete confirmationTimeouts[telegramId];
        ctx.reply(
          "⏳ انتهى وقت التأكيد. يُرجى إعادة المحاولة إذا كنت لا تزال ترغب في الشراء."
        );
      }, 300000);
    }
  } catch (error) {
    console.error("Error in initiateBuyCommand:", error);
    await ctx.reply("⚠️ حدث خطأ. يُرجى المحاولة مرة أخرى لاحقًا.");
  }
};

// Confirm Purchase
export const handleBuyConfirmation = async (
  ctx: MyContext,
  productId: string
): Promise<void> => {
  try {
    const telegramId = ctx.from?.id.toString();
    if (!telegramId) return;

    const db = await connectToDB();
    const user = await db.collection<User>("users").findOne({ telegramId });
    const product = await db.collection<Product>("products").findOne({
      _id: new ObjectId(productId),
    });

    if (!user || !product) {
      await ctx.reply("❌ حدث خطأ: المنتج أو المستخدم غير موجود.");
      return;
    }

    if (user.balance < product.price) {
      await sendSupportMessage(ctx);
      return;
    }

    // Fetch category name
    const category = await db.collection<Category>("categories").findOne({
      _id: new ObjectId(product.categoryId),
    });
    const categoryName = category?.name || "غير محدد";

    const email = product.emails.shift(); // Take the first available email
    const updatedBalance = user.balance - product.price;

    // Save purchase to history
    const description = `تم شراء المنتج ${product.name} بسعر ${formatCurrency(
      product.price
    )}`;
    await saveToHistory("purchase", description, user, product, {
      emailSold: email,
    });

    // Update user balance and history
    await db.collection<User>("users").updateOne(
      { telegramId },
      {
        $set: { balance: updatedBalance },
        $push: {
          history: {
            type: "purchase",
            date: new Date(),
            productId: product._id,
            productName: product.name,
            price: product.price,
            categoryName, // Now part of the schema
            emailSold: email,
          },
        },
      }
    );

    // Update product details and sales history
    await db.collection<Product>("products").updateOne(
      { _id: new ObjectId(productId) },
      {
        $set: {
          emails: product.emails,
          isAvailable: product.emails.length > 0,
        },
        $push: {
          archive: {
            emailPassword: email,
            soldTo: new ObjectId(user._id),
            soldAt: new Date(),
            price: product.price,
          },
        },
      }
    );

    // Notify user of successful purchase
    await ctx.reply(
      `🎉 تم شراء المنتج "${product.name}" بنجاح.\n📧 البريد الإلكتروني الخاص بك: ${email}`
    );

    // Notify admin about the purchase
    const adminDetails = `
      🛒 *عملية شراء جديدة*:
      👤 *الاسم الكامل*: ${user.fullName || "غير محدد"}
      📞 *رقم الهاتف*: ${user.phoneNumber || "غير محدد"}
      👤 *المعرف*: ${user.telegramId}
      📦 *المنتج*: ${product.name}
      🗂 *التصنيف*: ${categoryName}
      📧 *البريد الإلكتروني*: ${email}
      📉 *الكمية المتبقية*: ${product.emails.length}  
      💰 *السعر*: ${formatCurrency(product.price)}
    `;

    await notifyAdmin("🛒 تنبيه عملية شراء", adminDetails);
  } catch (error) {
    console.error("Error in handleBuyConfirmation:", error);
    await ctx.reply("⚠️ حدث خطأ أثناء معالجة الشراء. يُرجى المحاولة مرة أخرى.");
  }
};

export const handlePreOrderMessage = async (ctx: MyContext): Promise<void> => {
  try {
    if (
      !ctx.session.awaitingPreOrderMessage ||
      !ctx.session.preOrderProductId
    ) {
      await ctx.reply("⚠️ لا يوجد عملية طلب مسبق نشطة.");
      return;
    }

    const telegramId = ctx.from?.id.toString();
    if (!telegramId) return;

    const db = await connectToDB();
    const productId = ctx.session.preOrderProductId;
    const message = ctx.message?.text;

    if (!message) {
      await ctx.reply("❌ الرسالة غير صحيحة. يُرجى المحاولة مرة أخرى.");
      return;
    }

    const user = await db.collection<User>("users").findOne({ telegramId });
    if (!user) {
      await ctx.reply("❌ المستخدم غير موجود.");
      return;
    }

    const preOrder = await createPreOrderInDB(
      new ObjectId(user._id),
      new ObjectId(productId),
      message
    );

    if (!preOrder) {
      await ctx.reply(
        "❌ حدث خطأ أثناء إنشاء الطلب المسبق. يُرجى المحاولة لاحقًا."
      );
      return;
    }

    await notifyUserAboutPreOrder(preOrder);
    await notifyAdminAboutPreOrder(preOrder);

    ctx.session.awaitingPreOrderMessage = false;
    ctx.session.preOrderProductId = null;

    await ctx.reply("✅ تم إرسال الطلب المسبق بنجاح.");
  } catch (error) {
    console.error("Error in handlePreOrderMessage:", error);
    await ctx.reply(
      "⚠️ حدث خطأ أثناء معالجة الطلب المسبق. يُرجى المحاولة مرة أخرى."
    );
  }
};

export const handleCancelPurchase = async (ctx: MyContext): Promise<void> => {
  const telegramId = ctx.from?.id.toString();
  if (telegramId && confirmationTimeouts[telegramId]) {
    clearTimeout(confirmationTimeouts[telegramId]);
    delete confirmationTimeouts[telegramId];
  }

  ctx.session.awaitingPreOrderMessage = false;
  ctx.session.preOrderProductId = null;

  await ctx.reply("❌ تم إلغاء العملية.");
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

    if (user.balance < product.price) {
      await ctx.reply("❌ ليس لديك رصيد كافٍ لإتمام الطلب المسبق.");
      return;
    }

    await ctx.reply("يرجى كتابة ملاحظة أو رسالة خاصة للطلب المسبق:");
    ctx.session.awaitingPreOrderMessage = true;
    ctx.session.preOrderProductId = productId;
  } catch (error) {
    console.error("Error in handlePreOrderConfirmation:", error);
    await ctx.reply(
      "⚠️ حدث خطأ أثناء تأكيد الطلب المسبق. يُرجى المحاولة مرة أخرى."
    );
  }
};
