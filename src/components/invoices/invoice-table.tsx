
"use client";

import React from 'react';
import type { Invoice, Customer, Product, Vendor, CompanySettings } from '@/types';
import { useAuth } from '@/contexts/auth-context';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/icons';
import { Badge } from '@/components/ui/badge';
import { InvoiceDialog } from './invoice-dialog';
import { PDFExportButton } from '@/components/pdf-export-button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from '@/lib/utils';
import { getEmployeeNameFromEmail } from '@/lib/employee-utils';

export type SortableInvoiceKeys =
  | "invoiceNumber"
  | "customerName"
  | "poNumber"
  | "date"
  | "dueDate"
  | 'total'
  | 'amountPaid'
  | 'balanceDue'
  | 'status';

interface InvoiceTableProps {
  invoices: Invoice[];
  onSave: (invoice: Invoice) => void;
  onSaveProduct: (product: Omit<Product, 'id'>) => Promise<string | void>;
  onSaveCustomer: (customer: Customer) => Promise<string | void>;
  onDelete: (invoiceId: string) => void;
  onGenerateEmail: (invoice: Invoice) => void;
  onPrint: (invoice: Invoice) => void;
  onPrintPackingSlip: (invoice: Invoice) => void;
  onSendToPacking: (invoice: Invoice) => void;
  onToggleFinalize: (invoice: Invoice) => void;
  formatDate: (dateString: string | Date | undefined, options?: Intl.DateTimeFormatOptions) => string;
  customers: Customer[];
  products: Product[];
  vendors: Vendor[];
  productCategories: string[];
  productSubcategories: string[];
  onViewItems: (invoice: Invoice) => void;
  sortConfig: { key: SortableInvoiceKeys; direction: 'asc' | 'desc' };
  requestSort: (key: SortableInvoiceKeys) => void;
  renderSortArrow: (columnKey: SortableInvoiceKeys) => JSX.Element | null;
  companySettings?: CompanySettings | null;
}

