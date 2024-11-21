import { Context, InlineKeyboard } from "grammy";
import { connectToDB } from "../db";
import { ObjectId } from "mongodb";
import { Product } from "../models/product";
import { Category } from "../models/category";
import { bot } from "../bot";

const ADMIN_TELEGRAM_ID = process.env.ADMIN_TELEGRAM_ID || "5928329785";

const notifyAdminProductStatus = async (
  product: Product,
  status: "نفد" | "طلب مسبق" | "تم شراؤه",
  userId: number
): Promise<void> => {
  try {
    const db = await connectToDB();
    const category = await db
      .collection<Category>("categories")
      .findOne({ _id: product.categoryId });

    const message =
      `🚨 *تحديث حالة المنتج* 🚨\n\n` +
      `📦 *تفاصيل المنتج*:\n` +
      `• الاسم: *${product.name}*\n` +
      `• الفئة: ${category ? category.name : "غير محدد"}\n` +
      `• الحالة: *${status}*\n\n` +
      `👤 *معلومات المستخدم*:\n` +
      `• معرف المستخدم: ${userId}\n\n` +
      `🕒 *وقت الإشعار*: ${new Date().toLocaleString()}`;

    await bot.api.sendMessage(ADMIN_TELEGRAM_ID, message, {
      parse_mode: "Markdown",
    });
  } catch (error) {
    console.error("Product status notification error:", error);
  }
};

// Handle the "/products" Command
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
    });
  } catch (error) {
    console.error("Products command error:", error);
    await ctx.reply("⚠️ خطأ في تحميل التصنيفات.");
  }
};

// Handle Category Selection
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
      let buttonText = `${product.name} | ${product.price}₪ | `;

      if (quantity > 0) {
        buttonText += `🟢 متاح (${quantity})`;
      } else if (product.allowPreOrder) {
        buttonText += `🟡 طلب مسبق`;
      } else {
        buttonText += `🔴 نفد`;
      }

      keyboard.text(buttonText, `buy_${product._id}`).row();
    });

    await ctx.reply("🛍️ اختر المنتج:", {
      reply_markup: keyboard,
    });
  } catch (error) {
    console.error("Category selection error:", error);
    await ctx.reply("⚠️ خطأ في تحميل المنتجات.");
  }
};

// Handle Product Purchase
export const handleProductPurchase = async (
  ctx: Context,
  productId: string
): Promise<void> => {
  try {
    const db = await connectToDB();
    const product = await db
      .collection<Product>("products")
      .findOne({ _id: new ObjectId(productId) });

    if (!product) {
      await ctx.reply("🚫 المنتج غير موجود.");
      return;
    }

    const quantity = product.emails.length;

    if (quantity > 0) {
      // Product is available
      const email = product.emails.pop(); // Take the first available email
      await ctx.reply(
        `🎉 تم شراء المنتج: ${product.name}\n📧 البريد الإلكتروني: ${email}`
      );
      notifyAdminProductStatus(product, "تم شراؤه", ctx.from!.id);
    } else if (product.allowPreOrder) {
      // Pre-order allowed
      await ctx.reply(`⏳ تم تسجيل طلب مسبق للمنتج: ${product.name}`);
      notifyAdminProductStatus(product, "طلب مسبق", ctx.from!.id);
    } else {
      // Product out of stock
      await ctx.reply(`🚫 المنتج نفد: ${product.name}`);
      notifyAdminProductStatus(product, "نفد", ctx.from!.id);
    }
  } catch (error) {
    console.error("Product purchase error:", error);
    await ctx.reply("⚠️ حدث خطأ أثناء معالجة الطلب.");
  }
};
