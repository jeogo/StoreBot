// src/commands/start.ts
import { Context, Keyboard } from "grammy";
import { connectToDB } from "../db";
import { ObjectId } from "mongodb";

export const handleStartCommand = async (ctx: Context) => {
  try {
    const telegramId = ctx.from?.id.toString();
    const username = ctx.from?.username || "Unknown User";
    const name = ctx.from?.first_name || "User";

    if (!telegramId) return;

    const db = await connectToDB();
    const userCollection = db.collection("users");

    // Check if the user is already in the database
    let user = await userCollection.findOne({ telegramId });

    // Register the user automatically if not found
    if (!user) {
      const newUser = {
        telegramId,
        username,
        name,
        balance: 0, // Default starting balance
        registerDate: new Date(),
        history: [], // Empty history on registration
      };

      // Insert the new user into the database
      const result = await userCollection.insertOne(newUser);
      user = { ...newUser, _id: result.insertedId };

      // Registration confirmation message
      await ctx.reply("🎉 تم تسجيلك بنجاح في النظام!");
    }

    // Initial greeting message
    let message = `مرحبًا ${name}! 👋\n\n`;

    // Notify user about their balance
    if (user.balance <= 0) {
      message += `رصيدك الحالي هو ${user.balance} وحدة. يرجى التواصل مع الدعم الفني لإضافة الرصيد.`;
    } else {
      message += "استخدم الأزرار أدناه للوصول إلى الميزات:";
    }

    // Display keyboard options
    const keyboard = new Keyboard()
      .text("📊 رصيد")
      .text("🛍️ المنتجات")
      .text("📞 دعم");

    await ctx.reply(message, {
      reply_markup: { keyboard: keyboard.build(), resize_keyboard: true },
    });
  } catch (error) {
    console.error("Error in handleStartCommand:", error);
    await ctx.reply(
      "حدث خطأ أثناء تحميل القائمة الرئيسية. الرجاء المحاولة مرة أخرى لاحقًا."
    );
  }
};