export function InvoiceTable({
  invoices,
  onSave,
  onSaveProduct,
  onSaveCustomer,
  onDelete,
  onGenerateEmail,
  onPrint,
  onPrintPackingSlip,
  onSendToPacking,
  onToggleFinalize,
  formatDate,
  customers,
  products,
  vendors,
  productCategories,
  productSubcategories,
  onViewItems,
  sortConfig,
  requestSort,
  renderSortArrow,
  companySettings,
}: InvoiceTableProps) {
  const [invoiceToDelete, setInvoiceToDelete] = React.useState<Invoice | null>(null);
  const { user } = useAuth();
  // A simple permission check, assuming user object has a 'role' or 'permissions' array
  const canViewPricing = user && user.permissions?.includes('view_pricing');


  const getStatusVariant = (
    status: Invoice['status']
  ): "default" | "secondary" | "outline" | "destructive" => {
    switch (status) {
      case 'Paid':
        return 'default';
      case 'Partially Paid':
      case 'Ready for pick up':
      case 'Packed':
      case 'Partial Packed':
        return 'secondary';
      case 'Picked up':
        return 'default';
      case 'Sent':
      case 'Ordered':
      case 'Draft':
        return 'outline';
      case 'Voided':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead onClick={() => requestSort('customerName')} className="cursor-pointer hover:bg-muted/50">
              Customer {renderSortArrow('customerName')}
            </TableHead>
            <TableHead onClick={() => requestSort('poNumber')} className="cursor-pointer hover:bg-muted/50">
              P.O. # {renderSortArrow('poNumber')}
            </TableHead>
            <TableHead onClick={() => requestSort('date')} className="cursor-pointer hover:bg-muted/50">
              Date {renderSortArrow('date')}
            </TableHead>
            {canViewPricing && (
                <TableHead onClick={() => requestSort('total')} className="text-right cursor-pointer hover:bg-muted/50">
                    Total {renderSortArrow('total')}
                </TableHead>
            )}
            <TableHead onClick={() => requestSort('status')} className="cursor-pointer hover:bg-muted/50">
              Status {renderSortArrow('status')}
            </TableHead>
            <TableHead className="w-[80px] text-center">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {invoices.map((invoice) => (
            <TableRow key={invoice.id}>
              <TableCell>
                <div className="flex flex-col">
                  <span className="font-medium">{invoice.customerName}</span>
                  <span className="text-xs text-muted-foreground">#{invoice.invoiceNumber}</span>
                </div>
              </TableCell>
              <TableCell>{invoice.poNumber || 'N/A'}</TableCell>
              <TableCell>{formatDate(invoice.date)}</TableCell>
              {canViewPricing && (
                <TableCell className="text-right font-medium">${invoice.total.toFixed(2)}</TableCell>
              )}
              <TableCell>
                <div className="flex items-center gap-2">
                  <Badge
                    variant={getStatusVariant(invoice.status)}
                    className={cn(
                      invoice.status === 'Paid' && 'bg-green-500 hover:bg-green-600 text-white',
                      (invoice.status === 'Partially Paid' || invoice.status === 'Ready for pick up' || invoice.status === 'Packed' || invoice.status === 'Partial Packed') &&
                        'bg-yellow-500 hover:bg-yellow-600 text-black',
                      invoice.status === 'Picked up' && 'bg-green-500 hover:bg-green-600 text-white',
                    )}
                  >
                    {invoice.status}
                    {invoice.distributor && ` (${invoice.distributor})`}
                    {invoice.status === 'Ready for pick up' &&
                      invoice.readyForPickUpDate &&
                      ` (${formatDate(invoice.readyForPickUpDate, { month: '2-digit', day: '2-digit' })})`}
                    {invoice.status === 'Picked up' &&
                      invoice.pickedUpDate &&
                      ` (${formatDate(invoice.pickedUpDate, { month: '2-digit', day: '2-digit' })})`}
                  </Badge>
                  {invoice.isFinalized && (
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300">
                      <Icon name="Lock" className="h-3 w-3 mr-1" />
                      Finalized
                    </Badge>
                  )}
                </div>
              </TableCell>
              <TableCell className="text-center">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Icon name="MoreHorizontal" className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onSelect={() => onViewItems(invoice)}
                     >
                        <Icon name="Layers" className="mr-2 h-4 w-4" /> View Items
                    </DropdownMenuItem>
                    <InvoiceDialog
                      invoice={invoice}
                      triggerButton={
                        // keep the dialog’s item from auto-select closing
                        <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                          <Icon name="Edit" className="mr-2 h-4 w-4" /> Edit
                        </DropdownMenuItem>
                      }
                      onSave={onSave}
                      onSaveProduct={onSaveProduct}
                      onSaveCustomer={onSaveCustomer}
                      customers={customers}
                      products={products}
                      vendors={vendors}
                      productCategories={productCategories}
                      productSubcategories={productSubcategories}
                    />

                    <DropdownMenuItem onSelect={() => onGenerateEmail(invoice)}>
                      <Icon name="Mail" className="mr-2 h-4 w-4" /> Email Invoice
                    </DropdownMenuItem>

                    <PDFExportButton
                      document={invoice}
                      type="invoice"
                      companySettings={companySettings}
                      triggerButton={
                        <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                          <Icon name="FileText" className="mr-2 h-4 w-4" /> Export PDF
                        </DropdownMenuItem>
                      }
                    />

                     <DropdownMenuItem onSelect={() => onSendToPacking(invoice)}>
                      <Icon name="PackageCheck" className="mr-2 h-4 w-4" /> Send to Packing
                    </DropdownMenuItem>

                    <DropdownMenuItem onSelect={() => onPrint(invoice)}>
                      <Icon name="Printer" className="mr-2 h-4 w-4" /> Print Invoice
                    </DropdownMenuItem>

                    <DropdownMenuItem onSelect={() => onPrintPackingSlip(invoice)}>
                      <Icon name="PackageCheck" className="mr-2 h-4 w-4" /> Print Packing Slip
                    </DropdownMenuItem>

                    <DropdownMenuSeparator />

                    <DropdownMenuItem
                      onSelect={() => onToggleFinalize(invoice)}
                      className={invoice.isFinalized ? "text-orange-600" : "text-green-600"}
                    >
                      <Icon name={invoice.isFinalized ? "Unlock" : "Lock"} className="mr-2 h-4 w-4" />
                      {invoice.isFinalized ? "Unfinalize" : "Finalize"} Invoice
                    </DropdownMenuItem>

                    <DropdownMenuSeparator />

                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive focus:bg-destructive/10"
                      onSelect={() => setInvoiceToDelete(invoice)}
                    >
                      <Icon name="Trash2" className="mr-2 h-4 w-4" /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {invoiceToDelete && (
        <AlertDialog open={!!invoiceToDelete} onOpenChange={(isOpen) => !isOpen && setInvoiceToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete invoice &quot;{invoiceToDelete.invoiceNumber}&quot;.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setInvoiceToDelete(null)}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  onDelete(invoiceToDelete.id);
                  setInvoiceToDelete(null);
                }}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
}
