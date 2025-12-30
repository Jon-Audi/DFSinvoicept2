"use client";

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useFirebase } from '@/components/firebase-provider';
import {
  getAnalyticsSummary,
  getRevenueTrends,
  getTopProducts,
  type AnalyticsSummary,
  type RevenueDataPoint,
  type ProductSalesData
} from '@/lib/analytics';

// Query keys for cache management
export const analyticsKeys = {
  all: ['analytics'] as const,
  summary: (days?: number) => [...analyticsKeys.all, 'summary', days] as const,
  revenue: (days: number) => [...analyticsKeys.all, 'revenue', days] as const,
  topProducts: (limit: number, days?: number) => [...analyticsKeys.all, 'topProducts', limit, days] as const,
};

/**
 * Hook to fetch analytics summary with caching
 * @param days - Number of days to include (optional, defaults to all time)
 * @param options - React Query options
 */
export function useAnalyticsSummary(days?: number) {
  const { db } = useFirebase();

  return useQuery({
    queryKey: analyticsKeys.summary(days),
    queryFn: async (): Promise<AnalyticsSummary> => {
      if (!db) throw new Error('Database not initialized');
      return await getAnalyticsSummary(db, days);
    },
    enabled: !!db,
    staleTime: 1000 * 60 * 2, // 2 minutes - analytics data changes frequently
    gcTime: 1000 * 60 * 5, // 5 minutes cache
  });
}

/**
 * Hook to fetch revenue trends with caching
 * @param days - Number of days to include in trends
 * @param options - React Query options
 */
export function useRevenueTrends(days: number = 30) {
  const { db } = useFirebase();

  return useQuery({
    queryKey: analyticsKeys.revenue(days),
    queryFn: async (): Promise<RevenueDataPoint[]> => {
      if (!db) throw new Error('Database not initialized');
      return await getRevenueTrends(db, days);
    },
    enabled: !!db,
    staleTime: 1000 * 60 * 2, // 2 minutes
    gcTime: 1000 * 60 * 5, // 5 minutes cache
  });
}

/**
 * Hook to fetch top products with caching
 * @param limit - Number of top products to fetch
 * @param days - Number of days to include (optional, defaults to all time)
 * @param options - React Query options
 */
export function useTopProducts(limit: number = 10, days?: number) {
  const { db } = useFirebase();

  return useQuery({
    queryKey: analyticsKeys.topProducts(limit, days),
    queryFn: async (): Promise<ProductSalesData[]> => {
      if (!db) throw new Error('Database not initialized');
      return await getTopProducts(db, limit, days);
    },
    enabled: !!db,
    staleTime: 1000 * 60 * 2, // 2 minutes
    gcTime: 1000 * 60 * 5, // 5 minutes cache
  });
}

/**
 * Hook to invalidate analytics cache
 * Use this when data changes (new invoices, payments, etc.)
 */
export function useInvalidateAnalytics() {
  const queryClient = useQueryClient();

  return {
    invalidateAll: () => queryClient.invalidateQueries({ queryKey: analyticsKeys.all }),
    invalidateSummary: (days?: number) => queryClient.invalidateQueries({ queryKey: analyticsKeys.summary(days) }),
    invalidateRevenue: (days?: number) => {
      if (days) {
        queryClient.invalidateQueries({ queryKey: analyticsKeys.revenue(days) });
      } else {
        // Invalidate all revenue queries
        queryClient.invalidateQueries({ queryKey: [...analyticsKeys.all, 'revenue'] });
      }
    },
    invalidateTopProducts: (limit?: number, days?: number) => {
      if (limit !== undefined) {
        queryClient.invalidateQueries({ queryKey: analyticsKeys.topProducts(limit, days) });
      } else {
        // Invalidate all top products queries
        queryClient.invalidateQueries({ queryKey: [...analyticsKeys.all, 'topProducts'] });
      }
    },
  };
}
