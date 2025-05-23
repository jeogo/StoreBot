import { bot } from '../bot';
import { connectToDB } from '../db';
import { ObjectId } from 'mongodb';

// Get admin IDs from environment variables
const getAdminIds = (): string[] => {
    const adminIds = process.env.TELEGRAM_ADMIN_IDS
        ? process.env.TELEGRAM_ADMIN_IDS.split(',').map(id => id.trim())
        : [process.env.TELEGRAM_ADMIN_ID || "5928329785"];
    // Only allow numeric IDs
    return Array.from(new Set(adminIds.filter(id => /^\d+$/.test(id))));
};

interface NotificationResult {
    adminId: string;
    success: boolean;
    error?: string;
    timestamp: Date;
}

interface NotificationOptions {
    parse_mode?: "Markdown";
    callback_data?: string;
    retry_count?: number;
}

const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY = 1000; // 1 second
const TELEGRAM_MAX_MESSAGE_LENGTH = 4096;

function splitMessage(message: string, maxLength: number = TELEGRAM_MAX_MESSAGE_LENGTH): string[] {
    const parts: string[] = [];
    let current = 0;
    while (current < message.length) {
        parts.push(message.slice(current, current + maxLength));
        current += maxLength;
    }
    return parts;
}

export async function sendToAdmin(
    message: string,
    options: NotificationOptions = {}
): Promise<NotificationResult[]> {
    const results: NotificationResult[] = [];
    const adminIds = getAdminIds();
    if (adminIds.length === 0) {
        console.warn('[ADMIN NOTIFY] No valid admin IDs found. Please set TELEGRAM_ADMIN_IDS in your .env file.');
        return results;
    }
    const db = await connectToDB();
    const retryCount = options.retry_count || 0;

    for (const adminId of adminIds) {
        let success = false;
        let errorMsg = undefined;
        try {            // تقسيم الرسالة الطويلة
            const messageParts = splitMessage(message);
            for (let i = 0; i < messageParts.length; i++) {
                await bot.api.sendMessage(adminId, messageParts[i], {
                    reply_markup: i === messageParts.length - 1 && options.callback_data ? {
                        inline_keyboard: [
                            [
                                {
                                    text: "✅ تأكيد استلام الطلب",
                                    callback_data: `${options.callback_data}_${adminId}`
                                }
                            ]
                        ]
                    } : undefined
                });
            }
            success = true;
        } catch (error) {
            errorMsg = error instanceof Error ? error.message : String(error);
            // Retry logic
            if (retryCount < MAX_RETRY_ATTEMPTS) {
                try {
                    await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * (retryCount + 1)));                    // إعادة المحاولة مع تقسيم الرسالة
                    const messageParts = splitMessage(message);
                    for (let i = 0; i < messageParts.length; i++) {
                        await bot.api.sendMessage(adminId, messageParts[i], {
                            reply_markup: i === messageParts.length - 1 && options.callback_data ? {
                                inline_keyboard: [
                                    [
                                        {
                                            text: "✅ تأكيد استلام الطلب",
                                            callback_data: `${options.callback_data}_${adminId}`
                                        }
                                    ]
                                ]
                            } : undefined
                        });
                    }
                    success = true;
                    errorMsg = undefined;
                } catch (retryError) {
                    errorMsg = retryError instanceof Error ? retryError.message : String(retryError);
                }
            }
        }
        // Log notification attempt with unique _id
        await db.collection("adminNotifications").insertOne({
            _id: new ObjectId(),
            adminId,
            message,
            sentAt: new Date(),
            status: success ? 'success' : 'failed',
            error: errorMsg,
            retryCount
        });
        results.push({
            adminId,
            success,
            error: errorMsg,
            timestamp: new Date()
        });
    }
    // Only log summary info
    console.log("[ADMIN NOTIFY] Results:", results.map(r => ({adminId: r.adminId, success: r.success, error: r.error})));
    return results;
}

export function createPurchaseNotificationMessage(
    data: {
        buyerName: string;
        buyerPhone: string;
        buyerTelegramId: string;
        productName: string;
        categoryName: string;
        price: number;
        previousBalance: number;
        newBalance: number;
        remainingQuantity: number;
        transactionId: string;
    }
): string {
    return `
📢 *تنبيه: عملية شراء جديدة*

👤 *معلومات المشتري:*
▪️ الاسم: ${data.buyerName || "غير محدد"}
▪️ رقم الهاتف: ${data.buyerPhone || "غير محدد"}
▪️ معرف تليجرام: ${data.buyerTelegramId}

📦 *تفاصيل المنتج:*
▪️ اسم المنتج: ${data.productName}
▪️ التصنيف: ${data.categoryName}
▪️ السعر: ${data.price} ₪
▪️ الكمية المتبقية: ${data.remainingQuantity}

💰 *تفاصيل المعاملة:*
▪️ الرصيد السابق: ${data.previousBalance} ₪
▪️ الرصيد الجديد: ${data.newBalance} ₪
▪️ المبلغ المدفوع: ${data.price} ₪

⏰ تاريخ العملية: ${new Date().toLocaleString('en-GB', { 
    timeZone: 'Asia/Jerusalem',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
})}
🆔 رقم العملية: ${data.transactionId}

ملاحظة: يرجى الضغط على زر التأكيد أدناه عند استلام الإشعار.`;
}
