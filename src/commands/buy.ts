import { InlineKeyboard, Context, SessionFlavor } from "grammy";
import { ObjectId } from "mongodb";
import { connectToDB } from "../db";
import { User } from "../models/user";
import { Product } from "../models/product";
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

const notifyAdmin = async (title: string, details: string): Promise<void> => {
  try {
    await bot.api.sendMessage(ADMIN_TELEGRAM_ID, `*${title}*\n\n${details}`, {
      parse_mode: "Markdown",
    });
  } catch (error) {
    console.error("Error notifying admin:", error);
  }
};

const sendSupportMessage = async (ctx: MyContext): Promise<void> => {
  const supportKeyboard = new InlineKeyboard().url(
    "📞 تواصل عبر WhatsApp",
    "https://wa.me/1234567890"
  );

  await ctx.reply(
    "رصيدك غير كافٍ لإتمام هذه العملية. يُرجى التواصل مع الدعم الفني لإعادة شحن رصيدك.",
    { reply_markup: supportKeyboard }
  );
};

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

    if (product.emails.length === 0) {
      await ctx.reply("❌ المنتج غير متوفر في الوقت الحالي.");
      return;
    }

    const email = product.emails.shift();
    const updatedBalance = user.balance - product.price;

    await db
      .collection<User>("users")
      .updateOne({ telegramId }, { $set: { balance: updatedBalance } });

    await db.collection<Product>("products").updateOne(
      { _id: new ObjectId(productId) },
      {
        $set: {
          emails: product.emails,
          isAvailable: product.emails.length > 0,
        },
      }
    );

    await ctx.reply(
      `🎉 تم شراء المنتج "${product.name}" بنجاح.\n📧 البريد الإلكتروني الخاص بك: ${email}`
    );

    const adminDetails = `
    👤 *المستخدم*:${user.fullName}
    👤 *المعرف*: ${user.telegramId}
📦 *المنتج*: ${product.name}  
📉 *الكمية المتبقية*: ${product.emails.length}  
💰 *السعر*: ${formatCurrency(product.price)}`;

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
