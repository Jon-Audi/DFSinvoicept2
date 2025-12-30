"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Icon } from '@/components/icons';
import { useTopProducts } from '@/hooks/use-analytics';
import { formatCurrency } from '@/lib/analytics';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

const COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--accent))',
  'hsl(220 70% 50%)',
  'hsl(280 70% 50%)',
  'hsl(140 70% 50%)',
  'hsl(40 70% 50%)',
  'hsl(10 70% 50%)',
  'hsl(190 70% 50%)',
  'hsl(310 70% 50%)',
  'hsl(100 70% 50%)',
];

type ViewMode = 'chart' | 'list';

interface TopProductsProps {
  defaultPeriod?: 'all' | 30 | 60 | 90;
}

export function TopProducts({ defaultPeriod = 'all' }: TopProductsProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('chart');
  const [timePeriod, setTimePeriod] = useState<'all' | 30 | 60 | 90>(defaultPeriod);

  // Use cached top products data with React Query
  const { data = [], isLoading } = useTopProducts(
    10,
    timePeriod === 'all' ? undefined : timePeriod
  );

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-popover border rounded-lg shadow-lg p-3">
          <p className="font-medium text-sm mb-1">{payload[0].payload.productName}</p>
          <p className="text-sm text-primary">
            Revenue: {formatCurrency(payload[0].value)}
          </p>
          <p className="text-sm text-muted-foreground">
            Qty Sold: {payload[0].payload.quantitySold}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Top Selling Products</CardTitle>
            <CardDescription>Best performers by revenue</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              variant={viewMode === 'chart' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('chart')}
            >
              <Icon name="BarChart3" className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('list')}
            >
              <Icon name="List" className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <Button
            variant={timePeriod === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTimePeriod('all')}
          >
            All Time
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
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3 flex-1">
                  <Skeleton className="w-8 h-8 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-40 rounded-md" />
                    <Skeleton className="h-3 w-24 rounded-md" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-5 w-20 rounded-md ml-auto" />
                  <Skeleton className="h-3 w-16 rounded-md ml-auto" />
                </div>
              </div>
            ))}
          </div>
        ) : data.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground">
            <Icon name="Package" className="h-12 w-12 mb-2 opacity-50" />
            <p>No product sales data available</p>
          </div>
        ) : viewMode === 'chart' ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data} layout="horizontal">
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="productName"
                angle={-45}
                textAnchor="end"
                height={100}
                className="text-xs"
                stroke="hsl(var(--muted-foreground))"
              />
              <YAxis
                tickFormatter={(value) => `$${value.toLocaleString()}`}
                className="text-xs"
                stroke="hsl(var(--muted-foreground))"
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="revenue" radius={[8, 8, 0, 0]}>
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="space-y-3">
            {data.map((product, index) => (
              <div
                key={product.productId}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3 flex-1">
                  <Badge
                    variant="outline"
                    className="w-8 h-8 flex items-center justify-center rounded-full"
                    style={{ borderColor: COLORS[index % COLORS.length] }}
                  >
                    {index + 1}
                  </Badge>
                  <div className="flex-1">
                    <p className="font-medium text-sm">{product.productName}</p>
                    <p className="text-xs text-muted-foreground">
                      {product.quantitySold} units sold
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{formatCurrency(product.revenue)}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatCurrency(product.revenue / product.quantitySold)}/unit
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
