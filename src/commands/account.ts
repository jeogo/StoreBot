// src/commands/account.ts

import { connectToDB } from "../db";
import { User } from "../models/user";

export const handleAccountCommand = async (ctx: any) => {
  try {
    const telegramId = ctx.from?.id.toString();
    if (!telegramId) {
      return ctx.reply("❌ حدث خطأ أثناء التحقق من المستخدم.");
    }

    const db = await connectToDB();
    const user = await db.collection<User>("users").findOne({ telegramId });

    if (!user) {
      return ctx.reply("❌ المستخدم غير موجود.");
    }

    // Create the inline keyboard for additional options (if needed in the future)

    // Reply with user account details
    await ctx.reply(
      `📋 **تفاصيل الحساب**:\n\n` +
        `👤 **الاسم الكامل**: ${user.fullName || "غير متوفر"}\n` +
        `🆔 **معرف الحساب**: ${user.telegramId}\n` +
        `💰 **الرصيد الحالي**: ${user.balance} وحدة\n` +
        `شكراً لاستخدامك خدماتنا!`
    );
  } catch (error) {
    console.error("Error handling account command:", error);
    await ctx.reply("❌ حدث خطأ أثناء جلب تفاصيل الحساب.");
  }
};
