"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useFirebase } from '@/components/firebase-provider';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import type { Customer, Invoice, PaymentMethod } from '@/types';
import { PAYMENT_METHODS } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Icon } from '@/components/icons';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Checkbox } from '../ui/checkbox';

const bulkPaymentSchema = z.object({
  customerId: z.string().min(1, 'A customer must be selected.'),
  paymentAmount: z.coerce.number().positive('Payment amount must be greater than zero.'),
  paymentDate: z.date({ required_error: 'Payment date is required.' }),
  paymentMethod: z.enum(PAYMENT_METHODS as [PaymentMethod, ...PaymentMethod[]]),
  paymentNotes: z.string().optional(),
  saveAsCredit: z.boolean().default(false),
  selectedInvoiceIds: z.array(z.string()),
}).refine((data) => {
  if (!data.saveAsCredit) {
    return data.selectedInvoiceIds.length > 0;
  }
  return true;
}, {
  message: 'At least one invoice must be selected when not saving as credit.',
  path: ['selectedInvoiceIds'],
});

type BulkPaymentFormData = z.infer<typeof bulkPaymentSchema>;

interface BulkPaymentDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  customers: Customer[];
  onSave: (customerId: string, paymentDetails: any, invoiceIds: string[]) => void;
  onSaveAsCredit?: (customerId: string, amount: number, notes: string) => void;
}

