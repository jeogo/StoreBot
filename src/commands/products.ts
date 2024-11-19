import { Context, InlineKeyboard } from "grammy";
import { connectToDB } from "../db";
import { ObjectId } from "mongodb";
import { Product } from "../models/product";
import { Category } from "../models/category";
import { bot } from "../bot";

const ADMIN_TELEGRAM_ID = process.env.ADMIN_TELEGRAM_ID || "5565239578";

const notifyAdminOutOfStock = async (product: Product): Promise<void> => {
  try {
    const message =
      `🚨 *منتج نفد من المخزون - تقرير مفصل* 🚨\n\n` +
      `📦 *تفاصيل المنتج*:\n` +
      `• الاسم: *${product.name}*\n` +
      `• المعرف: \`${product._id}\`\n` +
      `• الفئة: ${product.categoryId}\n\n` +
      `💰 *معلومات التسعير*:\n` +
      `• السعر الأصلي: ${product.price} وحدة\n` +
      `• الكمية الحالية: 0\n\n` +
      `⚠️ *إجراءات مقترحة*:\n` +
      `• مراجعة المخزون الفوري\n` +
      `• تحديث حالة المنتج\n` +
      `• اتصال بالموردين\n\n` +
      `🕒 *وقت الإشعار*: ${new Date().toLocaleString()}`;

    await bot.api.sendMessage(ADMIN_TELEGRAM_ID, message, {
      parse_mode: "Markdown",
    });
  } catch (error) {
    console.error("Detailed out-of-stock notification error:", error);
  }
};

export const handleProductsCommand = async (ctx: Context): Promise<void> => {
  try {
    const db = await connectToDB();
    const categories = await db
      .collection<Category>("categories")
      .find()
      .toArray();

    if (categories.length === 0) {
      await ctx.reply("🚫 لا توجد فئات متاحة.");
      return;
    }

    const keyboard = new InlineKeyboard();
    categories.forEach((category) => {
      keyboard.text(`🏷️ ${category.name}`, `category_${category._id}`).row();
    });

    await ctx.reply("📂 اختر فئة المنتجات:", {
      reply_markup: keyboard,
      parse_mode: "Markdown",
    });
  } catch (error) {
    console.error("Products command error:", error);
    await ctx.reply("⚠️ خطأ في تحميل التصنيفات.");
  }
};

export const handleCategorySelection = async (
  ctx: Context,
  categoryId: string
): Promise<void> => {
  try {
    const db = await connectToDB();
    const products = await db
      .collection<Product>("products")
      .find({ categoryId: new ObjectId(categoryId) })
      .toArray();

    if (products.length === 0) {
      await ctx.reply("🚫 لا توجد منتجات في هذه الفئة.");
      return;
    }

    const keyboard = new InlineKeyboard();

    products.forEach((product) => {
      const quantity = product.emails.length;
      let statusEmoji = "🟢";
      let statusText = "متاح";
      let buttonColor = "🛍️";

      if (quantity === 0) {
        if (product.allowPreOrder) {
          statusEmoji = "🟡";
          statusText = "طلب مسبق";
          buttonColor = "⏳";
          notifyAdminOutOfStock(product);
        } else {
          statusEmoji = "🔴";
          statusText = "نفد";
          buttonColor = "🚫";
          notifyAdminOutOfStock(product);
        }
      }

      // Updated button text to include quantity
      const buttonText =
        `${buttonColor} ${product.name}\n` +
        `💰 السعر: ${product.price} ₪\n` +
        `📦 الكمية: ${quantity}\n` +
        `${statusEmoji} الحالة: ${statusText}`;

      keyboard.text(buttonText, `buy_${product._id}`).row();
    });

    await ctx.reply("🏷️ اختر أحد المنتجات:", {
      reply_markup: keyboard,
      parse_mode: "Markdown",
    });
  } catch (error) {
    console.error("Category selection error:", error);
    await ctx.reply("⚠️ خطأ في تحميل المنتجات.");
  }
};
