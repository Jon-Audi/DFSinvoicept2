
"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import type { Order, DocumentStatus, Customer, Product, PaymentMethod, Payment } from '@/types';
import { PAYMENT_METHODS, ALL_CATEGORIES_MARKUP_KEY } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { Icon } from '@/components/icons';
import { Separator } from '@/components/ui/separator';
import { BulkAddProductsDialog } from '@/components/estimates/bulk-add-products-dialog';

const ORDER_STATUSES: Extract<DocumentStatus, 'Draft' | 'Ordered' | 'Ready for pick up' | 'Picked up' | 'Invoiced' | 'Voided'>[] = ['Draft', 'Ordered', 'Ready for pick up', 'Picked up', 'Invoiced', 'Voided'];
const ORDER_STATES: Order['orderState'][] = ['Open', 'Closed'];
const ALL_CATEGORIES_VALUE = "_ALL_CATEGORIES_";

const lineItemSchema = z.object({
  id: z.string().optional(),
  isNonStock: z.boolean().optional().default(false),
  productId: z.string().optional(),
  productName: z.string().optional(),
  quantity: z.coerce.number().min(1, "Quantity must be at least 1."),
  unitPrice: z.coerce.number().min(0, "Unit price must be non-negative"),
  cost: z.coerce.number().optional(),
  markupPercentage: z.coerce.number().optional(),
  isReturn: z.boolean().optional(),
  addToProductList: z.boolean().optional().default(false),
  newProductCategory: z.string().optional(),
  unit: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.isNonStock) {
    if (!data.productName || data.productName.trim() === "") {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Product name is required for non-stock items.", path: ["productName"] });
    }
     if (data.addToProductList && (!data.newProductCategory || data.newProductCategory.trim() === '')) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Category is required to add this item to the product list.", path: ["newProductCategory"] });
    }
  } else {
    if (!data.productId || data.productId.trim() === "") {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Product selection is required for stock items.", path: ["productId"] });
    }
  }
});

const formPaymentSchema = z.object({
  id: z.string(),
  date: z.date(),
  amount: z.coerce.number().refine(val => val !== 0, { message: "Amount cannot be zero." }),
  method: z.enum(PAYMENT_METHODS as [PaymentMethod, ...PaymentMethod[]]),
  notes: z.string().optional(),
});

const orderFormSchema = z.object({
  id: z.string().optional(),
  orderNumber: z.string().min(1, "Order number is required"),
  customerId: z.string().min(1, "Customer is required"),
  date: z.date({ required_error: "Order date is required." }),
  status: z.enum(ORDER_STATUSES as [typeof ORDER_STATUSES[0], ...typeof ORDER_STATUSES]),
  orderState: z.enum(ORDER_STATES as [typeof ORDER_STATES[0], ...typeof ORDER_STATES]),
  poNumber: z.string().optional(),
  distributor: z.string().optional(),
  lineItems: z.array(lineItemSchema).min(1, "At least one line item is required."),
  notes: z.string().optional(),
  expectedDeliveryDate: z.date().optional(),
  readyForPickUpDate: z.date().optional(),
  pickedUpDate: z.date().optional(),
  payments: z.array(formPaymentSchema).optional(),
  currentPaymentAmount: z.coerce.number().refine(val => val !== 0, { message: "Amount cannot be zero." }).optional(),
  currentPaymentDate: z.date().optional(),
  currentPaymentMethod: z.enum(PAYMENT_METHODS as [PaymentMethod, ...PaymentMethod[]]).optional(),
  currentPaymentNotes: z.string().optional(),
}).refine(data => {
    if (data.currentPaymentAmount) return !!data.currentPaymentDate && !!data.currentPaymentMethod;
    return true;
}, { message: "Payment date and method are required if payment amount is entered.", path: ["currentPaymentMethod"] });

export type OrderFormData = Omit<z.infer<typeof orderFormSchema>, 'payments'> & { payments?: Payment[] };
export type FormPayment = z.infer<typeof formPaymentSchema>;

interface OrderFormProps {
  order?: Order;
  initialData?: OrderFormData | null;
  onSubmit: (data: OrderFormData) => void;
  onClose?: () => void;
  customers: Customer[];
  products: Product[];
  productCategories: string[];
  productSubcategories: string[];
  onViewCustomer: (customer: Customer) => void;
}

