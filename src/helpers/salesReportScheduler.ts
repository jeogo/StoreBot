import { connectToDB } from '../db';
import { Product } from '../models/product';
import { sendToAdmin } from './adminNotificationHelper';

function formatDateAr(date: Date): string {
  return date.toLocaleString('en-GB', { hour12: false });
}

// Generate sales report for all products
export async function generateAndSendSalesReport() {
  const db = await connectToDB();
  const products = await db.collection<Product>('products').find().toArray();
  const preOrders = await db.collection('preorders').find().toArray();
  const now = new Date();
  const dateStr = formatDateAr(now);

  let report = `📊 *تقرير المبيعات اليومي*\n🕒 ${dateStr}\n\n`;
  let totalSales = 0;
  let totalPreOrders = 0;
  let totalPendingPreOrders = 0;

  for (const product of products) {
    // الكمية القديمة (قبل 24 ساعة)
    const since = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    // الكمية القديمة = الكمية الحالية + ما تم بيعه خلال 24 ساعة
    const sales = (product.archive || []).filter(
      (a: any) => a.soldAt && new Date(a.soldAt) >= since
    );
    const soldCount = sales.length;
    const currentCount = (product.emails || []).length;
    const oldCount = currentCount + soldCount;
    const totalProductSales = (product.archive || []).length;
    totalSales += soldCount;

    // مبيعات اليوم بشكل منظم
    let salesDetails = '';
    if (soldCount > 0) {
      salesDetails = sales
        .map((s: any, idx: number) => `    ${idx + 1}. ${formatDateAr(new Date(s.soldAt))} | ${s.buyerDetails?.name || 'غير معروف'} `)
        .join('\n');
    } else {
      salesDetails = '    لا يوجد مبيعات اليوم';
    }

    report +=
      `• *${product.name}*\n` +
      `  - الكمية البارحة: ${oldCount}\n` +
      `  - تم البيع اليوم: ${soldCount}\n` +
      `  - تفاصيل المبيعات اليوم:\n${salesDetails}\n` +
      `  - الكمية المتبقية: ${currentCount}\n` +
      `  - مجموع المبيعات: ${totalProductSales}\n`;
  }

  // الطلبات المسبقة
  const fulfilledPreOrders = preOrders.filter((p: any) => p.status === 'fulfilled');
  const pendingPreOrders = preOrders.filter((p: any) => p.status !== 'fulfilled');
  totalPreOrders = fulfilledPreOrders.length;
  totalPendingPreOrders = pendingPreOrders.length;

  report += `\n-----------------------------\n`;
  report += `📦 مجموع ما تم بيعه اليوم: ${totalSales}\n`;
  report += `📝 الطلبات المسبقة المنجزة: ${totalPreOrders}\n`;
  report += `⏳ الطلبات المسبقة قيد الانتظار: ${totalPendingPreOrders}\n`;

  await sendToAdmin(report, { parse_mode: 'Markdown' });
}

// جدولة التقرير كل 24 ساعة
let timer: ReturnType<typeof setTimeout> | null = null;
export function startSalesReportScheduler() {
  const run = async () => {
    await generateAndSendSalesReport();
    timer = setTimeout(run, 24 * 60 * 60 * 1000);
  };
  run();
}
export function stopSalesReportScheduler() {
  if (timer) clearTimeout(timer);
  timer = null;
}
