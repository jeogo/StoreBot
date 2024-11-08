// src/commands/support.ts
import { Context, InlineKeyboard } from "grammy";

export const handleSupportCommand = (ctx: Context) => {
  try {
    const supportKeyboard = new InlineKeyboard().url(
      "📞 تواصل عبر WhatsApp",
      "https://wa.me/213557349101"
    ); // Replace with actual WhatsApp number

    ctx.reply(
      "الدعم الفني لشحن الرصيد الرجاء التواصل معنا في الواتس اب ",
      { reply_markup: supportKeyboard }
    );
  } catch (error) {
    console.error("Error in handleSupportCommand:", error);
    ctx.reply(
      "حدث خطأ أثناء تحميل معلومات الدعم. الرجاء المحاولة مرة أخرى لاحقًا."
    );
  }
};