export function OrderForm({ order, initialData, onSubmit, onClose, customers, products, productCategories = [], productSubcategories, onViewCustomer }: OrderFormProps) {
  const [isBulkAddDialogOpen, setIsBulkAddDialogOpen] = useState(false);
  const [lineItemCategoryFilters, setLineItemCategoryFilters] = useState<(string | undefined)[]>([]);
  const [lineItemSubcategoryFilters, setLineItemSubcategoryFilters] = useState<(string | undefined)[]>([]);
  const [editingPayment, setEditingPayment] = useState<FormPayment | null>(null);
  const [localPayments, setLocalPayments] = useState<FormPayment[]>([]);

  const form = useForm<z.infer<typeof orderFormSchema>>({ resolver: zodResolver(orderFormSchema) });
  const { fields, append, remove } = useFieldArray({ control: form.control, name: "lineItems" });
  
  const watchedStatus = form.watch('status');

  useEffect(() => {
    let defaultValues: z.infer<typeof orderFormSchema>;
    let initialLocalPayments: FormPayment[] = [];

    const sourceData = order || initialData;

    if (sourceData) {
      defaultValues = {
        id: sourceData.id,
        orderNumber: sourceData.orderNumber || `ORD-${new Date().getFullYear()}-${String(Math.floor(Math.random()*9000)+1000).padStart(4, '0')}`,
        customerId: sourceData.customerId || '',
        date: sourceData.date ? new Date(sourceData.date) : new Date(),
        status: sourceData.status || 'Draft',
        orderState: sourceData.orderState || 'Open',
        poNumber: sourceData.poNumber ?? '',
        distributor: sourceData.distributor ?? '',
        lineItems: (sourceData.lineItems || [{ id: crypto.randomUUID(), productId: '', productName: '', quantity: 1, unitPrice: 0, isReturn: false, isNonStock: false }]).map(li => ({ ...li, id: li.id || crypto.randomUUID() })),
        notes: sourceData.notes || '',
        payments: sourceData.payments?.map(p => ({...p, date: typeof p.date === 'string' ? parseISO(p.date as string) : p.date})) || [],
        expectedDeliveryDate: sourceData.expectedDeliveryDate ? new Date(sourceData.expectedDeliveryDate) : undefined,
        readyForPickUpDate: sourceData.readyForPickUpDate ? new Date(sourceData.readyForPickUpDate) : undefined,
        pickedUpDate: sourceData.pickedUpDate ? new Date(sourceData.pickedUpDate) : undefined,
      };
      initialLocalPayments = defaultValues.payments || [];
    } else {
      defaultValues = {
        id: undefined,
        orderNumber: `ORD-${new Date().getFullYear()}-${String(Math.floor(Math.random()*9000)+1000).padStart(4, '0')}`,
        customerId: '', date: new Date(), status: 'Ordered', orderState: 'Open', poNumber: '',
        lineItems: [{ id: crypto.randomUUID(), productId: '', productName: '', quantity: 1, unitPrice: 0, isReturn: false, isNonStock: false, addToProductList: false }],
        notes: '', payments: [],
      };
    }
    form.reset(defaultValues);
    setLocalPayments(initialLocalPayments);
    setEditingPayment(null);

    const formLineItemsAfterReset = form.getValues('lineItems') || [];
    setLineItemCategoryFilters(formLineItemsAfterReset.map(item => !item.isNonStock && item.productId ? products.find(p => p.id === item.productId)?.category : undefined));
    setLineItemSubcategoryFilters(formLineItemsAfterReset.map(item => !item.isNonStock && item.productId ? products.find(p => p.id === item.productId)?.subcategory : undefined));
  }, [order, initialData, form, products]);

  const watchedLineItems = form.watch('lineItems') || [];
  const currentOrderTotal = useMemo(() => watchedLineItems.reduce((acc, item) => acc + (item.unitPrice || 0) * (item.quantity || 0) * (item.isReturn ? -1 : 1), 0), [watchedLineItems]);
  const totalPaidFromLocalPayments = useMemo(() => localPayments.reduce((acc, p) => acc + (p.amount || 0), 0), [localPayments]);
  const balanceDueDisplay = currentOrderTotal - totalPaidFromLocalPayments;

  const handleAddOrUpdatePayment = () => {
    const amount = form.getValues("currentPaymentAmount"), date = form.getValues("currentPaymentDate"), method = form.getValues("currentPaymentMethod"), notes = form.getValues("currentPaymentNotes");
    if (amount && date && method) {
      if (editingPayment) {
        setLocalPayments(prev => prev.map(p => p.id === editingPayment.id ? { ...editingPayment, date, amount, method, notes } : p));
        setEditingPayment(null);
      } else {
        setLocalPayments(prev => [...prev, { id: crypto.randomUUID(), date, amount, method, notes }]);
      }
      form.reset({ ...form.getValues(), currentPaymentAmount: undefined, currentPaymentDate: undefined, currentPaymentMethod: undefined, currentPaymentNotes: '' });
      form.clearErrors(["currentPaymentAmount", "currentPaymentDate", "currentPaymentMethod"]);
    } else {
      form.trigger(["currentPaymentAmount", "currentPaymentDate", "currentPaymentMethod"]);
    }
  };

  const handleFormSubmit = (data: z.infer<typeof orderFormSchema>) => {
    onSubmit({ ...data, payments: localPayments.map(p => ({ ...p, date: p.date.toISOString() })) });
  };
  
  const handleProductSelect = (index: number, productId: string) => {
    const selectedProd = products.find(p => p.id === productId);
    const customer = customers.find(c => c.id === form.getValues('customerId'));
    if (selectedProd) {
      let finalPrice = selectedProd.price;
      if (customer?.specificMarkups?.length) {
        const specificRule = customer.specificMarkups.find(m => m.categoryName === selectedProd.category);
        const allCategoriesRule = customer.specificMarkups.find(m => m.categoryName === ALL_CATEGORIES_MARKUP_KEY);
        if (specificRule) finalPrice = selectedProd.cost * (1 + specificRule.markupPercentage / 100);
        else if (allCategoriesRule) finalPrice = selectedProd.cost * (1 + allCategoriesRule.markupPercentage / 100);
      }
      form.setValue(`lineItems.${index}.productId`, selectedProd.id, { shouldValidate: true });
      form.setValue(`lineItems.${index}.productName`, selectedProd.name);
      form.setValue(`lineItems.${index}.unitPrice`, parseFloat(finalPrice.toFixed(2)), { shouldValidate: true });
      setLineItemCategoryFilters(p => { const n = [...p]; n[index] = selectedProd.category; return n; });
      setLineItemSubcategoryFilters(p => { const n = [...p]; n[index] = selectedProd.subcategory; return n; });
    }
    form.trigger(`lineItems.${index}.productId`);
    form.trigger(`lineItems.${index}.unitPrice`);
  };

  const addLineItem = () => {
    append({ id: crypto.randomUUID(), productId: '', productName: '', quantity: 1, unitPrice: 0, isReturn: false, isNonStock: false, addToProductList: false });
    setLineItemCategoryFilters(p => [...p, undefined]);
    setLineItemSubcategoryFilters(p => [...p, undefined]);
  };

  const handleBulkAddItems = (itemsToAdd: Array<{ productId: string; quantity: number }>) => {
    const newFilterEntries: (string | undefined)[] = [];
    const newSubFilterEntries: (string | undefined)[] = [];
    const currentCustomerId = form.getValues('customerId');
    const currentCustomer = customers.find(c => c.id === currentCustomerId);

    itemsToAdd.forEach(item => {
      const productDetails = products.find(p => p.id === item.productId);
      if (!productDetails) return;

      const finalPrice = calculateUnitPrice(productDetails, currentCustomer);

      append({
        id: crypto.randomUUID(),
        productId: item.productId,
        productName: productDetails.name,
        quantity: item.quantity,
        unitPrice: finalPrice,
        isReturn: false,
        isNonStock: false,
        addToProductList: false,
      });
      newFilterEntries.push(productDetails?.category);
      newSubFilterEntries.push(productDetails?.subcategory);
    });
    setLineItemCategoryFilters(prev => [...prev, ...newFilterEntries]);
    setLineItemSubcategoryFilters(prev => [...prev, ...newSubFilterEntries]);
    setIsBulkAddDialogOpen(false);
  };

  const calculateUnitPrice = (product: Product, customer?: Customer): number => {
    let finalPrice = product.price;
    if (customer && customer.specificMarkups && customer.specificMarkups.length > 0) {
      const specificRule = customer.specificMarkups.find(m => m.categoryName === product.category);
      const allCategoriesRule = customer.specificMarkups.find(m => m.categoryName === ALL_CATEGORIES_MARKUP_KEY);

      if (specificRule) {
        finalPrice = product.cost * (1 + specificRule.markupPercentage / 100);
      } else if (allCategoriesRule) {
        finalPrice = product.cost * (1 + allCategoriesRule.markupPercentage / 100);
      }
    }
    return parseFloat(finalPrice.toFixed(2));
  };
  
  // Render JSX...
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4 max-h-[70vh] overflow-y-auto p-1">
        {/* All the FormField components from invoice-form, adapted for Order */}
        <FormField control={form.control} name="orderNumber" render={({ field }) => (
          <FormItem><FormLabel>Order Number</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        
        <FormField control={form.control} name="customerId" render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Customer</FormLabel>
              <div className="flex items-center gap-2">
              <Popover><PopoverTrigger asChild><FormControl>
                  <Button variant="outline" role="combobox" className={cn("w-full justify-between", !field.value && "text-muted-foreground")}>
                    {field.value ? customers.find(c => c.id === field.value)?.companyName || `${customers.find(c => c.id === field.value)?.firstName} ${customers.find(c => c.id === field.value)?.lastName}` : "Select customer"}
                    <Icon name="ChevronsUpDown" className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
              </FormControl></PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0"><Command>
                  <CommandInput placeholder="Search customer..." />
                  <CommandList><CommandEmpty>No customer found.</CommandEmpty>
                  <CommandGroup>{customers.map((c) => (<CommandItem value={`${c.companyName} ${c.firstName} ${c.lastName}`} key={c.id} onSelect={() => form.setValue("customerId", c.id, { shouldValidate: true })}><Icon name="Check" className={cn("mr-2 h-4 w-4", c.id === field.value ? "opacity-100" : "opacity-0")}/>{c.companyName || `${c.firstName} ${c.lastName}`}</CommandItem>))}</CommandGroup>
                  </CommandList>
              </Command></PopoverContent></Popover>
              <Button type="button" variant="outline" size="icon" onClick={() => {const c = customers.find(c => c.id === field.value); if(c) onViewCustomer(c)}} disabled={!field.value}><Icon name="UserCog" /></Button>
              </div><FormMessage />
            </FormItem>
        )} />
        
        <FormField control={form.control} name="poNumber" render={({ field }) => (
          <FormItem><FormLabel>P.O. Number (Optional)</FormLabel><FormControl><Input {...field} placeholder="Customer PO" /></FormControl><FormMessage /></FormItem>
        )} />
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField control={form.control} name="date" render={({ field }) => (
            <FormItem className="flex flex-col"><FormLabel>Order Date</FormLabel><Popover><PopoverTrigger asChild><FormControl>
                <Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>{field.value ? format(field.value, "PPP") : <span>Pick a date</span>}<Icon name="Calendar" className="ml-auto h-4 w-4 opacity-50" /></Button>
            </FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus /></PopoverContent></Popover><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="status" render={({ field }) => (
            <FormItem><FormLabel>Status</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger></FormControl><SelectContent>{ORDER_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
          )} />
        </div>
        
        {watchedStatus === 'Ordered' && (
          <FormField
            control={form.control}
            name="distributor"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Distributor / Vendor</FormLabel>
                <FormControl><Input {...field} placeholder="Enter distributor name" /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
        
        {/* Other date fields like expected, ready, picked up */}

        <Separator /><h3 className="text-lg font-medium">Line Items</h3>
        {fields.map((field, index) => (
          <div key={field.id} className="space-y-3 p-4 border rounded-md relative">
            <Button type="button" variant="ghost" size="icon" className="absolute top-1 right-1 h-6 w-6" onClick={() => remove(index)}>
                <Icon name="Trash2" className="h-4 w-4 text-destructive" />
            </Button>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name={`lineItems.${index}.productId`}
                render={({ field: controllerField }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Product</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            role="combobox"
                            className={cn("w-full justify-between", !controllerField.value && "text-muted-foreground")}
                          >
                            {controllerField.value ? products.find((p) => p.id === controllerField.value)?.name : "Select product"}
                            <Icon name="ChevronsUpDown" className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                        <Command>
                          <CommandInput placeholder="Search product..." />
                          <CommandList>
                            <CommandEmpty>No product found.</CommandEmpty>
                            <CommandGroup>
                              {products.map((p) => (
                                <CommandItem value={p.name} key={p.id} onSelect={() => handleProductSelect(index, p.id)}>
                                  <Icon name="Check" className={cn("mr-2 h-4 w-4", p.id === controllerField.value ? "opacity-100" : "opacity-0")} />
                                  {p.name}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name={`lineItems.${index}.quantity`}
                render={({ field: qtyField }) => (
                  <FormItem>
                    <FormLabel>Quantity</FormLabel>
                    <FormControl>
                      <Input type="number" min="1" {...qtyField} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
        ))}
         <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={addLineItem}><Icon name="PlusCircle" className="mr-2 h-4 w-4" /> Add Item</Button>
            <Button type="button" variant="outline" onClick={() => setIsBulkAddDialogOpen(true)}><Icon name="Layers" className="mr-2 h-4 w-4" /> Bulk Add Stock Items</Button>
        </div>

        <Separator />
        <div className="flex justify-end gap-2 pt-4">
          {onClose && <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>}
          <Button type="submit" disabled={form.formState.isSubmitting}>{form.formState.isSubmitting && <Icon name="Loader2" className="mr-2 h-4 w-4 animate-spin" />}{order || initialData ? 'Save Changes' : 'Create Order'}</Button>
        </div>
      </form>
       {isBulkAddDialogOpen && (
        <BulkAddProductsDialog isOpen={isBulkAddDialogOpen} onOpenChange={setIsBulkAddDialogOpen} products={products} productCategories={productCategories} onAddItems={handleBulkAddItems} />
      )}
    </Form>
  );
}

    