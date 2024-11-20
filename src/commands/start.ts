import { MyContext } from "../types";
import { connectToDB } from "../db";
import { User } from "../models/user";
import { Keyboard } from "grammy";

// Define admin Telegram ID from environment
const ADMIN_TELEGRAM_ID = process.env.ADMIN_TELEGRAM_ID || 5565239578;

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

      // Notify admin of the new user
      await sendAdminNotification(ctx, user);

      // Ask for full name
      await ctx.reply("مرحبًا بك! 😊\n\nيرجى إدخال اسمك الكامل:");
      ctx.session.awaitingFullName = true;
      return;
    }

    // Existing user
    if (!user.fullName) {
      await ctx.reply("🔤 يُرجى إدخال اسمك الكامل:");
      ctx.session.awaitingFullName = true;
    } else if (!user.phoneNumber) {
      await ctx.reply("📞 يُرجى إدخال رقم هاتفك:");
      ctx.session.awaitingPhoneNumber = true;
    } else if (!user.isAccepted) {
      await ctx.reply(
        "🔒 شكرًا لتسجيلك. حسابك قيد المراجعة. يُرجى الانتظار حتى يتم قبوله."
      );
    } else {
      await ctx.reply(
        `مرحبًا ${user.fullName}! 👋\n\nشكرًا لاستخدامك البوت! 🎉`
      );
    }
  } catch (error) {
    console.error("Error in handleStartCommand:", error);
    await ctx.reply("❌ حدث خطأ أثناء التسجيل. يُرجى المحاولة لاحقًا.");
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
    await ctx.reply(
      "✅ تم حفظ اسمك الكامل بنجاح.\n\n📞 يُرجى الآن إدخال رقم هاتفك:"
    );
    ctx.session.awaitingPhoneNumber = true;
  } catch (error) {
    console.error("Error in handleFullNameInput:", error);
    await ctx.reply("❌ حدث خطأ أثناء حفظ اسمك الكامل. يُرجى المحاولة لاحقًا.");
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
    await ctx.reply(
      "✅ شكرًا لك! تم حفظ رقم هاتفك بنجاح.\n\n🔒 حسابك قيد المراجعة. سيتم إعلامك عند القبول."
    );
  } catch (error) {
    console.error("Error in handlePhoneNumberInput:", error);
    await ctx.reply("❌ حدث خطأ أثناء حفظ رقم هاتفك. يُرجى المحاولة لاحقًا.");
  }
};

// Notify admin of a new user
const sendAdminNotification = async (ctx: MyContext, user: User) => {
  try {
    const message =
      `👤 **مستخدم جديد قام بالتسجيل**:\n\n` +
      `🔹 **الاسم**: ${user.name}\n` +
      `🔹 **اسم المستخدم**: @${user.username || "غير متوفر"}\n` +
      `🔹 **معرف تيليجرام**: ${user.telegramId}\n` +
      `🔹 **تاريخ التسجيل**: ${new Date().toLocaleString()}\n\n` +
      `يرجى مراجعة حساب المستخدم والقبول أو الرفض.`;

    // Send to admin
    await ctx.api.sendMessage(ADMIN_TELEGRAM_ID, message, {
      parse_mode: "Markdown",
    });
  } catch (error) {
    console.error("Error sending admin notification:", error);
  }
};
