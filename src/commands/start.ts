// src/commands/start.ts
import { Context, Keyboard } from "grammy";
import { connectToDB } from "../db";

export const handleStartCommand = async (ctx: Context) => {
  try {
    const telegramId = ctx.from?.id.toString();
    if (!telegramId) return;

    const db = await connectToDB();
    const user = await db.collection("users").findOne({ telegramId });

    let message = "مرحبًا بك في النظام! 👋\n\n";
    if (!user) {
      message += "لم يتم العثور على حسابك. يُرجى التسجيل أولاً.";
      ctx.reply(message);
      return;
    }

    if (user.balance <= 0) {
      message += `رصيدك الحالي هو ${user.balance} وحدة، يرجى التواصل مع الدعم الفني للحصول على المساعدة في إضافة الرصيد.`;
    } else {
      message += "استخدم الأزرار أدناه للوصول إلى الميزات:";
    }

    const keyboard = new Keyboard()
      .text("📊 رصيد")
      .text("🛍️ المنتجات")
      .text("📞 دعم");

    ctx.reply(message, {
      reply_markup: { keyboard: keyboard.build(), resize_keyboard: true },
    });
  } catch (error) {
    console.error("Error in handleStartCommand:", error);
    ctx.reply(
      "حدث خطأ أثناء تحميل القائمة الرئيسية. الرجاء المحاولة مرة أخرى لاحقًا."
    );
  }
};
