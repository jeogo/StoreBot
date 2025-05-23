import { MyContext } from "../types";
import { connectToDB } from "../db";
import { User } from "../models/user";
import { Keyboard } from "grammy";

// Define admin Telegram ID from environment
import { sendToAdmin } from '../helpers/adminNotificationHelper';

// Handle the "/start" command
export const handleStartCommand = async (ctx: MyContext) => {
  try {
    const telegramId = ctx.from?.id.toString();
    const chatId = ctx.chat?.id.toString();
    const username = ctx.from?.username || "مستخدم غير معروف";
    const name = ctx.from?.first_name || "مستخدم";

    if (!telegramId || !chatId) {
      console.warn("Missing telegramId or chatId.");
      return ctx.reply("❌ حدث خطأ في التعرف على المستخدم.");
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
        isAccepted: false,
        fullName: "",
        phoneNumber: "",
      };

      await userCollection.insertOne(newUser);

      // Ask for full name first
      ctx.session.awaitingFullName = true;
      await ctx.reply("🔤 يُرجى إدخال اسمك الكامل:");
      return;
    }

    // Check user status and guide accordingly
    if (!user.fullName) {
      ctx.session.awaitingFullName = true;
      await ctx.reply("🔤 يُرجى إدخال اسمك الكامل:");
    } else if (!user.phoneNumber) {
      ctx.session.awaitingPhoneNumber = true;
      await ctx.reply("📞 يُرجى إدخال رقم هاتفك:");
    } else if (!user.isAccepted) {
      await ctx.reply(
        "🔒 شكرًا لتسجيلك. حسابك قيد المراجعة. يُرجى الانتظار حتى يتم قبوله."
      );
    } else {
      await showMainMenu(ctx, user.fullName || "مستخدم");
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
    if (!fullName || fullName.trim().length < 3) {
      await ctx.reply("❌ يُرجى إدخال اسم كامل صالح (على الأقل 3 أحرف).");
      ctx.session.awaitingFullName = true;
      await ctx.reply("🔤 يُرجى إدخال اسمك الكامل:");
      return;
    }

    const db = await connectToDB();
    const result = await db
      .collection<User>("users")
      .updateOne({ telegramId }, { $set: { fullName } });

    ctx.session.awaitingFullName = false;
    ctx.session.awaitingPhoneNumber = true;

    await ctx.reply(
      "✅ تم حفظ اسمك الكامل بنجاح.\n\n📞 يُرجى الآن إدخال رقم هاتفك:"
    );
  } catch (error) {
    console.error("Error in handleFullNameInput:", error);
    await ctx.reply("❌ حدث خطأ أثناء حفظ اسمك الكامل. يُرجى المحاولة لاحقًا.");
  }
};

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
export const sendAdminNotification = async (ctx: MyContext, user: User) => {
  try {
    const message = `🆕 *مستخدم جديد*

*الاسم:* ${user.fullName || "غير محدد"}
*اسم المستخدم:* ${user.username || "غير محدد"}
*معرف التليجرام:* \`${user.telegramId}\`
*رقم الهاتف:* ${user.phoneNumber || "غير محدد"}
*تاريخ التسجيل:* ${user.registerDate ? user.registerDate.toLocaleDateString() : "غير محدد"}

*الإجراءات:*
• يرجى مراجعة وقبول المستخدم
• تحقق من صحة المعلومات المقدمة`;

    await sendToAdmin(message, {
      parse_mode: "Markdown",
      callback_data: `verify_user_${user.telegramId}`
    });

    console.log(`Admin notification sent for user: ${user.telegramId}`);
  } catch (error) {
    console.error("Error sending admin notification:", error);
  }
};

// Show the main menu once the user is approved
const showMainMenu = async (ctx: MyContext, name: string) => {
  try {
    const keyboard = new Keyboard()
      .text("📊 عرض الرصيد")
      .text("🛍️ عرض المنتجات")
      .text("حسابي")
      .row()
      .text("📞 التواصل مع الدعم")
      .text("تحديث")
      .resized();

    await ctx.reply(
      `مرحبًا ${name}! 👋\n\nيمكنك الآن استخدام البوت. 🥳 \n\nتم تحديث البوت بنجاح استمتع بالممزيات الجديدة`,
      {
        reply_markup: {
          keyboard: keyboard.build(),
          resize_keyboard: true,
          one_time_keyboard: false,
        },
      }
    );
  } catch (error) {
    console.error("Error in showMainMenu:", error);
    await ctx.reply("❌ حدث خطأ أثناء عرض القائمة الرئيسية.");
  }
};
