// src/commands/products.ts
import { Context, InlineKeyboard } from "grammy";
import { connectToDB } from "../db";
import { ObjectId } from "mongodb";
import { Product } from "../models/product";
import { Category } from "../models/category";

export const handleProductsCommand = async (ctx: Context): Promise<void> => {
  try {
    const db = await connectToDB();
    const categories = await db
      .collection<Category>("categories")
      .find()
      .toArray();

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
      .collection<Product>("products")
      .find({ categoryId: new ObjectId(categoryId) })
      .toArray();

    if (products.length === 0) {
      ctx.reply("🚫 لا توجد منتجات في هذه الفئة.");
      return;
    }

    const keyboard = new InlineKeyboard();
    products.forEach((product) => {
      const quantity = product.emails.length;
        let buttonText = ` ${product.name} - ${product.price} وحدة - الكمية: ${quantity}`;

      if (quantity === 0 && product.allowPreOrder) {
        buttonText = ` ${product.name} - ${product.price} وحدة - الكمية: 0 - متاح للطلب المسبق`;
      } else if (quantity === 0) {
        // If product is out of stock and doesn't allow pre-order
        buttonText = ` ${product.name} - غير متوفر حاليًا`;
      }

      keyboard.text(buttonText, `buy_${product._id}`);
      keyboard.row();
    });

    ctx.reply("💡 اختر منتجًا للشراء:", { reply_markup: keyboard });
  } catch (error) {
    console.error("Error in handleCategorySelection:", error);
    ctx.reply("حدث خطأ أثناء تحميل المنتجات. الرجاء المحاولة مرة أخرى لاحقًا.");
  }
};
