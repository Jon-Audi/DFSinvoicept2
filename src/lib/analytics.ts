import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import type { Firestore } from 'firebase/firestore';
import type { Invoice, Product, Order } from '@/types';

export interface RevenueDataPoint {
  date: string;
  revenue: number;
  invoices: number;
}

export interface ProductSalesData {
  productId: string;
  productName: string;
  quantitySold: number;
  revenue: number;
}

export interface AnalyticsSummary {
  totalRevenue: number;
  paidRevenue: number;
  pendingRevenue: number;
  invoiceCount: number;
  paidInvoiceCount: number;
  averageInvoiceValue: number;
}

/**
 * Get revenue trends for a specific time period based on payment dates
 */
export async function getRevenueTrends(
  db: Firestore,
  days: number = 30
): Promise<RevenueDataPoint[]> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  startDate.setHours(0, 0, 0, 0);

  // Get all invoices (we need to check payment dates, not invoice dates)
  const invoicesQuery = query(collection(db, 'invoices'));

  const snapshot = await getDocs(invoicesQuery);
  const invoices: Invoice[] = snapshot.docs.map(doc => ({
    ...doc.data(),
    id: doc.id,
  } as Invoice));

  // Group payments by date
  const revenueByDate = new Map<string, { revenue: number; invoiceIds: Set<string> }>();
  let totalPaymentsProcessed = 0;

  invoices.forEach(invoice => {
    // Process each payment in the invoice
    if (invoice.payments && invoice.payments.length > 0) {
      invoice.payments.forEach(payment => {
        const paymentDate = new Date(payment.date);

        // Only include payments within our date range
        if (paymentDate >= startDate) {
          totalPaymentsProcessed++;
          const dateStr = paymentDate.toISOString().split('T')[0];
          const current = revenueByDate.get(dateStr) || { revenue: 0, invoiceIds: new Set<string>() };

          // Add invoice ID to the set
          current.invoiceIds.add(invoice.id);

          revenueByDate.set(dateStr, {
            revenue: current.revenue + (payment.amount || 0),
            invoiceIds: current.invoiceIds,
          });
        }
      });
    }
  });

  // Fill in missing dates with zero revenue
  const dataPoints: RevenueDataPoint[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    const data = revenueByDate.get(dateStr) || { revenue: 0, invoiceIds: new Set() };

    dataPoints.push({
      date: dateStr,
      revenue: Number(data.revenue) || 0, // Ensure it's a valid number
      invoices: data.invoiceIds.size, // Count unique invoices that had payments on this date
    });
  }

  return dataPoints;
}

/**
 * Get top selling products
 */
export async function getTopProducts(
  db: Firestore,
  limit: number = 10,
  days?: number
): Promise<ProductSalesData[]> {
  let invoicesQuery = query(collection(db, 'invoices'));

  if (days) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    invoicesQuery = query(
      collection(db, 'invoices'),
      where('date', '>=', startDate.toISOString())
    );
  }

  const snapshot = await getDocs(invoicesQuery);
  const invoices: Invoice[] = snapshot.docs.map(doc => ({
    ...doc.data(),
    id: doc.id,
  } as Invoice));

  // Aggregate product sales
  const productSales = new Map<string, ProductSalesData>();

  invoices.forEach(invoice => {
    if (invoice.lineItems && invoice.lineItems.length > 0) {
      invoice.lineItems.forEach(item => {
        // Skip the clover item
        if (item.productName === '1/1 - 5/16 clover') {
          return;
        }

        const productId = item.productId || item.productName; // Use productName as fallback for non-stock items
        const current = productSales.get(productId) || {
          productId: productId,
          productName: item.productName,
          quantitySold: 0,
          revenue: 0,
        };

        productSales.set(productId, {
          ...current,
          quantitySold: current.quantitySold + item.quantity,
          revenue: current.revenue + item.total, // Use the total field instead of calculating
        });
      });
    }
  });

  // Sort by revenue and return top N
  const topProducts = Array.from(productSales.values())
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, limit);

  return topProducts;
}

/**
 * Get analytics summary
 */
export async function getAnalyticsSummary(
  db: Firestore,
  days?: number
): Promise<AnalyticsSummary> {
  // Get ALL invoices (we need to check payment dates for cash flow)
  const invoicesQuery = query(collection(db, 'invoices'));
  const snapshot = await getDocs(invoicesQuery);
  const invoices: Invoice[] = snapshot.docs.map(doc => ({
    ...doc.data(),
    id: doc.id,
  } as Invoice));

  let paidRevenue = 0;
  let paidInvoiceIds = new Set<string>();

  if (days) {
    // Calculate paid revenue based on payment dates (cash flow)
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    invoices.forEach(invoice => {
      if (invoice.payments && invoice.payments.length > 0) {
        invoice.payments.forEach(payment => {
          const paymentDate = new Date(payment.date);
          if (paymentDate >= startDate) {
            paidRevenue += payment.amount || 0;
            paidInvoiceIds.add(invoice.id);
          }
        });
      }
    });
  } else {
    // No date filter - sum all payments
    paidRevenue = invoices.reduce((sum, inv) => sum + (inv.amountPaid || 0), 0);
    paidInvoiceIds = new Set(
      invoices.filter(inv => inv.amountPaid > 0).map(inv => inv.id)
    );
  }

  // Total revenue and pending are still based on all invoices (not time-filtered)
  const totalRevenue = invoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
  const pendingRevenue = invoices.reduce((sum, inv) => sum + (inv.balanceDue || 0), 0);

  // Count all invoices that have been fully paid
  const paidInvoiceCount = invoices.filter(inv =>
    inv.status === 'Paid' || (inv.balanceDue === 0 && inv.amountPaid > 0)
  ).length;

  return {
    totalRevenue,
    paidRevenue,
    pendingRevenue,
    invoiceCount: invoices.length,
    paidInvoiceCount,
    averageInvoiceValue: invoices.length > 0 ? totalRevenue / invoices.length : 0,
  };
}

/**
 * Format currency for display
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

/**
 * Format date for chart display
 */
export function formatChartDate(dateStr: string): string {
  const date = new Date(dateStr);
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  }).format(date);
}

/**
 * Calculate percentage change
 */
export function calculatePercentageChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}
