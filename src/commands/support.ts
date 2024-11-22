import { Context, InlineKeyboard } from "grammy";

export const handleSupportCommand = (ctx: Context) => {
  try {
    // Create an inline keyboard with WhatsApp and Telegram links
    const keyboard = new InlineKeyboard()
      .url("تواصل عبر WhatsApp", "https://wa.me/213557349101")
      .row() // Add a new row for better organization
      .url("تواصل عبر Telegram", "https://t.me/Shams0628");

    // Send the reply with the keyboard
    ctx.reply(
      "الدعم الفني لشحن الرصيد الرجاء التواصل معنا عبر الروابط التالية:",
      {
        reply_markup: keyboard,
      }
    );
  } catch (error) {
    console.error("Error in handleSupportCommand:", error);
    ctx.reply(
      "حدث خطأ أثناء تحميل معلومات الدعم. الرجاء المحاولة مرة أخرى لاحقًا."
    );
  }
};
