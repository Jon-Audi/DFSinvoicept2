"use client";

import React, { useState, useEffect } from 'react';
import { useFirebase } from '@/components/firebase-provider';
import { collection, query, orderBy, getDocs, doc, getDoc } from 'firebase/firestore';
import type { BulkPayment, CompanySettings } from '@/types';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/icons';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { BulkPaymentReceipt } from './bulk-payment-receipt';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

interface BulkPaymentsListDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BulkPaymentsListDialog({ isOpen, onOpenChange }: BulkPaymentsListDialogProps) {
  const { db } = useFirebase();
  const [bulkPayments, setBulkPayments] = useState<BulkPayment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<BulkPayment | null>(null);
  const [companySettings, setCompanySettings] = useState<CompanySettings | undefined>();
  const [showInvoices, setShowInvoices] = useState(true);

  useEffect(() => {
    const fetchBulkPayments = async () => {
      if (!db || !isOpen) return;

      setIsLoading(true);
      try {
        const bulkPaymentsRef = collection(db, 'bulkPayments');
        const q = query(bulkPaymentsRef, orderBy('paymentDate', 'desc'));
        const snapshot = await getDocs(q);

        const payments: BulkPayment[] = [];
        snapshot.forEach((doc) => {
          payments.push({ id: doc.id, ...doc.data() } as BulkPayment);
        });

        setBulkPayments(payments);

        // Fetch company settings
        const settingsDoc = await getDoc(doc(db, 'companySettings', 'main'));
        if (settingsDoc.exists()) {
          setCompanySettings(settingsDoc.data() as CompanySettings);
        }
      } catch (error) {
        console.error('Error fetching bulk payments:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBulkPayments();
  }, [db, isOpen]);

  const handleBack = () => {
    setSelectedPayment(null);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-5xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>
            {selectedPayment ? (
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" onClick={handleBack} className="h-8 w-8">
                  <Icon name="ArrowLeft" className="h-4 w-4" />
                </Button>
                <span>Payment Receipt</span>
              </div>
            ) : (
              'Bulk Payment Receipts'
            )}
          </DialogTitle>
          <DialogDescription>
            {selectedPayment
              ? 'Print or view details of this bulk payment receipt'
              : 'View and reprint bulk payment receipts'}
          </DialogDescription>
        </DialogHeader>

        {selectedPayment ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
              <Checkbox
                id="show-invoices"
                checked={showInvoices}
                onCheckedChange={(checked) => setShowInvoices(checked as boolean)}
              />
              <Label htmlFor="show-invoices" className="text-sm cursor-pointer">
                Show invoices covered in this payment
              </Label>
            </div>
            <ScrollArea className="max-h-[calc(90vh-200px)]">
              <BulkPaymentReceipt
                bulkPayment={selectedPayment}
                companySettings={companySettings}
                showInvoices={showInvoices}
              />
            </ScrollArea>
          </div>
        ) : (
          <ScrollArea className="max-h-[calc(90vh-150px)]">
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : bulkPayments.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Icon name="Receipt" className="h-12 w-12 mx-auto mb-4 opacity-20" />
                <p>No bulk payment receipts found</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Payment Method</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-center">Invoices</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bulkPayments.map((payment) => (
                    <TableRow key={payment.id} className="cursor-pointer hover:bg-muted/50">
                      <TableCell>{format(new Date(payment.paymentDate), 'PP')}</TableCell>
                      <TableCell className="font-medium">{payment.customerName}</TableCell>
                      <TableCell>{payment.paymentMethod}</TableCell>
                      <TableCell className="text-right font-medium">
                        ${payment.paymentAmount.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary text-sm font-medium">
                          {payment.invoices.length}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedPayment(payment)}
                        >
                          <Icon name="Eye" className="mr-2 h-4 w-4" />
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}
