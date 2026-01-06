"use client";

import React, { useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import { format } from 'date-fns';
import type { BulkPayment, CompanySettings } from '@/types';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/icons';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface BulkPaymentReceiptProps {
  bulkPayment: BulkPayment;
  companySettings?: CompanySettings;
  showInvoices?: boolean;
}

export function BulkPaymentReceipt({ bulkPayment, companySettings, showInvoices = true }: BulkPaymentReceiptProps) {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Bulk-Payment-Receipt-${bulkPayment.customerName}-${format(new Date(bulkPayment.paymentDate), 'yyyy-MM-dd')}`,
  });

  const totalApplied = bulkPayment.invoices.reduce((sum, inv) => sum + inv.amountApplied, 0);

  return (
    <div className="space-y-4">
      <div className="flex justify-end gap-2 print:hidden">
        <Button onClick={handlePrint} variant="outline" size="sm">
          <Icon name="Printer" className="mr-2 h-4 w-4" />
          Print Receipt
        </Button>
      </div>

      <div ref={printRef} className="bg-white text-black p-8 print:p-0">
        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <div>
            {companySettings?.logoUrl && (
              <img
                src={companySettings.logoUrl}
                alt={companySettings.companyName}
                className="h-16 w-auto mb-4"
              />
            )}
            <h1 className="text-3xl font-bold text-gray-900">Payment Receipt</h1>
          </div>
          <div className="text-right">
            {companySettings && (
              <>
                <p className="font-semibold text-lg">{companySettings.companyName}</p>
                {companySettings.addressLine1 && <p className="text-sm">{companySettings.addressLine1}</p>}
                {companySettings.addressLine2 && <p className="text-sm">{companySettings.addressLine2}</p>}
                {(companySettings.city || companySettings.state || companySettings.zipCode) && (
                  <p className="text-sm">
                    {[companySettings.city, companySettings.state, companySettings.zipCode].filter(Boolean).join(', ')}
                  </p>
                )}
                {companySettings.phone && <p className="text-sm">Phone: {companySettings.phone}</p>}
                {companySettings.email && <p className="text-sm">Email: {companySettings.email}</p>}
              </>
            )}
          </div>
        </div>

        <Separator className="my-6" />

        {/* Payment Information */}
        <div className="grid grid-cols-2 gap-8 mb-8">
          <div>
            <h2 className="text-lg font-semibold mb-4 text-gray-900">Received From</h2>
            <p className="text-base font-medium">{bulkPayment.customerName}</p>
          </div>
          <div>
            <h2 className="text-lg font-semibold mb-4 text-gray-900">Payment Details</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Payment Date:</span>
                <span className="font-medium">{format(new Date(bulkPayment.paymentDate), 'PPP')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Payment Method:</span>
                <span className="font-medium">{bulkPayment.paymentMethod}</span>
              </div>
              {bulkPayment.paymentNotes && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Reference:</span>
                  <span className="font-medium">{bulkPayment.paymentNotes}</span>
                </div>
              )}
              <div className="flex justify-between pt-2 border-t">
                <span className="text-gray-900 font-semibold">Total Amount:</span>
                <span className="font-bold text-lg">${bulkPayment.paymentAmount.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Invoices Covered */}
        {showInvoices && bulkPayment.invoices.length > 0 && (
          <>
            <Separator className="my-6" />
            <div className="mb-8">
              <h2 className="text-lg font-semibold mb-4 text-gray-900">Applied to Invoices</h2>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-black font-semibold">Invoice Number</TableHead>
                    <TableHead className="text-right text-black font-semibold">Amount Applied</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bulkPayment.invoices.map((invoice) => (
                    <TableRow key={invoice.invoiceId}>
                      <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                      <TableCell className="text-right">${invoice.amountApplied.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="border-t-2">
                    <TableCell className="font-bold">Total Applied</TableCell>
                    <TableCell className="text-right font-bold">${totalApplied.toFixed(2)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>

              {bulkPayment.paymentAmount > totalApplied && (
                <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-900">
                    <span className="font-semibold">Remaining Balance: </span>
                    ${(bulkPayment.paymentAmount - totalApplied).toFixed(2)} applied as account credit
                  </p>
                </div>
              )}
            </div>
          </>
        )}

        {/* Footer */}
        <Separator className="my-6" />
        <div className="text-center text-sm text-gray-500">
          <p>Thank you for your payment!</p>
          <p className="mt-2">Receipt generated on {format(new Date(), 'PPP')}</p>
        </div>
      </div>
    </div>
  );
}
