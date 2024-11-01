import { Context, InlineKeyboard } from "grammy";
import { connectToDB } from "../db";
import { ObjectId } from "mongodb";

export const handleProductsCommand = async (ctx: Context): Promise<void> => {
  try {
    const db = await connectToDB();
    const categories = await db.collection("categories").find().toArray();

    if (categories.length === 0) {
      ctx.reply("🚫 لا توجد فئات متاحة.");
      return;
    }

    const keyboard = new InlineKeyboard();
    categories.forEach((category) => {
      keyboard.text(`📂 ${category.name}`, `category_${category._id}`);
      keyboard.row();
    });
    ctx.reply("🔍 اختر فئة لعرض المنتجات:", { reply_markup: keyboard });
  } catch (error) {
    console.error("Error in handleProductsCommand:", error);
    ctx.reply("حدث خطأ أثناء تحميل المنتجات. الرجاء المحاولة مرة أخرى لاحقًا.");
  }
};

export const handleCategorySelection = async (
  ctx: Context,
  categoryId: string
): Promise<void> => {
  try {
    const db = await connectToDB();
    const products = await db
      .collection("products")
      .find({ categoryId: new ObjectId(categoryId) })
      .toArray();

    if (products.length === 0) {
      ctx.reply("🚫 لا توجد منتجات في هذه الفئة.");
      return;
    }

    const keyboard = new InlineKeyboard();
    products.forEach((product) => {
      keyboard.text(
        `💼 ${product.name} - ${product.price} وحدة`,
        `buy_${product._id}`
      );
      keyboard.row();
    });

    ctx.reply("💡 اختر منتجًا للشراء:", { reply_markup: keyboard });
  } catch (error) {
    console.error("Error in handleCategorySelection:", error);
    ctx.reply("حدث خطأ أثناء تحميل المنتجات. الرجاء المحاولة مرة أخرى لاحقًا.");
  }
};
