export const formatCurrency = (amount: number): string =>
  `${amount.toFixed(2)}₪`;

/** Admin-related messages */
export const AdminMessages = {
  notifyAdminPurchase: (
    user: string,
    product: string,
    remaining: number,
    price: string
  ): string => `
👤 *المستخدم*: ${user}  
📦 *المنتج*: ${product}  
📉 *الكمية المتبقية*: ${remaining}  
💰 *السعر*: ${price}`,
  notifyAdminPreOrder: (
    user: string,
    product: string,
    message: string
  ): string => `
👤 *المستخدم*: ${user}  
📦 *المنتج*: ${product}  
📄 *ملاحظات الطلب المسبق*: ${message}`,
};

/** User-related messages */
export const UserMessages = {
  formatBalanceMessage: (balance: number): string =>
    `رصيدك الحالي هو: ${balance} وحدة.`,
  formatInsufficientFundsMessage: (balance: number, price: number): string =>
    `رصيدك غير كافٍ. تحتاج إلى ${price - balance} وحدة إضافية لإتمام الشراء.`,
  formatOutOfStockMessage: (): string => `عذرًا، هذا المنتج غير متوفر حاليًا.`,
  formatPurchaseMessage: (
    productName: string,
    price: number,
    newBalance: number,
    email: string
  ): string =>
    `تم شراء ${productName} مقابل ${price} وحدة. رصيدك المتبقي: ${newBalance} وحدة. الحساب الذي اشتريته هو: ${email}`,
  confirmPurchase: (productName: string, price: string): string =>
    `هل ترغب في شراء المنتج "${productName}" بسعر ${price}؟`,
  productUnavailable: (productName: string): string =>
    `المنتج "${productName}" غير متوفر حاليًا. هل ترغب في طلبه مسبقًا؟`,
  sessionExpired: (): string =>
    `⏳ انتهى وقت التأكيد. يُرجى إعادة المحاولة إذا كنت لا تزال ترغب في الشراء.`,
  preorderPrompt: (): string => `يرجى كتابة ملاحظة أو رسالة خاصة للطلب المسبق:`,
  preorderSuccess: (): string => `✅ تم إرسال الطلب المسبق بنجاح.`,
  cancelSuccess: (): string => `❌ تم إلغاء العملية.`,
  insufficientBalanceForPreorder: (): string =>
    `❌ ليس لديك رصيد كافٍ لإتمام الطلب المسبق.`,
};

/** Error-related messages */
export const ErrorMessages = {
  userNotFound: (): string => `❌ المستخدم غير موجود.`,
  productNotFound: (): string => `❌ المنتج غير موجود.`,
  genericError: (): string => `⚠️ حدث خطأ. يُرجى المحاولة مرة أخرى لاحقًا.`,
  preorderError: (): string =>
    `❌ حدث خطأ أثناء إنشاء الطلب المسبق. يُرجى المحاولة لاحقًا.`,
};

/** Support messages */
export const SupportMessages = {
  insufficientBalanceSupport: (): string =>
    `رصيدك غير كافٍ لإتمام هذه العملية. يُرجى التواصل مع الدعم الفني لإعادة شحن رصيدك.`,
  contactSupportLink: (): string =>
    `📞 تواصل عبر WhatsApp: https://wa.me/1234567890`,
};
export const messages = {
  productNotFound: "❌ المنتج غير موجود.",
  userNotFound: "❌ المستخدم غير موجود.",
  productUnavailable: "❌ المنتج غير متوفر في الوقت الحالي.",
  insufficientBalance:
    "رصيدك غير كافٍ لإتمام هذه العملية. يُرجى التواصل مع الدعم الفني لإعادة شحن رصيدك.",
  purchaseSuccess: (name: string, email: string) =>
    `🎉 تم شراء المنتج "${name}" بنجاح.\n📧 البريد الإلكتروني الخاص بك: ${email}`,
  adminNotification: (
    user: string,
    product: string,
    remaining: number,
    price: string
  ) =>
    `👤 *المستخدم*: ${user}\n📦 *المنتج*: ${product}\n📉 *الكمية المتبقية*: ${remaining}\n💰 *السعر*: ${price}`,
};
