import { Context, InlineKeyboard } from "grammy";
import { connectToDB } from "../db";
import { ObjectId, WithId } from "mongodb";
import { Product } from "../models/product";
import { Category } from "../models/category";
import { bot } from "../bot";

// Constants
const ADMIN_TELEGRAM_ID = process.env.TELEGRAM_ADMIN_ID || "5928329785";
const DIVIDER = "▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰";

// Types
type ProductStatus = "نفد" | "طلب مسبق" | "تم شراؤه";
type StatusEmoji = "✅" | "⏳" | "❌";

interface CategoryWithId extends WithId<Category> {
  name: string;
  emoji?: string;
}

// Helper Functions
const formatPrice = (price: number): string => {
  return `${price}₪`;
};

const getStatusEmoji = (quantity: number, allowPreOrder: boolean): StatusEmoji => {
  if (quantity > 0) return "✅";
  return allowPreOrder ? "⏳" : "❌";
};

const formatTimestamp = (): string => {
  return new Date().toLocaleString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

// Message Templates
const createProductDetails = (
  product: Product,
  category: CategoryWithId | null,
  quantity?: number
): string => {
  return [
    `📦 *تفاصيل المنتج*`,
    DIVIDER,
    `*${product.name}*`,
    `💰 السعر: ${formatPrice(product.price)}`,
    `📁 الفئة: ${category?.name || "غير محدد"}`,
    quantity !== undefined ? `📊 الكمية المتوفرة: ${quantity}` : "",
    product.description ? `📝 الوصف: ${product.description}` : "",
  ]
    .filter(Boolean)
    .join("\n");
};

const createAdminNotification = (
  product: Product,
  status: ProductStatus,
  userId: number,
  category: CategoryWithId | null
): string => {
  return [
    `🔔 *إشعار جديد*`,
    DIVIDER,
    createProductDetails(product, category),
    "",
    `👤 *معلومات المشتري*`,
    `🆔 معرف المستخدم: \`${userId}\``,
    `📊 الحالة: *${status}*`,
    `🕒 التاريخ: ${formatTimestamp()}`,
  ].join("\n");
};

// Main Functions
const notifyAdminProductStatus = async (
  product: Product,
  status: ProductStatus,
  userId: number
): Promise<void> => {
  try {
    const db = await connectToDB();
    const category = await db
      .collection<CategoryWithId>("categories")
      .findOne({ _id: product.categoryId });

    await bot.api.sendMessage(
      ADMIN_TELEGRAM_ID,
      createAdminNotification(product, status, userId, category),
      { parse_mode: "Markdown" }
    );
  } catch (error) {
    console.error("Admin notification error:", error);
  }
};

export const handleProductsCommand = async (ctx: Context): Promise<void> => {
  try {
    const db = await connectToDB();
    const categories = await db
      .collection<CategoryWithId>("categories")
      .find()
      .toArray();

    if (categories.length === 0) {
      await ctx.reply("⚠️ عذراً، لا توجد فئات متاحة حالياً.");
      return;
    }

    const keyboard = new InlineKeyboard();
    categories.forEach((category) => {
      keyboard
        .text(
          `${category.emoji || "📁"} ${category.name}`,
          `category_${category._id}`
        )
        .row();
    });

    const welcomeMessage = [
      `🏪 *مرحباً بك في المتجر*`,
      DIVIDER,
      `الرجاء اختيار الفئة المطلوبة من القائمة أدناه:`,
    ].join("\n");

    await ctx.reply(welcomeMessage, {
      parse_mode: "Markdown",
      reply_markup: keyboard,
    });
  } catch (error) {
    console.error("Categories loading error:", error);
    await ctx.reply("⚠️ حدث خطأ أثناء تحميل الفئات. الرجاء المحاولة لاحقاً.");
  }
};

export const handleCategorySelection = async (
  ctx: Context,
  categoryId: string
): Promise<void> => {
  try {
    const db = await connectToDB();
    const category = await db
      .collection<CategoryWithId>("categories")
      .findOne({ _id: new ObjectId(categoryId) });

    const products = await db
      .collection<Product>("products")
      .find({ categoryId: new ObjectId(categoryId) })
      .toArray();

    if (products.length === 0) {
      await ctx.reply(
        `⚠️ لا توجد منتجات متوفرة في فئة "${
          category?.name || "غير محدد"
        }" حالياً.`
      );
      return;
    }

    const keyboard = new InlineKeyboard();
    products.forEach((product) => {
      const quantity = product.emails.length;
      const statusEmoji = getStatusEmoji(quantity, product.allowPreOrder);
      const buttonText = `${statusEmoji} ${product.name} | ${formatPrice(
        product.price
      )}`;
      keyboard.text(buttonText, `buy_${product._id}`).row();
    });

    const categoryMessage = [
      `📂 *${category?.name || "فئة غير محددة"}*`,
      DIVIDER,
      `📊 عدد المنتجات: ${products.length}`,
      "",
      `🔍 *دليل الرموز:*`,
      `✅ متوفر للشراء الفوري`,
      `⏳ متاح للطلب المسبق`,
      `❌ نفذت الكمية`,
      "",
      `الرجاء اختيار المنتج المطلوب:`,
    ].join("\n");

    await ctx.reply(categoryMessage, {
      parse_mode: "Markdown",
      reply_markup: keyboard,
    });
  } catch (error) {
    console.error("Product listing error:", error);
    await ctx.reply("⚠️ حدث خطأ أثناء تحميل المنتجات. الرجاء المحاولة لاحقاً.");
  }
};

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
      await ctx.reply("⚠️ عذراً، المنتج غير موجود.");
      return;
    }

    const category = await db
      .collection<CategoryWithId>("categories")
      .findOne({ _id: product.categoryId });

    const quantity = product.emails.length;

    if (quantity > 0) {
      const email = product.emails.pop();
      const successMessage = [
        `✨ *تم إتمام عملية الشراء بنجاح*`,
        DIVIDER,
        createProductDetails(product, category),
        "",
        `📧 *معلومات الحساب*`,
        `\`${email}\``,
        "",
        `🙏 شكراً لثقتكم بنا`,
      ].join("\n");

      await ctx.reply(successMessage, { parse_mode: "Markdown" });
      notifyAdminProductStatus(product, "تم شراؤه", ctx.from!.id);

      // Update product in database
      await db
        .collection<Product>("products")
        .updateOne(
          { _id: new ObjectId(productId) },
          { $set: { emails: product.emails } }
        );
    } else if (product.allowPreOrder) {
      const preOrderMessage = [
        `⏳ *تم تسجيل طلبك المسبق*`,
        DIVIDER,
        createProductDetails(product, category),
        "",
        `📢 سيتم إعلامك فور توفر المنتج`,
        `🙏 نشكر صبركم وثقتكم`,
      ].join("\n");

      await ctx.reply(preOrderMessage, { parse_mode: "Markdown" });
      notifyAdminProductStatus(product, "طلب مسبق", ctx.from!.id);
    } else {
      const soldOutMessage = [
        `❌ *نعتذر، نفذت الكمية*`,
        DIVIDER,
        createProductDetails(product, category),
        "",
        `📢 يرجى المحاولة لاحقاً`,
      ].join("\n");

      await ctx.reply(soldOutMessage, { parse_mode: "Markdown" });
      notifyAdminProductStatus(product, "نفد", ctx.from!.id);
    }
  } catch (error) {
    console.error("Purchase processing error:", error);
    await ctx.reply("⚠️ حدث خطأ أثناء معالجة الطلب. الرجاء المحاولة لاحقاً.");
  }
};