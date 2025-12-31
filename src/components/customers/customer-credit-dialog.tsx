"use client";

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import type { Customer } from '@/types';
import { Icon } from '@/components/icons';

interface CustomerCreditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer: Customer | null;
  onSave: (customerId: string, newCreditBalance: number, notes: string) => void;
}

export function CustomerCreditDialog({ open, onOpenChange, customer, onSave }: CustomerCreditDialogProps) {
  const [transactionType, setTransactionType] = useState<'add' | 'subtract'>('add');
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');

  const currentBalance = customer?.creditBalance || 0;
  const amountNum = parseFloat(amount) || 0;
  const newBalance = transactionType === 'add'
    ? currentBalance + amountNum
    : currentBalance - amountNum;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customer || !amount || amountNum <= 0) return;

    onSave(customer.id, newBalance, notes);

    // Reset form
    setAmount('');
    setNotes('');
    setTransactionType('add');
    onOpenChange(false);
  };

  const handleCancel = () => {
    setAmount('');
    setNotes('');
    setTransactionType('add');
    onOpenChange(false);
  };

  if (!customer) return null;

  const customerName = customer.companyName || `${customer.firstName} ${customer.lastName}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Manage Account Credit</DialogTitle>
            <DialogDescription>
              Add or subtract credit for {customerName}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
              <div>
                <p className="text-sm text-muted-foreground">Current Credit Balance</p>
                <p className="text-2xl font-bold">
                  ${currentBalance.toFixed(2)}
                </p>
              </div>
              <Icon name="Wallet" className="h-8 w-8 text-muted-foreground" />
            </div>

            <div className="space-y-2">
              <Label>Transaction Type</Label>
              <RadioGroup value={transactionType} onValueChange={(value) => setTransactionType(value as 'add' | 'subtract')}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="add" id="add" />
                  <Label htmlFor="add" className="font-normal">
                    Add Credit (payment received, refund issued, etc.)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="subtract" id="subtract" />
                  <Label htmlFor="subtract" className="font-normal">
                    Subtract Credit (applying to invoice, correcting balance)
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Amount</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="pl-7"
                  placeholder="0.00"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="E.g., Bulk payment received, Refund for order #123..."
                rows={3}
              />
            </div>

            {amount && amountNum > 0 && (
              <div className={`p-3 rounded-lg ${newBalance >= 0 ? 'bg-green-50 dark:bg-green-950' : 'bg-red-50 dark:bg-red-950'}`}>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">New Balance:</span>
                  <span className={`text-lg font-bold ${newBalance >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    ${newBalance.toFixed(2)}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {transactionType === 'add' ? 'Adding' : 'Subtracting'} ${amountNum.toFixed(2)} {transactionType === 'add' ? 'to' : 'from'} current balance
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button type="submit" disabled={!amount || amountNum <= 0}>
              <Icon name="Check" className="mr-2 h-4 w-4" />
              Update Credit Balance
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
