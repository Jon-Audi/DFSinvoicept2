"use client";

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/icons';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useFirebase } from '@/components/firebase-provider';
import { getProductPriceHistory, calculatePriceStats } from '@/lib/price-history';
import type { PriceHistoryEntry } from '@/types';

interface PriceHistoryDialogProps {
  productId: string;
  productName: string;
  triggerButton?: React.ReactNode;
}

export function PriceHistoryDialog({ productId, productName, triggerButton }: PriceHistoryDialogProps) {
  const [open, setOpen] = useState(false);
  const [history, setHistory] = useState<PriceHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { db } = useFirebase();

  useEffect(() => {
    if (open && db) {
      loadHistory();
    }
  }, [open, db, productId]);

  const loadHistory = async () => {
    if (!db) return;

    setIsLoading(true);
    try {
      const data = await getProductPriceHistory(db, productId);
      setHistory(data);
    } catch (error) {
      console.error('Error loading price history:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const stats = history.length > 0 ? calculatePriceStats(history) : null;

  const getPriceChange = (oldPrice?: number, newPrice?: number) => {
    if (!oldPrice || !newPrice) return null;
    const change = newPrice - oldPrice;
    const percent = (change / oldPrice) * 100;

    return {
      amount: change,
      percent,
      isIncrease: change > 0,
    };
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {triggerButton || (
          <Button variant="ghost" size="sm">
            <Icon name="History" className="mr-2 h-4 w-4" />
            Price History
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Price History: {productName}</DialogTitle>
          <DialogDescription>
            Track price, cost, and markup changes over time
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center p-8">
            <Icon name="Loader2" className="h-8 w-8 animate-spin" />
          </div>
        ) : history.length === 0 ? (
          <div className="text-center text-muted-foreground p-8">
            No price history available for this product.
          </div>
        ) : (
          <>
            {stats && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 p-4 bg-muted rounded-lg">
                <div>
                  <div className="text-xs text-muted-foreground">Total Changes</div>
                  <div className="text-lg font-semibold">{stats.totalChanges}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Current Price</div>
                  <div className="text-lg font-semibold">${stats.currentPrice.toFixed(2)}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Price Change</div>
                  <div className="text-lg font-semibold">{stats.priceIncrease}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Cost Change</div>
                  <div className="text-lg font-semibold">{stats.costIncrease}</div>
                </div>
              </div>
            )}

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Cost</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead className="text-right">Markup</TableHead>
                    <TableHead>Changed By</TableHead>
                    <TableHead>Reason</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.map((entry) => {
                    const costChange = getPriceChange(entry.oldCost, entry.newCost);
                    const priceChange = getPriceChange(entry.oldPrice, entry.newPrice);

                    return (
                      <TableRow key={entry.id}>
                        <TableCell className="text-sm">
                          {new Date(entry.timestamp).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex flex-col items-end">
                            <span className="font-medium">${entry.newCost.toFixed(2)}</span>
                            {costChange && (
                              <Badge
                                variant={costChange.isIncrease ? 'destructive' : 'default'}
                                className="mt-1 text-xs"
                              >
                                {costChange.isIncrease ? '↑' : '↓'}
                                {Math.abs(costChange.percent).toFixed(1)}%
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex flex-col items-end">
                            <span className="font-medium">${entry.newPrice.toFixed(2)}</span>
                            {priceChange && (
                              <Badge
                                variant={priceChange.isIncrease ? 'default' : 'secondary'}
                                className="mt-1 text-xs"
                              >
                                {priceChange.isIncrease ? '↑' : '↓'}
                                {Math.abs(priceChange.percent).toFixed(1)}%
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          {entry.newMarkup.toFixed(1)}%
                        </TableCell>
                        <TableCell className="text-sm">
                          {entry.changedBy || 'System'}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {entry.reason || '—'}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
