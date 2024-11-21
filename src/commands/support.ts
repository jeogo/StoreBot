import { Context, InlineKeyboard } from "grammy";

export const handleSupportCommand = (ctx: Context) => {
  try {
    // Create an inline keyboard with a WhatsApp link
    const keyboard = new InlineKeyboard().url(
      "تواصل عبر WhatsApp",
      "https://wa.me/1234567890"
    );

    // Send the reply with the keyboard
    ctx.reply("الدعم الفني لشحن الرصيد الرجاء التواصل معنا في الواتس اب ", {
      reply_markup: keyboard,
    });
  } catch (error) {
    console.error("Error in handleSupportCommand:", error);
    ctx.reply(
      "حدث خطأ أثناء تحميل معلومات الدعم. الرجاء المحاولة مرة أخرى لاحقًا."
    );
  }
};
