import { MyContext } from "../types";
import { connectToDB } from "../db";
import { User } from "../models/user";
import { Keyboard } from "grammy";

// Handle the "/start" command
export const handleStartCommand = async (ctx: MyContext) => {
  try {
    const telegramId = ctx.from?.id.toString();
    const chatId = ctx.chat?.id.toString();
    const username = ctx.from?.username || "مستخدم غير معروف";
    const name = ctx.from?.first_name || "مستخدم";

    if (!telegramId || !chatId) {
      console.warn("Missing telegramId or chatId.");
      return;
    }

    const db = await connectToDB();
    const userCollection = db.collection<User>("users");

    // Check if the user exists in the database
    let user = await userCollection.findOne({ telegramId });

    if (!user) {
      // Register a new user
      const newUser: User = {
        telegramId,
        chatId,
        username,
        name,
        balance: 0,
        registerDate: new Date(),
        isActive: true,
        isAccepted: false,
        fullName: "",
        phoneNumber: "",
      };

      const result = await userCollection.insertOne(newUser);
      user = { ...newUser, _id: result.insertedId };

      // Prompt the user for their full name
      await ctx.reply("مرحبًا بك! 😊\n\nيرجى إدخال اسمك الكامل:");
      ctx.session.awaitingFullName = true;
      return;
    }

    // If user exists, check their info and confirmation status
    if (!user.fullName) {
      await ctx.reply("يُرجى إدخال اسمك الكامل:");
      ctx.session.awaitingFullName = true;
    } else if (!user.phoneNumber) {
      await ctx.reply("✅ شكرًا لك! الآن يرجى إدخال رقم هاتفك:");
      ctx.session.awaitingPhoneNumber = true;
    } else if (!user.isAccepted) {
      await ctx.reply("🔒 يرجى الانتظار حتى يتم تأكيد حسابك من قبل المسؤول.");
    } else {
      await showMainMenu(ctx, user.fullName || "مستخدم");
    }
  } catch (error) {
    console.error("Error in handleStartCommand:", error);
    await ctx.reply("❌ حدث خطأ أثناء التسجيل. يرجى المحاولة مرة أخرى لاحقًا.");
  }
};

// Handle user input for the full name
export const handleFullNameInput = async (ctx: MyContext): Promise<void> => {
  try {
    const telegramId = ctx.from?.id.toString();
    if (!telegramId) return;

    const fullName = ctx.message?.text;
    if (!fullName) {
      await ctx.reply("❌ يُرجى إدخال اسم كامل صالح.");
      return;
    }

    const db = await connectToDB();
    await db
      .collection<User>("users")
      .updateOne({ telegramId }, { $set: { fullName } });

    ctx.session.awaitingFullName = false;
    await ctx.reply("✅ تم تحديث اسمك الكامل بنجاح.");

    // Check if phone number is missing and prompt
    const user = await db.collection<User>("users").findOne({ telegramId });
    if (user && !user.phoneNumber) {
      ctx.session.awaitingPhoneNumber = true;
      await ctx.reply("📞 يُرجى إدخال رقم هاتفك:");
    }
  } catch (error) {
    console.error("Error in handleFullNameInput:", error);
    await ctx.reply("حدث خطأ أثناء تحديث اسمك الكامل. يُرجى المحاولة لاحقًا.");
  }
};

// Handle user input for the phone number
export const handlePhoneNumberInput = async (ctx: MyContext): Promise<void> => {
  try {
    const telegramId = ctx.from?.id.toString();
    if (!telegramId) return;

    const phoneNumber = ctx.message?.text;
    if (!phoneNumber || !/^\d{10,15}$/.test(phoneNumber)) {
      await ctx.reply("❌ يُرجى إدخال رقم هاتف صالح.");
      return;
    }

    const db = await connectToDB();
    await db
      .collection<User>("users")
      .updateOne({ telegramId }, { $set: { phoneNumber } });

    ctx.session.awaitingPhoneNumber = false;
    await ctx.reply("✅ تم تحديث رقم هاتفك بنجاح.");
  } catch (error) {
    console.error("Error in handlePhoneNumberInput:", error);
    await ctx.reply("حدث خطأ أثناء تحديث رقم هاتفك. يُرجى المحاولة لاحقًا.");
  }
};

// Show the main menu
const showMainMenu = async (ctx: MyContext, name: string) => {
  try {
    const keyboard = new Keyboard()
      .text("📊 عرض الرصيد")
      .text("🛍️ عرض المنتجات")
      .text("حسابي")

      .row()
      .text("📞 التواصل مع الدعم")
      .resized();

    await ctx.reply(`مرحبًا ${name}! 👋\n\nيمكنك الآن استخدام البوت. 🥳`, {
      reply_markup: {
        keyboard: keyboard.build(),
        resize_keyboard: true,
        one_time_keyboard: false,
      },
    });
  } catch (error) {
    console.error("Error in showMainMenu:", error);
    await ctx.reply("❌ حدث خطأ أثناء عرض القائمة الرئيسية.");
  }
};
