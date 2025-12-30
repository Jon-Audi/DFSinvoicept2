"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Icon } from '@/components/icons';
import { useRevenueTrends } from '@/hooks/use-analytics';
import { formatCurrency, formatChartDate } from '@/lib/analytics';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

type TimePeriod = 7 | 30 | 60 | 90;
type MetricType = 'revenue' | 'invoices';

interface RevenueChartProps {
  defaultPeriod?: TimePeriod;
}

export function RevenueChart({ defaultPeriod = 30 }: RevenueChartProps) {
  const [timePeriod, setTimePeriod] = useState<TimePeriod>(defaultPeriod);
  const [metricType, setMetricType] = useState<MetricType>('revenue');

  // Use cached revenue trends data with React Query
  const { data = [], isLoading } = useRevenueTrends(timePeriod);

  const totalRevenue = data.reduce((sum, point) => sum + point.revenue, 0);
  const totalInvoices = data.reduce((sum, point) => sum + point.invoices, 0);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-popover border rounded-lg shadow-lg p-3">
          <p className="font-medium text-sm mb-1">{formatChartDate(label)}</p>
          {metricType === 'revenue' ? (
            <>
              <p className="text-sm text-primary">
                Revenue: {formatCurrency(payload[0].value || 0)}
              </p>
              <p className="text-sm text-muted-foreground">
                Invoices: {payload[0].payload.invoices || 0}
              </p>
            </>
          ) : (
            <>
              <p className="text-sm text-primary">
                Invoices: {payload[0].value || 0}
              </p>
              <p className="text-sm text-muted-foreground">
                Revenue: {formatCurrency(payload[0].payload.revenue || 0)}
              </p>
            </>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between mb-4">
          <div>
            <CardTitle>{metricType === 'revenue' ? 'Revenue Trends' : 'Order Volume'}</CardTitle>
            <CardDescription>
              {metricType === 'revenue' ? 'Track your money coming in' : 'Track number of orders'}
            </CardDescription>
          </div>
        </div>
        <div className="flex items-center justify-between gap-2">
          <div className="flex gap-2">
            <Button
              variant={metricType === 'revenue' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setMetricType('revenue')}
            >
              <Icon name="DollarSign" className="h-4 w-4 mr-1" />
              Money In
            </Button>
            <Button
              variant={metricType === 'invoices' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setMetricType('invoices')}
            >
              <Icon name="ShoppingCart" className="h-4 w-4 mr-1" />
              Orders
            </Button>
          </div>
          <div className="flex gap-2">
            <Button
              variant={timePeriod === 7 ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTimePeriod(7)}
            >
              7D
            </Button>
            <Button
              variant={timePeriod === 30 ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTimePeriod(30)}
            >
              30D
            </Button>
            <Button
              variant={timePeriod === 60 ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTimePeriod(60)}
            >
              60D
            </Button>
            <Button
              variant={timePeriod === 90 ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTimePeriod(90)}
            >
              90D
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Skeleton className="h-4 w-24 rounded-md" />
                <Skeleton className="h-8 w-32 rounded-md" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-24 rounded-md" />
                <Skeleton className="h-8 w-28 rounded-md" />
              </div>
            </div>
            <Skeleton className="h-[300px] w-full rounded-lg" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <p className="text-sm text-muted-foreground">
                  {metricType === 'revenue' ? 'Total Money In' : 'Total Orders'}
                </p>
                <p className="text-2xl font-bold">
                  {metricType === 'revenue' ? formatCurrency(totalRevenue) : totalInvoices}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  {metricType === 'revenue' ? 'Avg per Day' : 'Avg per Day'}
                </p>
                <p className="text-2xl font-bold">
                  {metricType === 'revenue'
                    ? formatCurrency(totalRevenue / timePeriod)
                    : (totalInvoices / timePeriod).toFixed(1)
                  }
                </p>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={data}>
                <defs>
                  <linearGradient id="colorMetric" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatChartDate}
                  className="text-xs"
                  stroke="hsl(var(--muted-foreground))"
                />
                <YAxis
                  tickFormatter={(value) =>
                    metricType === 'revenue' ? `$${value.toLocaleString()}` : value.toString()
                  }
                  className="text-xs"
                  stroke="hsl(var(--muted-foreground))"
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey={metricType === 'revenue' ? 'revenue' : 'invoices'}
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorMetric)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </>
        )}
      </CardContent>
    </Card>
  );
}
