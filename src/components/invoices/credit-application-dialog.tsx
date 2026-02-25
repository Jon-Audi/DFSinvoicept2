"use client";

import React, { useState, useMemo } from 'react';
import type { Invoice } from '@/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Icon } from '@/components/icons';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface CreditApplicationDialogProps {
  returnInvoice: Invoice;
  allInvoices: Invoice[];
  open: boolean;
  onClose: () => void;
  onApply: (targetInvoice: Invoice, amount: number) => Promise<void>;
}

export function CreditApplicationDialog({
  returnInvoice,
  allInvoices,
  open,
  onClose,
  onApply,
}: CreditApplicationDialogProps) {
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>('');
  const [applyAmount, setApplyAmount] = useState<string>('');
  const [isApplying, setIsApplying] = useState(false);

  // Available credit remaining = |total| − already applied
  const totalCreditAmount = Math.abs(returnInvoice.total);
  const alreadyApplied = returnInvoice.creditApplied || 0;
  const availableCredit = parseFloat((totalCreditAmount - alreadyApplied).toFixed(2));

  // Outstanding invoices for the same customer (excluding voided, paid, and other returns)
  const eligibleInvoices = useMemo(() =>
    allInvoices
      .filter(inv =>
        inv.customerId === returnInvoice.customerId &&
        inv.id !== returnInvoice.id &&
        !inv.isReturn &&
        inv.status !== 'Voided' &&
        inv.status !== 'Paid' &&
        (inv.balanceDue ?? 0) > 0
      )
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [allInvoices, returnInvoice]
  );

  const selectedInvoice = eligibleInvoices.find(inv => inv.id === selectedInvoiceId) ?? null;

  const maxApplicable = selectedInvoice
    ? parseFloat(Math.min(availableCredit, selectedInvoice.balanceDue).toFixed(2))
    : availableCredit;

  const parsedAmount = parseFloat(applyAmount);
  const amountIsValid =
    !isNaN(parsedAmount) &&
    parsedAmount > 0 &&
    parsedAmount <= maxApplicable + 0.005;

  const handleSelectInvoice = (inv: Invoice) => {
    setSelectedInvoiceId(inv.id);
    // Pre-fill amount with the lesser of available credit and invoice balance
    const suggested = Math.min(availableCredit, inv.balanceDue);
    setApplyAmount(suggested.toFixed(2));
  };

  const handleApply = async () => {
    if (!selectedInvoice || !amountIsValid) return;
    setIsApplying(true);
    try {
      await onApply(selectedInvoice, parseFloat(parsedAmount.toFixed(2)));
      onClose();
    } finally {
      setIsApplying(false);
    }
  };

  const handleClose = () => {
    if (isApplying) return;
    setSelectedInvoiceId('');
    setApplyAmount('');
    onClose();
  };

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon name="CreditCard" className="h-5 w-5 text-green-600" />
            Apply Return Credit
          </DialogTitle>
          <DialogDescription>
            Apply the credit from return invoice{' '}
            <span className="font-medium">{returnInvoice.invoiceNumber}</span> to an outstanding
            invoice for this customer.
          </DialogDescription>
        </DialogHeader>

        {/* Credit summary */}
        <div className="rounded-lg border bg-green-50 dark:bg-green-950/20 p-3 space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Return Amount:</span>
            <span className="font-medium text-green-700 dark:text-green-400">
              {formatCurrency(totalCreditAmount)}
            </span>
          </div>
          {alreadyApplied > 0 && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Previously Applied:</span>
              <span className="font-medium">{formatCurrency(alreadyApplied)}</span>
            </div>
          )}
          <div className="flex justify-between border-t pt-1 mt-1">
            <span className="font-semibold">Available Credit:</span>
            <span className="font-bold text-green-700 dark:text-green-400">
              {formatCurrency(availableCredit)}
            </span>
          </div>
        </div>

        {/* Invoice picker */}
        <div className="space-y-2">
          <Label>Select Invoice to Apply Credit To</Label>
          {eligibleInvoices.length === 0 ? (
            <p className="text-sm text-muted-foreground py-3 text-center border rounded-md">
              No outstanding invoices found for this customer.
            </p>
          ) : (
            <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
              {eligibleInvoices.map(inv => {
                const isSelected = inv.id === selectedInvoiceId;
                return (
                  <button
                    key={inv.id}
                    type="button"
                    onClick={() => handleSelectInvoice(inv)}
                    className={cn(
                      'w-full text-left rounded-md border p-2.5 text-sm transition-colors',
                      isSelected
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/40 hover:bg-accent/30'
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium truncate">{inv.invoiceNumber}</p>
                        {inv.poNumber && (
                          <p className="text-xs text-muted-foreground truncate">PO: {inv.poNumber}</p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(inv.date), 'MM/dd/yyyy')}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-semibold text-destructive">
                          {formatCurrency(inv.balanceDue)} due
                        </p>
                        <Badge variant="outline" className="text-xs mt-0.5">{inv.status}</Badge>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Amount input */}
        {selectedInvoice && (
          <div className="space-y-2">
            <Label htmlFor="apply-amount">Amount to Apply</Label>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">$</span>
              <Input
                id="apply-amount"
                type="number"
                min="0.01"
                max={maxApplicable}
                step="0.01"
                value={applyAmount}
                onChange={e => setApplyAmount(e.target.value)}
                className="w-40"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setApplyAmount(maxApplicable.toFixed(2))}
              >
                Max ({formatCurrency(maxApplicable)})
              </Button>
            </div>
            {!isNaN(parsedAmount) && parsedAmount > 0 && (
              <p className="text-xs text-muted-foreground">
                Remaining balance on {selectedInvoice.invoiceNumber} after applying:{' '}
                <span className="font-medium">
                  {formatCurrency(Math.max(0, selectedInvoice.balanceDue - parsedAmount))}
                </span>
              </p>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isApplying}>
            Cancel
          </Button>
          <Button
            onClick={handleApply}
            disabled={!selectedInvoice || !amountIsValid || isApplying}
            className="gap-2"
          >
            {isApplying && <Icon name="Loader2" className="h-4 w-4 animate-spin" />}
            Apply {applyAmount && !isNaN(parsedAmount) && parsedAmount > 0
              ? formatCurrency(parsedAmount)
              : 'Credit'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
