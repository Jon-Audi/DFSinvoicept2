import { collection, addDoc, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import type { Firestore } from 'firebase/firestore';
import type { Product, PriceHistoryEntry } from '@/types';

/**
 * Records a price change in the history
 */
export async function recordPriceChange(
  db: Firestore,
  oldProduct: Product | null,
  newProduct: Product,
  changedBy?: string,
  reason?: string
): Promise<void> {
  // Only record if price, cost, or markup changed
  const costChanged = oldProduct && oldProduct.cost !== newProduct.cost;
  const priceChanged = oldProduct && oldProduct.price !== newProduct.price;
  const markupChanged = oldProduct && oldProduct.markupPercentage !== newProduct.markupPercentage;

  if (!oldProduct || costChanged || priceChanged || markupChanged) {
    const historyEntry: Omit<PriceHistoryEntry, 'id'> = {
      productId: newProduct.id,
      productName: newProduct.name,
      timestamp: new Date().toISOString(),
      oldCost: oldProduct?.cost,
      newCost: newProduct.cost,
      oldPrice: oldProduct?.price,
      newPrice: newProduct.price,
      oldMarkup: oldProduct?.markupPercentage,
      newMarkup: newProduct.markupPercentage,
      changedBy,
      reason,
    };

    // Remove undefined values - Firestore doesn't accept them
    const cleanedEntry = Object.fromEntries(
      Object.entries(historyEntry).filter(([_, value]) => value !== undefined)
    ) as Omit<PriceHistoryEntry, 'id'>;

    await addDoc(collection(db, 'priceHistory'), cleanedEntry);
  }
}

/**
 * Gets price history for a specific product
 */
export async function getProductPriceHistory(
  db: Firestore,
  productId: string,
  limitCount: number = 50
): Promise<PriceHistoryEntry[]> {
  const q = query(
    collection(db, 'priceHistory'),
    where('productId', '==', productId),
    orderBy('timestamp', 'desc'),
    limit(limitCount)
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as PriceHistoryEntry));
}

/**
 * Gets all recent price changes across all products
 */
export async function getRecentPriceChanges(
  db: Firestore,
  limitCount: number = 100
): Promise<PriceHistoryEntry[]> {
  const q = query(
    collection(db, 'priceHistory'),
    orderBy('timestamp', 'desc'),
    limit(limitCount)
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as PriceHistoryEntry));
}

/**
 * Calculates price change statistics for a product
 */
export function calculatePriceStats(history: PriceHistoryEntry[]) {
  if (history.length === 0) {
    return null;
  }

  const sortedHistory = [...history].sort((a, b) =>
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  const oldest = sortedHistory[0];
  const newest = sortedHistory[sortedHistory.length - 1];

  const costIncrease = oldest.oldCost
    ? ((newest.newCost - oldest.oldCost) / oldest.oldCost) * 100
    : 0;

  const priceIncrease = oldest.oldPrice
    ? ((newest.newPrice - oldest.oldPrice) / oldest.oldPrice) * 100
    : 0;

  return {
    totalChanges: history.length,
    firstChange: oldest.timestamp,
    lastChange: newest.timestamp,
    costIncrease: costIncrease.toFixed(2) + '%',
    priceIncrease: priceIncrease.toFixed(2) + '%',
    currentCost: newest.newCost,
    currentPrice: newest.newPrice,
    currentMarkup: newest.newMarkup,
  };
}
