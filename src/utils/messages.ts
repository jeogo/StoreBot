/** Currency Formatter */
export const formatCurrency = (amount: number): string =>
  `${amount.toFixed(2)}₪`;

export const AdminMessages = {
  notifyAdminPreOrder: (
    fullName: string,
    userName: string,
    product: string,
    message: string
  ): string => `
📬 *طلب مسبق جديد*:  
👤 *الاسم الكامل*: ${fullName}  
🔹 *اسم المستخدم*: ${userName}  
📦 *المنتج*: ${product}  
📄 *ملاحظات المستخدم*: ${message}`,
};

export const UserMessages = {  formatPurchaseMessage: (
    fullName: string,
    userName: string,
    productName: string,
    price: number,
    newBalance: number,
    email: string
  ): string => {
    const now = new Date();
    return `✅ *تم الشراء بنجاح*:  
👤 *الاسم الكامل*: ${fullName}  
🔹 *اسم المستخدم*: ${userName}  
📦 *المنتج*: ${productName}  
💰 *السعر*: ${price} ₪  
💳 *الرصيد المتبقي*: ${newBalance} ₪  
📧 *الحساب*: ${email}
⏰ *تاريخ العملية*: ${now.toLocaleString('en-GB', { 
    timeZone: 'Asia/Jerusalem',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
})}`;
  },

  formatInsufficientFundsMessage: (balance: number, price: number): string =>
    `رصيدك غير كافٍ. تحتاج إلى ${price - balance} وحدة إضافية لإتمام الشراء.`,

  preorderSuccess: (productName: string): string =>
    `✅ تم تقديم طلبك المسبق للمنتج "${productName}" بنجاح!`,
};

/** Error Messages */
export const ErrorMessages = {
  userNotFound: (): string => `❌ *المستخدم غير موجود.*`,
  productNotFound: (): string => `❌ *المنتج غير موجود.*`,
  genericError: (): string => `⚠️ *حدث خطأ. يُرجى المحاولة لاحقًا.*`,
  preorderError: (): string =>
    `❌ *حدث خطأ أثناء إنشاء الطلب المسبق. يُرجى المحاولة لاحقًا.*`,
};

/** Support Messages */
export const SupportMessages = {
  insufficientBalanceSupport: (): string =>
    `⚠️ *رصيدك غير كافٍ لإتمام هذه العملية.* يمكنك التواصل مع الدعم لإعادة الشحن.`,
  contactSupportLink: (): string =>
    `📞 *تواصل مع الدعم الفني عبر WhatsApp*: [اضغط هنا](https://wa.me/1234567890)`,
};
export const telegramMessages = {
  preOrderConfirmation: (productName: string, message: string) =>
    `✅ تم تقديم طلبك المسبق للمنتج "${productName}" بنجاح!\n\n` +
    `💬 الرسالة: "${message}"\n\n` +
    `سنقوم بإخطارك فور توفر المنتج.`,

  adminPreOrderNotification: (
    fullName: string | undefined,
    userId: string,
    productName: string,
    price: number,
    message: string
  ) =>
    `📦 تنبيه طلب مسبق جديد:\n\n` +
    `👤 المستخدم: ${fullName} (المعرف: ${userId})\n` +
    `📦 المنتج: ${productName}\n` +
    `💰 السعر: ${price}\n` +
    `💬 الرسالة: "${message}"\n\n` +
    `يرجى مراجعة لوحة التحكم للتفاصيل.`,
};
// utils/messages.ts

import { User } from "../models/user";

export const NewUserMessage = (user: User): string => {
  return `
  **تم تسجيل مستخدم جديد**
  - **اسم المستخدم:** ${user.username}
  - **الاسم الكامل:** ${user.fullName || "غير مذكور"}
  - **رقم الهاتف:** ${user.phoneNumber || "غير مذكور"}
  - **رقم التليجرام:** ${user.telegramId}
  - **رقم المحادثة:** ${user.chatId}
  - **تاريخ التسجيل:** ${user.registerDate.toLocaleString()}
  `;
};
// utils/messages.ts

export const formatBalanceMessage = (balance: number): string => {
  return `
  **رصيدك الحالي:**
  - **المبلغ المتاح:** ${balance} 
  `;
};
