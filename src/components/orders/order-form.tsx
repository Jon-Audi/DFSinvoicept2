
"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import type { Order, DocumentStatus, Customer, Product, PaymentMethod, Payment, Vendor } from '@/types';
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

const ORDER_STATUSES: Extract<DocumentStatus, 'Draft' | 'Ordered' | 'Ready for pick up' | 'Picked up' | 'Invoiced' | 'Voided' | 'Partial Packed' | 'Packed'>[] = ['Draft', 'Ordered', 'Partial Packed', 'Packed', 'Ready for pick up', 'Picked up', 'Invoiced', 'Voided'];
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
  vendors: Vendor[];
  productCategories: string[];
  productSubcategories: string[];
  onViewCustomer: (customer: Customer) => void;
}

export function OrderForm({ order, initialData, onSubmit, onClose, customers, products, vendors, productCategories = [], productSubcategories, onViewCustomer }: OrderFormProps) {
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
        lineItems: (sourceData.lineItems || [{ id: crypto.randomUUID(), productId: '', productName: '', quantity: 1, unitPrice: 0, isReturn: false, isNonStock: false, addToProductList: false }]).map(li => ({ ...li, id: li.id || crypto.randomUUID(), isNonStock: li.isNonStock ?? false, addToProductList: li.addToProductList ?? false })),
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
  
  const handleProductSelect = (index: number, productId: string) => {
    const selectedProd = products.find(p => p.id === productId);
    const customer = customers.find(c => c.id === form.getValues('customerId'));
    if (selectedProd) {
      const finalPrice = calculateUnitPrice(selectedProd, customer);
      form.setValue(`lineItems.${index}.productId`, selectedProd.id, { shouldValidate: true });
      form.setValue(`lineItems.${index}.productName`, selectedProd.name);
      form.setValue(`lineItems.${index}.unitPrice`, parseFloat(finalPrice.toFixed(2)), { shouldValidate: true });
      setLineItemCategoryFilters(p => { const n = [...p]; n[index] = selectedProd.category; return n; });
      setLineItemSubcategoryFilters(p => { const n = [...p]; n[index] = selectedProd.subcategory; return n; });
    }
    form.trigger(`lineItems.${index}.productId`);
    form.trigger(`lineItems.${index}.unitPrice`);
  };
  
  const handleCategoryFilterChange = (index: number, valueFromSelect: string | undefined) => {
    const newCategoryFilter = valueFromSelect === ALL_CATEGORIES_VALUE ? undefined : valueFromSelect;
    setLineItemCategoryFilters(prevFilters => {
      const newFilters = [...prevFilters];
      newFilters[index] = newCategoryFilter;
      return newFilters;
    });
    setLineItemSubcategoryFilters(prevFilters => { // Reset subcategory filter when category changes
        const newFilters = [...prevFilters];
        newFilters[index] = undefined;
        return newFilters;
    });
    form.setValue(`lineItems.${index}.productId`, '', { shouldValidate: true });
    form.setValue(`lineItems.${index}.productName`, '');
    form.setValue(`lineItems.${index}.unitPrice`, 0, { shouldValidate: true });
    form.trigger(`lineItems.${index}.productId`);
  };

  const handleSubcategoryFilterChange = (index: number, valueFromSelect: string | undefined) => {
    const newSubcategoryFilter = valueFromSelect === ALL_CATEGORIES_VALUE ? undefined : valueFromSelect;
    setLineItemSubcategoryFilters(prevFilters => {
        const newFilters = [...prevFilters];
        newFilters[index] = newSubcategoryFilter;
        return newFilters;
    });
    form.setValue(`lineItems.${index}.productId`, '', { shouldValidate: true });
    form.setValue(`lineItems.${index}.productName`, '');
    form.setValue(`lineItems.${index}.unitPrice`, 0, { shouldValidate: true });
    form.trigger(`lineItems.${index}.productId`);
  };

  const getFilteredProducts = (index: number) => {
    const selectedCategory = lineItemCategoryFilters[index];
    const selectedSubcategory = lineItemSubcategoryFilters[index];
    let filtered = products;

    if (selectedCategory && selectedCategory !== ALL_CATEGORIES_VALUE) {
      filtered = filtered.filter(p => p.category === selectedCategory);
    }
    if (selectedSubcategory && selectedSubcategory !== ALL_CATEGORIES_VALUE) {
        filtered = filtered.filter(p => p.subcategory === selectedSubcategory);
    }
    return (filtered || []);
  };

  const getAvailableSubcategories = (index: number) => {
    const selectedCategory = lineItemCategoryFilters[index];
    if (selectedCategory) {
        const subcategories = new Set(products.filter(p => p.category === selectedCategory).map(p => p.subcategory).filter(Boolean));
        return Array.from(subcategories) as string[];
    }
    return [];
  };

  const addLineItem = () => {
    append({ id: crypto.randomUUID(), productId: '', productName: '', quantity: 1, unitPrice: 0, isReturn: false, isNonStock: false, addToProductList: false });
    setLineItemCategoryFilters(p => [...p, undefined]);
    setLineItemSubcategoryFilters(p => [...p, undefined]);
  };
  
  const removeLineItem = (index: number) => {
    remove(index);
    setLineItemCategoryFilters(prev => prev.filter((_, i) => i !== index));
    setLineItemSubcategoryFilters(prev => prev.filter((_, i) => i !== index));
  };
  
  const handleNonStockToggle = (index: number, checked: boolean) => {
    form.setValue(`lineItems.${index}.isNonStock`, checked);
    if (checked) {
      form.setValue(`lineItems.${index}.productId`, undefined);
      form.setValue(`lineItems.${index}.unitPrice`, 0);
      form.setValue(`lineItems.${index}.cost`, 0);
      form.setValue(`lineItems.${index}.markupPercentage`, 0);
    } else {
      form.setValue(`lineItems.${index}.productName`, '');
      form.setValue(`lineItems.${index}.cost`, undefined);
      form.setValue(`lineItems.${index}.markupPercentage`, undefined);
    }
    form.trigger(`lineItems.${index}.productId`);
    form.trigger(`lineItems.${index}.unitPrice`);
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
  
  const handleNonStockPriceChange = (index: number, value: number, field: 'cost' | 'markup' | 'price') => {
    const cost = form.getValues(`lineItems.${index}.cost`) || 0;
    const markup = form.getValues(`lineItems.${index}.markupPercentage`) || 0;
    const price = form.getValues(`lineItems.${index}.unitPrice`) || 0;

    if (field === 'cost') {
        const newPrice = value * (1 + markup / 100);
        form.setValue(`lineItems.${index}.cost`, value);
        form.setValue(`lineItems.${index}.unitPrice`, parseFloat(newPrice.toFixed(2)));
    } else if (field === 'markup') {
        const newPrice = cost * (1 + value / 100);
        form.setValue(`lineItems.${index}.markupPercentage`, value);
        form.setValue(`lineItems.${index}.unitPrice`, parseFloat(newPrice.toFixed(2)));
    } else if (field === 'price') {
        const newMarkup = cost > 0 ? ((value / cost) - 1) * 100 : 0;
        form.setValue(`lineItems.${index}.unitPrice`, value);
        form.setValue(`lineItems.${index}.markupPercentage`, parseFloat(newMarkup.toFixed(2)));
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4 max-h-[70vh] overflow-y-auto p-1">
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
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder="Select a vendor" />
                            </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            {vendors.map(vendor => (
                                <SelectItem key={vendor.id} value={vendor.name}>
                                    {vendor.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <FormMessage />
                </FormItem>
                )}
            />
        )}
        
        <Separator /><h3 className="text-lg font-medium">Line Items</h3>
        {fields.map((fieldItem, index) => {
          const currentLineItem = watchedLineItems?.[index];
          const quantity = currentLineItem?.quantity || 0;
          const unitPrice = typeof currentLineItem?.unitPrice === 'number' ? currentLineItem.unitPrice : 0;
          const isReturn = currentLineItem?.isReturn || false;
          const isNonStock = currentLineItem?.isNonStock || false;
          const lineTotal = isReturn ? -(quantity * unitPrice) : (quantity * unitPrice);
          const filteredProductsForLine = getFilteredProducts(index);
          const availableSubcategories = getAvailableSubcategories(index);
          return (
            <div key={fieldItem.id} className="space-y-3 p-4 border rounded-md relative">
              <Button type="button" variant="ghost" size="icon" className="absolute top-1 right-1 h-6 w-6" onClick={() => removeLineItem(index)}>
                <Icon name="Trash2" className="h-4 w-4 text-destructive" />
              </Button>
              <div className="flex items-center space-x-4">
                <FormField control={form.control} name={`lineItems.${index}.isReturn`} render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-2">
                      <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                      <FormLabel className="font-normal">Return Item?</FormLabel>
                    </FormItem>
                )} />
                <FormField control={form.control} name={`lineItems.${index}.isNonStock`} render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-2">
                      <FormControl><Checkbox checked={field.value} onCheckedChange={(checked) => handleNonStockToggle(index, !!checked)} /></FormControl>
                      <FormLabel className="font-normal">Non-Stock Item?</FormLabel>
                    </FormItem>
                )} />
              </div>
              {isNonStock ? (
                 <>
                    <FormField control={form.control} name={`lineItems.${index}.productName`} render={({ field }) => (
                        <FormItem><FormLabel>Product/Service Name</FormLabel><FormControl><Input {...field} placeholder="Enter item name" /></FormControl><FormMessage /></FormItem>
                    )} />
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <FormField control={form.control} name={`lineItems.${index}.cost`} render={({ field }) => (
                            <FormItem><FormLabel>Cost</FormLabel><FormControl><Input type="number" step="0.01" {...field} onChange={e => handleNonStockPriceChange(index, parseFloat(e.target.value) || 0, 'cost')} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name={`lineItems.${index}.markupPercentage`} render={({ field }) => (
                            <FormItem><FormLabel>Markup (%)</FormLabel><FormControl><Input type="number" step="0.01" {...field} onChange={e => handleNonStockPriceChange(index, parseFloat(e.target.value) || 0, 'markup')} /></FormControl><FormMessage /></FormItem>
                        )} />
                         <FormField control={form.control} name={`lineItems.${index}.unitPrice`} render={({ field }) => (
                            <FormItem><FormLabel>Unit Price</FormLabel><FormControl><Input type="number" step="0.01" {...field} onChange={e => handleNonStockPriceChange(index, parseFloat(e.target.value) || 0, 'price')} /></FormControl><FormMessage /></FormItem>
                        )} />
                    </div>
                     <FormField
                    control={form.control}
                    name={`lineItems.${index}.addToProductList`}
                    render={({ field }) => (
                        <FormItem className="flex flex-row items-center space-x-2 pt-2">
                        <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                        <FormLabel className="font-normal">Add this item to the main product list</FormLabel>
                        </FormItem>
                    )}
                    />
                    {currentLineItem.addToProductList && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-6 border-l-2 ml-2">
                        <FormField control={form.control} name={`lineItems.${index}.newProductCategory`} render={({ field }) => (
                            <FormItem><FormLabel>New Product Category</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl><SelectTrigger><SelectValue placeholder="Select a category" /></SelectTrigger></FormControl>
                                <SelectContent>{productCategories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}</SelectContent>
                            </Select>
                            <FormMessage />
                            </FormItem>
                        )} />
                        <FormField control={form.control} name={`lineItems.${index}.unit`} render={({ field }) => (
                            <FormItem><FormLabel>Unit</FormLabel><FormControl><Input {...field} placeholder="e.g., piece, hour" /></FormControl><FormMessage /></FormItem>
                        )} />
                    </div>
                    )}
                </>
              ) : ( <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormItem><FormLabel>Category Filter</FormLabel>
                      <Select value={lineItemCategoryFilters[index] || ALL_CATEGORIES_VALUE} onValueChange={(value) => handleCategoryFilterChange(index, value)}>
                        <FormControl><SelectTrigger><SelectValue placeholder="All Categories" /></SelectTrigger></FormControl>
                        <SelectContent><SelectItem value={ALL_CATEGORIES_VALUE}>All Categories</SelectItem>
                          {(productCategories || []).map(category => <SelectItem key={category} value={category}>{category}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </FormItem>
                    <FormItem>
                      <FormLabel>Subcategory Filter</FormLabel>
                      <Select
                        value={lineItemSubcategoryFilters[index] || ALL_CATEGORIES_VALUE}
                        onValueChange={(value) => handleSubcategoryFilterChange(index, value)}
                        disabled={!lineItemCategoryFilters[index]}
                      >
                        <FormControl><SelectTrigger><SelectValue placeholder="All Subcategories" /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value={ALL_CATEGORIES_VALUE}>All Subcategories</SelectItem>
                          {availableSubcategories.map(sub => <SelectItem key={sub} value={sub}>{sub}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  </div>
                  <FormField control={form.control} name={`lineItems.${index}.productId`} render={({ field: controllerField }) => (
                      <FormItem className="flex flex-col"><FormLabel>Product</FormLabel>
                        <Popover><PopoverTrigger asChild><FormControl>
                              <Button variant="outline" role="combobox" className={cn("w-full justify-between", !controllerField.value && "text-muted-foreground")}>
                                {controllerField.value ? products.find(p => p.id === controllerField.value)?.name : "Select product"}
                                <Icon name="ChevronsUpDown" className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                        </FormControl></PopoverTrigger>
                        <PopoverContent className="w-[--radix-popover-trigger-width] p-0"><Command>
                            <CommandInput placeholder="Search product..." />
                            <CommandList><CommandEmpty>No product found.</CommandEmpty>
                            <CommandGroup>
                              {filteredProductsForLine.map((product) => {
                                const searchableValue = [product.name, product.category, product.unit].filter(Boolean).join(' ').toLowerCase();
                                return (<CommandItem value={searchableValue} key={product.id} onSelect={() => handleProductSelect(index, product.id)}>
                                    <Icon name="Check" className={cn("mr-2 h-4 w-4", product.id === controllerField.value ? "opacity-100" : "opacity-0")}/>
                                    {product.name} ({product.unit}) - Cost: ${product.cost.toFixed(2)}
                                  </CommandItem>); })}
                            </CommandGroup></CommandList>
                        </Command></PopoverContent></Popover><FormMessage />
                      </FormItem>
                  )} /> </>
              )}
              <div className="grid grid-cols-3 gap-4 items-end">
                <FormField
                  control={form.control}
                  name={`lineItems.${index}.unitPrice`}
                  render={({ field: priceField }) => (
                    <FormItem>
                      <FormLabel>Unit Price</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          {...priceField}
                          value={priceField.value === undefined || priceField.value === null || isNaN(Number(priceField.value)) ? '' : String(priceField.value)}
                          onChange={(e) => {
                            const val = e.target.value;
                            const num = parseFloat(val);
                            priceField.onChange(isNaN(num) ? undefined : num);
                          }}
                          disabled={!isNonStock}
                          placeholder="0.00"
                        />
                      </FormControl>
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
                        <Input
                          type="number"
                          {...qtyField}
                          value={qtyField.value === undefined || qtyField.value === null || isNaN(Number(qtyField.value)) ? '' : String(qtyField.value)}
                            onChange={(e) => { const val = e.target.value; const num = parseInt(val, 10); qtyField.onChange(isNaN(num) ? undefined : num); }}
                            min="1" disabled={!isNonStock && !watchedLineItems?.[index]?.productId} />
                    </FormControl><FormMessage /></FormItem>
                )}/>
                <FormItem><FormLabel>Line Total</FormLabel>
                  <Input type="text" readOnly value={lineTotal !== 0 ? `${isReturn ? '-' : ''}$${Math.abs(lineTotal).toFixed(2)}` : '$0.00'} className={cn("bg-muted font-semibold", isReturn && "text-destructive")} />
                </FormItem>
              </div>
            </div>
          );
        })}
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