export function BulkPaymentDialog({ isOpen, onOpenChange, customers, onSave, onSaveAsCredit }: BulkPaymentDialogProps) {
  const { db } = useFirebase();
  const [outstandingInvoices, setOutstandingInvoices] = useState<Invoice[]>([]);
  const [isLoadingInvoices, setIsLoadingInvoices] = useState(false);
  const [isCustomerPopoverOpen, setIsCustomerPopoverOpen] = useState(false);

  const { control, handleSubmit, watch, setValue, formState: { errors } } = useForm<BulkPaymentFormData>({
    resolver: zodResolver(bulkPaymentSchema),
    defaultValues: {
      customerId: '',
      paymentAmount: 0,
      paymentDate: new Date(),
      paymentMethod: 'Check',
      paymentNotes: '',
      saveAsCredit: false,
      selectedInvoiceIds: [],
    },
  });

  const selectedCustomerId = watch('customerId');
  const selectedInvoiceIds = watch('selectedInvoiceIds');
  const saveAsCredit = watch('saveAsCredit');
  const paymentAmount = watch('paymentAmount');

  useEffect(() => {
    const fetchInvoices = async () => {
      if (!db || !selectedCustomerId) {
        setOutstandingInvoices([]);
        setValue('selectedInvoiceIds', []);
        return;
      }
      setIsLoadingInvoices(true);
      try {
        const invoicesRef = collection(db, 'invoices');
        const q = query(
          invoicesRef,
          where('customerId', '==', selectedCustomerId),
          where('status', 'not-in', ['Paid', 'Voided']),
          where('balanceDue', '>', 0),
          orderBy('date', 'asc')
        );
        const snapshot = await getDocs(q);
        const fetchedInvoices: Invoice[] = [];
        snapshot.forEach((doc) => fetchedInvoices.push({ id: doc.id, ...doc.data() } as Invoice));
        setOutstandingInvoices(fetchedInvoices);
        setValue('selectedInvoiceIds', fetchedInvoices.map(inv => inv.id!));
      } catch (error) {
        setOutstandingInvoices([]);
      } finally {
        setIsLoadingInvoices(false);
      }
    };

    fetchInvoices();
  }, [selectedCustomerId, setValue, db]);

  const totalBalanceDue = useMemo(() => {
    return outstandingInvoices
        .filter(inv => selectedInvoiceIds.includes(inv.id!))
        .reduce((sum, inv) => sum + (inv.balanceDue || 0), 0);
  }, [outstandingInvoices, selectedInvoiceIds]);

  const onSubmit = (data: BulkPaymentFormData) => {
    if (data.saveAsCredit && onSaveAsCredit) {
      const notes = data.paymentNotes || `Payment received via ${data.paymentMethod} on ${format(data.paymentDate, 'P')}`;
      onSaveAsCredit(data.customerId, data.paymentAmount, notes);
    } else {
      const paymentDetails = {
        amount: data.paymentAmount,
        date: data.paymentDate.toISOString(),
        method: data.paymentMethod,
        notes: data.paymentNotes,
      };
      onSave(data.customerId, paymentDetails, data.selectedInvoiceIds);
    }
  };

  const handleSelectAll = (checked: boolean) => {
    setValue('selectedInvoiceIds', checked ? outstandingInvoices.map(inv => inv.id!) : []);
  };

  const isAllSelected = outstandingInvoices.length > 0 && selectedInvoiceIds.length === outstandingInvoices.length;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Record Bulk Payment</DialogTitle>
          <DialogDescription>Apply a single payment to multiple outstanding invoices for a customer.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex flex-col space-y-2">
            <Label htmlFor="customer">Customer</Label>
            <Controller
              control={control}
              name="customerId"
              render={({ field }) => (
                <Popover open={isCustomerPopoverOpen} onOpenChange={setIsCustomerPopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      className={cn("w-full justify-between", !field.value && "text-muted-foreground")}
                    >
                      {field.value
                        ? customers.find((c) => c.id === field.value)?.companyName ||
                          `${customers.find((c) => c.id === field.value)?.firstName} ${
                            customers.find((c) => c.id === field.value)?.lastName
                          }`
                        : "Select a customer"}
                      <Icon name="ChevronsUpDown" className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                    <Command>
                      <CommandInput placeholder="Search customer..." />
                      <CommandList>
                        <CommandEmpty>No customer found.</CommandEmpty>
                        <CommandGroup>
                          {customers.map((customer) => (
                            <CommandItem
                              value={customer.companyName || `${customer.firstName} ${customer.lastName}`}
                              key={customer.id}
                              onSelect={() => {
                                field.onChange(customer.id);
                                setIsCustomerPopoverOpen(false);
                              }}
                            >
                              <Icon name="Check" className={cn("mr-2 h-4 w-4", customer.id === field.value ? "opacity-100" : "opacity-0")} />
                              {customer.companyName || `${customer.firstName} ${customer.lastName}`}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              )}
            />
            {errors.customerId && <p className="text-sm text-destructive">{errors.customerId.message}</p>}
          </div>

          {selectedCustomerId && (
            <>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="flex flex-col space-y-2">
                  <Label htmlFor="paymentAmount">Payment Amount</Label>
                  <Controller
                    control={control}
                    name="paymentAmount"
                    render={({ field }) => <Input type="number" step="0.01" {...field} />}
                  />
                  {errors.paymentAmount && <p className="text-sm text-destructive">{errors.paymentAmount.message}</p>}
                </div>

                <div className="flex flex-col space-y-2">
                  <Label>Payment Date</Label>
                  <Controller
                    control={control}
                    name="paymentDate"
                    render={({ field }) => (
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                            {field.value ? format(field.value, 'PPP') : <span>Pick a date</span>}
                            <Icon name="Calendar" className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                        </PopoverContent>
                      </Popover>
                    )}
                  />
                  {errors.paymentDate && <p className="text-sm text-destructive">{errors.paymentDate.message}</p>}
                </div>

                <div className="flex flex-col space-y-2">
                  <Label>Payment Method</Label>
                  <Controller
                    control={control}
                    name="paymentMethod"
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select method" />
                        </SelectTrigger>
                        <SelectContent>
                          {PAYMENT_METHODS.map(method => (
                            <SelectItem key={method} value={method}>{method}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.paymentMethod && <p className="text-sm text-destructive">{errors.paymentMethod.message}</p>}
                </div>
              </div>

              <div className="flex flex-col space-y-2">
                <Label>Notes (e.g., Check #)</Label>
                <Controller
                  control={control}
                  name="paymentNotes"
                  render={({ field }) => <Input {...field} />}
                />
              </div>

              <Separator />

              <div className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                <Controller
                  control={control}
                  name="saveAsCredit"
                  render={({ field }) => (
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  )}
                />
                <div className="space-y-1 leading-none">
                  <Label>Save as Account Credit</Label>
                  <p className="text-sm text-muted-foreground">
                    Add this payment to customer's account credit instead of applying to invoices
                  </p>
                </div>
              </div>

              {!saveAsCredit && (
                <>
                  <Label>Outstanding Invoices</Label>
                  <div className="rounded-md border">
                    <ScrollArea className="h-48">
                      {isLoadingInvoices ? (
                        <div className="p-4 text-center">Loading invoices...</div>
                      ) : outstandingInvoices.length > 0 ? (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-10">
                                <Checkbox
                                  checked={isAllSelected}
                                  onCheckedChange={handleSelectAll}
                                  aria-label="Select all invoices"
                                />
                              </TableHead>
                              <TableHead>Inv #</TableHead>
                              <TableHead>Date</TableHead>
                              <TableHead className="text-right">Balance Due</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {outstandingInvoices.map((invoice) => (
                              <TableRow key={invoice.id}>
                                <TableCell>
                                  <Checkbox
                                    checked={selectedInvoiceIds.includes(invoice.id!)}
                                    onCheckedChange={(checked) => {
                                      const newIds = checked
                                        ? [...selectedInvoiceIds, invoice.id!]
                                        : selectedInvoiceIds.filter((id) => id !== invoice.id);
                                      setValue('selectedInvoiceIds', newIds);
                                    }}
                                  />
                                </TableCell>
                                <TableCell>{invoice.invoiceNumber}</TableCell>
                                <TableCell>{format(new Date(invoice.date), 'MM/dd/yy')}</TableCell>
                                <TableCell className="text-right">${(invoice.balanceDue || 0).toFixed(2)}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      ) : (
                        <p className="p-4 text-center text-muted-foreground">No outstanding invoices for this customer.</p>
                      )}
                    </ScrollArea>
                  </div>
                  <div className="text-right font-semibold">
                    Total Selected Balance: ${totalBalanceDue.toFixed(2)}
                  </div>
                  {errors.selectedInvoiceIds && <p className="text-sm text-destructive">{errors.selectedInvoiceIds.message}</p>}
                </>
              )}

              {saveAsCredit && selectedCustomerId && (
                <div className="rounded-lg border p-4 bg-muted/50 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Current Credit Balance:</span>
                    <span className="font-semibold">
                      ${(customers.find(c => c.id === selectedCustomerId)?.creditBalance || 0).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Payment Amount:</span>
                    <span className="font-semibold text-green-600 dark:text-green-400">
                      +${(paymentAmount || 0).toFixed(2)}
                    </span>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <span className="font-medium">New Credit Balance:</span>
                    <span className="text-lg font-bold text-green-600 dark:text-green-400">
                      ${((customers.find(c => c.id === selectedCustomerId)?.creditBalance || 0) + (paymentAmount || 0)).toFixed(2)}
                    </span>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit(onSubmit)} disabled={isLoadingInvoices || (!saveAsCredit && outstandingInvoices.length === 0)}>
            {saveAsCredit ? 'Add to Credit' : 'Apply Payment'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
