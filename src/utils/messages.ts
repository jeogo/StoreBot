// src/utils/messages.ts

export const formatBalanceMessage = (balance: number): string => {
  return `رصيدك الحالي هو: ${balance} وحدة`;
};

export const formatInsufficientFundsMessage = (
  balance: number,
  price: number
): string => {
  return `رصيدك غير كافٍ. تحتاج إلى ${
    price - balance
  } وحدة إضافية لإتمام الشراء.`;
};

export const formatOutOfStockMessage = (): string => {
  return `عذرًا، هذا المنتج غير متوفر حاليًا.`;
};

export const formatPurchaseMessage = (
  productName: string,
  price: number,
  newBalance: number,
  email: string
): string => {
  return `تم شراء ${productName} مقابل ${price} وحدة. رصيدك المتبقي: ${newBalance} وحدة. الحساب الذي اشتريته هو: ${email}`;
};
