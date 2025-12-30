"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Icon } from '@/components/icons';
import { useFirebase } from '@/components/firebase-provider';
import { getAnalyticsSummary, formatCurrency, calculatePercentageChange } from '@/lib/analytics';
import type { AnalyticsSummary } from '@/lib/analytics';
import { cn } from '@/lib/utils';

interface MetricCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: string;
  isLoading?: boolean;
}

function MetricCard({ title, value, subtitle, icon, isLoading }: MetricCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon name={icon} className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <>
            <Skeleton className="h-8 w-24 mb-1" />
            {subtitle && <Skeleton className="h-4 w-16" />}
          </>
        ) : (
          <>
            <div className="text-2xl font-bold">{value}</div>
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

export function AnalyticsMetrics() {
  const { db } = useFirebase();
  const [currentPeriod, setCurrentPeriod] = useState<AnalyticsSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!db) return;

    const loadData = async () => {
      setIsLoading(true);
      try {
        const current = await getAnalyticsSummary(db, 30);
        setCurrentPeriod(current);
      } catch (error) {
        console.error('Error loading analytics:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [db]);

  const metrics = [
    {
      title: 'Total Money In',
      value: currentPeriod ? formatCurrency(currentPeriod.paidRevenue) : '$0',
      subtitle: 'Last 30 days',
      icon: 'DollarSign',
    },
    {
      title: 'Pending Payments',
      value: currentPeriod ? formatCurrency(currentPeriod.pendingRevenue) : '$0',
      subtitle: 'Outstanding invoices',
      icon: 'Clock',
    },
    {
      title: 'Total Orders',
      value: currentPeriod ? currentPeriod.invoiceCount.toString() : '0',
      subtitle: `${currentPeriod?.paidInvoiceCount || 0} paid, ${(currentPeriod?.invoiceCount || 0) - (currentPeriod?.paidInvoiceCount || 0)} pending`,
      icon: 'ShoppingCart',
    },
    {
      title: 'Avg Order Value',
      value: currentPeriod ? formatCurrency(currentPeriod.averageInvoiceValue) : '$0',
      subtitle: 'Per invoice',
      icon: 'BarChart3',
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {metrics.map((metric) => (
        <MetricCard key={metric.title} {...metric} isLoading={isLoading} />
      ))}
    </div>
  );
}
