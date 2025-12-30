"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Icon } from '@/components/icons';
import { useAnalyticsSummary } from '@/hooks/use-analytics';
import { formatCurrency } from '@/lib/analytics';

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
            <Skeleton className="h-8 w-32 mb-2 rounded-md" />
            {subtitle && <Skeleton className="h-3 w-24 rounded-md" />}
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
  // Use cached analytics data with React Query
  const { data: currentPeriod, isLoading } = useAnalyticsSummary(30);

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
