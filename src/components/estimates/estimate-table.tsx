
"use client";

import React from 'react';
import type { Estimate, Customer, Product, CompanySettings } from '@/types';
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
import { EstimateDialog } from './estimate-dialog';
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
import { useRouter } from 'next/navigation';
import { getEmployeeNameFromEmail } from '@/lib/employee-utils';

export type SortableEstimateKeys = 'estimateNumber' | 'customerName' | 'poNumber' | 'date' | 'total' | 'status' | 'validUntil';

interface EstimateTableProps {
  estimates: Estimate[];
  customers: Customer[];
  products: Product[];
  productCategories: string[];
  productSubcategories: string[];
  onSave: (estimate: Estimate) => void;
  onDelete: (estimateId: string) => void;
  onGenerateEmail: (estimate: Estimate) => void;
  onPrint: (estimate: Estimate) => void;
  onClone: (estimate: Estimate) => void;
  onConvertToOrder: (estimate: Estimate) => void;
  onConvertToInvoice: (estimate: Estimate) => void;
  formatDate: (dateString?: string) => string;
  onViewItems: (estimate: Estimate) => void;
  onSaveProduct: (product: Omit<Product, 'id'>) => Promise<string | void>;
  onSaveCustomer: (customer: Omit<Customer, 'id'> & { id?: string; }) => Promise<string | void>;
  sortConfig: { key: SortableEstimateKeys; direction: 'asc' | 'desc' };
  requestSort: (key: SortableEstimateKeys) => void;
  renderSortArrow: (columnKey: SortableEstimateKeys) => JSX.Element | null;
  companySettings?: CompanySettings | null;
}

export function EstimateTable({
  estimates,
  customers,
  products,
  productCategories,
  productSubcategories,
  onSave,
  onDelete,
  onGenerateEmail,
  onPrint,
  onClone,
  onConvertToOrder,
  onConvertToInvoice,
  formatDate,
  onViewItems,
  onSaveProduct,
  onSaveCustomer,
  sortConfig,
  requestSort,
  renderSortArrow,
  companySettings,
}: EstimateTableProps) {
  const [estimateToDelete, setEstimateToDelete] = React.useState<Estimate | null>(null);

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead onClick={() => requestSort('estimateNumber')} className="cursor-pointer hover:bg-muted/50">
              Number {renderSortArrow('estimateNumber')}
            </TableHead>
            <TableHead onClick={() => requestSort('customerName')} className="cursor-pointer hover:bg-muted/50">
              Customer {renderSortArrow('customerName')}
            </TableHead>
            <TableHead>Created By</TableHead>
            <TableHead onClick={() => requestSort('poNumber')} className="cursor-pointer hover:bg-muted/50">
              P.O. # {renderSortArrow('poNumber')}
            </TableHead>
            <TableHead onClick={() => requestSort('date')} className="cursor-pointer hover:bg-muted/50">
              Date {renderSortArrow('date')}
            </TableHead>
            <TableHead onClick={() => requestSort('total')} className="text-right cursor-pointer hover:bg-muted/50">
              Total {renderSortArrow('total')}
            </TableHead>
            <TableHead onClick={() => requestSort('status')} className="cursor-pointer hover:bg-muted/50">
              Status {renderSortArrow('status')}
            </TableHead>
            <TableHead className="w-[80px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {estimates.map((estimate) => {
            return (
              <TableRow key={estimate.id}>
                <TableCell>{estimate.estimateNumber}</TableCell>
                <TableCell>{estimate.customerName}</TableCell>
                <TableCell className="text-muted-foreground">
                  {getEmployeeNameFromEmail(estimate.createdBy)}
                </TableCell>
                <TableCell>{estimate.poNumber || 'N/A'}</TableCell>
                <TableCell>{formatDate(estimate.date)}</TableCell>
                <TableCell className="text-right">${estimate.total.toFixed(2)}</TableCell>
                <TableCell><Badge variant={estimate.status === 'Sent' || estimate.status === 'Accepted' ? 'default' : 'outline'}>{estimate.status}</Badge></TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Icon name="MoreHorizontal" className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onViewItems(estimate)}>
                        <Icon name="Layers" className="mr-2 h-4 w-4" /> View Items
                      </DropdownMenuItem>
                      <EstimateDialog
                        estimate={estimate}
                        triggerButton={
                          <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                            <Icon name="Edit" className="mr-2 h-4 w-4" /> Edit
                          </DropdownMenuItem>
                        }
                        onSave={onSave}
                        onSaveCustomer={onSaveCustomer}
                        onSaveProduct={onSaveProduct}
                        products={products}
                        customers={customers}
                        productCategories={productCategories}
                        productSubcategories={productSubcategories}
                      />
                      <DropdownMenuItem onClick={() => onClone(estimate)}>
                        <Icon name="Copy" className="mr-2 h-4 w-4" /> Clone Estimate
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onGenerateEmail(estimate)}>
                        <Icon name="Mail" className="mr-2 h-4 w-4" /> Email Draft
                      </DropdownMenuItem>
                      <PDFExportButton
                        document={estimate}
                        type="estimate"
                        companySettings={companySettings}
                        triggerButton={
                          <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                            <Icon name="FileText" className="mr-2 h-4 w-4" /> Export PDF
                          </DropdownMenuItem>
                        }
                      />
                      <DropdownMenuItem onClick={() => onPrint(estimate)}>
                         <Icon name="Printer" className="mr-2 h-4 w-4" /> Print Estimate
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => onConvertToOrder(estimate)}>
                        <Icon name="ShoppingCart" className="mr-2 h-4 w-4" /> Convert to Order
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onConvertToInvoice(estimate)}>
                        <Icon name="FileDigit" className="mr-2 h-4 w-4" /> Convert to Invoice
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive focus:bg-destructive/10"
                        onSelect={() => setEstimateToDelete(estimate)}
                      >
                        <Icon name="Trash2" className="mr-2 h-4 w-4" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
       {estimates.length === 0 && (
        <p className="p-4 text-center text-muted-foreground">
          No estimates found.
        </p>
      )}

      {estimateToDelete && (
        <AlertDialog open={!!estimateToDelete} onOpenChange={(isOpen) => !isOpen && setEstimateToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete estimate &quot;{estimateToDelete.estimateNumber}&quot;.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setEstimateToDelete(null)}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => {if (estimateToDelete) onDelete(estimateToDelete.id); setEstimateToDelete(null); }} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
}
