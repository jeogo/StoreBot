// src/commands/start.ts
import { Context, Keyboard } from "grammy";
import { connectToDB } from "../db";
import { User } from "../models/user"; // Import the User interface
import { ObjectId } from "mongodb";

export const handleStartCommand = async (ctx: Context) => {
  try {
    const telegramId = ctx.from?.id.toString();
    const username = ctx.from?.username || "Unknown User";
    const name = ctx.from?.first_name || "User";

    if (!telegramId) return;

    const db = await connectToDB();
    const userCollection = db.collection<User>("users");

    // Check if the user is already in the database
    let user = await userCollection.findOne({ telegramId });

    // Register the user automatically if not found
    if (!user) {
      const newUser: User = {
        telegramId,
        username,
        name,
        balance: 0, // Default starting balance
        registerDate: new Date(),
        isActive: true,
        isAccepted: false, // User is not accepted yet
      };

      // Insert the new user into the database
      const result = await userCollection.insertOne(newUser);
      user = { ...newUser, _id: result.insertedId };

      // Send message indicating that user needs to be accepted by admin
      await ctx.reply(
        "تم تسجيلك بنجاح! ✅\n\nيُرجى الانتظار حتى يقوم المسؤول بالموافقة على حسابك. 🔒"
      );
      return; // Stop further execution
    }

    // Check if user is accepted
    if (!user.isAccepted) {
      await ctx.reply(
        "تم تسجيلك بالفعل! ✅\n\nيُرجى الانتظار حتى يقوم المسؤول بالموافقة على حسابك. 🔒"
      );
      return; // Stop further execution
    }

    // If user is accepted
    await ctx.reply(`مرحبًا ${name}! 👋\n\nيمكنك الآن استخدام البوت. 🥳`);

    // Display keyboard options
    const keyboard = new Keyboard()
      .text("📊 رصيد")
      .text("🛍️ المنتجات")
      .text("📞 دعم");

    await ctx.reply("استخدم الأزرار أدناه للوصول إلى الميزات:", {
      reply_markup: { keyboard: keyboard.build(), resize_keyboard: true },
    });
  } catch (error) {
    console.error("Error in handleStartCommand:", error);
    await ctx.reply(
      "حدث خطأ أثناء تحميل القائمة الرئيسية. الرجاء المحاولة مرة أخرى لاحقًا."
    );
  }
};
