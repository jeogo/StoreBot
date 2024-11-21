import { UserMessages } from "./../utils/messages";
// src/commands/balance.ts
import { Context } from "grammy";
import { connectToDB } from "../db";
import { User } from "../models/user"; // Import User interface

export const handleBalanceCommand = async (ctx: Context): Promise<void> => {
  try {
    const telegramId = ctx.from?.id.toString();
    if (!telegramId) return;

    const db = await connectToDB();
    const user = await db.collection<User>("users").findOne({ telegramId });

    if (!user) {
      ctx.reply("لم يتم العثور على المستخدم. يُرجى التسجيل أولاً.");
      return;
    }

    const balance = user.balance || 0;
    ctx.reply(UserMessages.formatBalanceMessage(balance));
  } catch (error) {
    console.error("Error in handleBalanceCommand:", error);
    ctx.reply(
      "حدث خطأ أثناء التحقق من رصيدك. الرجاء المحاولة مرة أخرى لاحقًا."
    );
  }
};
