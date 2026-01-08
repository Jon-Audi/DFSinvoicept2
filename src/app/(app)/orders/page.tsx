
"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/icons';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from "@/hooks/use-toast";
import { generateOrderEmailDraft } from '@/ai/flows/order-email-draft';
import type { Order, Customer, Product, Estimate, CompanySettings, EmailContact, Vendor } from '@/types';
import { OrderDialog } from '@/components/orders/order-dialog';
import type { OrderFormData } from '@/components/orders/order-form';
import { useFirebase } from '@/components/firebase-provider';
import { collection, addDoc, setDoc, deleteDoc, onSnapshot, doc, getDoc, DocumentReference, query, orderBy, limit } from 'firebase/firestore';
import { PrintableOrder } from '@/components/orders/printable-order';
import { PrintableOrderPackingSlip } from '@/components/orders/printable-order-packing-slip';
import { LineItemsViewerDialog } from '@/components/shared/line-items-viewer-dialog';
import { OrderTable, type SortableOrderKeys } from '@/components/orders/order-table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

const COMPANY_SETTINGS_DOC_ID = "main";

export default function OrdersPage() {
  const { db } = useFirebase();
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [stableProductCategories, setStableProductCategories] = useState<string[]>([]);
  const [stableProductSubcategories, setStableProductSubcategories] = useState<string[]>([]);

  const [isLoading, setIsLoading] = useState(true);

  const [selectedOrderForEmail, setSelectedOrderForEmail] = useState<Order | null>(null);
  const [targetCustomerForEmail, setTargetCustomerForEmail] = useState<Customer | null>(null);
  const [selectedRecipientEmails, setSelectedRecipientEmails] = useState<string[]>([]);
  const [additionalRecipientEmail, setAdditionalRecipientEmail] = useState<string>('');

  const [emailDraft, setEmailDraft] = useState<{ subject?: string; body?: string } | null>(null);
  const [editableSubject, setEditableSubject] = useState<string>('');
  const [editableBody, setEditableBody] = useState<string>('');
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [isLoadingEmail, setIsLoadingEmail] = useState(false);
  const { toast } = useToast();
  const [isClient, setIsClient] = useState(false);
  const router = useRouter();
  const conversionHandled = useRef(false);

  const [isConvertingOrder, setIsConvertingOrder] = useState(false);
  const [conversionOrderData, setConversionOrderData] = useState<OrderFormData | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: SortableOrderKeys; direction: 'asc' | 'desc' }>({ key: 'date', direction: 'desc' });

  const [orderForViewingItems, setOrderForViewingItems] = useState<Order | null>(null);
  const [isLineItemsViewerOpen, setIsLineItemsViewerOpen] = useState(false);

  const printRef = useRef<HTMLDivElement>(null);
  const [orderToPrint, setOrderToPrint] = useState<any | null>(null);
  const [packingSlipToPrint, setPackingSlipToPrint] = useState<any | null>(null);
  
  useEffect(() => {
    setIsClient(true);
    if (conversionHandled.current) return;
    if (typeof window !== 'undefined') {
      const pendingOrderRaw = localStorage.getItem('estimateToConvert_order');
      if (pendingOrderRaw) {
        conversionHandled.current = true;
        localStorage.removeItem('estimateToConvert_order');
        try {
          const estimateToConvert = JSON.parse(pendingOrderRaw) as Estimate;
          const newOrderData: OrderFormData = {
            orderNumber: `ORD-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9000) + 1000).padStart(4, '0')}`,
            customerId: estimateToConvert.customerId,
            date: new Date(),
            status: 'Ordered',
            orderState: 'Open',
            poNumber: estimateToConvert.poNumber || '',
            lineItems: estimateToConvert.lineItems.map(li => ({
              id: li.id,
              productId: li.productId,
              productName: li.productName,
              quantity: li.quantity,
              unitPrice: li.unitPrice,
              isReturn: li.isReturn || false,
              isNonStock: li.isNonStock || false,
              addToProductList: li.addToProductList ?? false,
            })),
            notes: `Converted from Estimate #${estimateToConvert.estimateNumber}. ${estimateToConvert.notes || ''}`.trim(),
            expectedDeliveryDate: undefined,
            readyForPickUpDate: undefined,
            pickedUpDate: undefined,
            payments: [],
          };
          setConversionOrderData(newOrderData);
        } catch (error) {
          toast({ title: "Conversion Error", description: "Could not process estimate data for order.", variant: "destructive" });
        }
      }
    }
  }, [toast]);

  const handleSaveCustomer = async (customerToSave: Omit<Customer, 'id'> & { id?: string }): Promise<string | void> => {
    if (!db) return;
    const { id, ...customerData } = customerToSave;
    try {
      if (id && customers.some(c => c.id === id)) {
        const customerRef = doc(db, 'customers', id);
        await setDoc(customerRef, customerData, { merge: true });
        toast({ title: "Customer Updated", description: `Customer ${customerToSave.firstName} ${customerToSave.lastName} has been updated.` });
        return id;
      } else {
        const dataToSave = { ...customerData, createdAt: new Date().toISOString() };
        const docRef = await addDoc(collection(db, 'customers'), dataToSave);
        toast({ title: "Customer Added", description: `Customer ${customerToSave.firstName} ${customerToSave.lastName} has been added.` });
        return docRef.id;
      }
    } catch (error) {
      toast({ title: "Error", description: "Could not save customer to database.", variant: "destructive" });
    }
  };

  const handleSaveProduct = async (productToSave: Omit<Product, 'id'>): Promise<string | void> => {
    if (!db) return;
    try {
      const docRef = await addDoc(collection(db, 'products'), productToSave);
      toast({
        title: "Product Added",
        description: `Product ${productToSave.name} has been added to the product list.`,
      });
      return docRef.id;
    } catch (error) {
      toast({
        title: "Error Saving Product",
        description: "Could not save the new item to the product list.",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    if (conversionOrderData && !isLoading) {
      setIsConvertingOrder(true);
    }
  }, [conversionOrderData, isLoading]);


  useEffect(() => {
    if (!db) return;

    let active = true;
    const unsubscribes: (() => void)[] = [];

    const loadData = async () => {
        setIsLoading(true);

        const collectionsToWatch = {
            orders: (data: any[]) => setOrders(data.map(d => ({
                ...d,
                total: d.total || 0,
                amountPaid: d.amountPaid || 0,
                balanceDue: d.balanceDue !== undefined ? d.balanceDue : (d.total || 0) - (d.amountPaid || 0),
                payments: d.payments || [],
                distributor: d.distributor || undefined,
            }))),
            customers: setCustomers,
            products: (data: Product[]) => {
                setProducts(data);
                const categories = Array.from(new Set(data.map(p => p.category))).sort();
                setStableProductCategories(categories);
                const subcategories = Array.from(new Set(data.map(p => p.subcategory).filter(Boolean) as string[])).sort();
                setStableProductSubcategories(subcategories);
            },
            vendors: setVendors,
        };

        for (const [path, setter] of Object.entries(collectionsToWatch)) {
            // Load all documents sorted by date
            const q = path === 'orders'
                ? query(collection(db, path), orderBy('date', 'desc'))
                : collection(db, path);

            const unsubscribe = onSnapshot(q, (snapshot) => {
                if (active) {
                    const docsData = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
                    setter(docsData as any);
                }
            }, (error) => {
                toast({ title: "Error", description: `Could not fetch ${path}.`, variant: "destructive" });
            });
            unsubscribes.push(unsubscribe);
        }
        
        setIsLoading(false);
    };
    
    loadData();

    return () => {
        active = false;
        unsubscribes.forEach(unsub => unsub());
    };
}, [db, toast]);

  const handleSaveOrder = async (orderToSave: Order) => {
    if (!db) return;
    try {
        const { id, ...orderDataFromDialog } = orderToSave;

        // Orders do NOT affect inventory - only save the order
        // Inventory is only deducted when an Invoice is created
        if (id) {
            // UPDATE existing order
            const orderRef = doc(db, 'orders', id);
            await setDoc(orderRef, orderDataFromDialog, { merge: true });
        } else {
            // ADD new order
            await addDoc(collection(db, 'orders'), orderDataFromDialog);
        }

        toast({
            title: orderToSave.id ? "Order Updated" : "Order Added",
            description: `Order ${orderToSave.orderNumber} has been saved.`
        });
    } catch (error: any) {
        toast({ title: "Error", description: `Could not save order: ${error.message}`, variant: "destructive" });
    } finally {
        if (isConvertingOrder) {
            setIsConvertingOrder(false);
            setConversionOrderData(null);
        }
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
    if (!db) return;
    try {
      await deleteDoc(doc(db, 'orders', orderId));
      toast({ title: "Order Deleted", description: "The order has been removed." });
    } catch (error) {
      toast({ title: "Error", description: "Could not delete order.", variant: "destructive" });
    }
  };

  const fetchCompanySettings = async (): Promise<CompanySettings | null> => {
    if (!db) return null;
    try {
      const docRef = doc(db, 'companySettings', COMPANY_SETTINGS_DOC_ID);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return docSnap.data() as CompanySettings;
      }
      toast({ title: "Company Settings Not Found", description: "Please configure company settings for printing.", variant: "default" });
      return null;
    } catch (error) {
      toast({ title: "Error", description: "Could not fetch company settings.", variant: "destructive" });
      return null;
    }
  };

  const handlePrepareAndPrintOrder = async (order: Order) => {
    const settings = await fetchCompanySettings();
    if (settings) {
      const absoluteLogoUrl = `${window.location.origin}/Logo.png`;

      setOrderToPrint({
        order: order,
        companySettings: settings,
        logoUrl: absoluteLogoUrl,
      });
      setPackingSlipToPrint(null); 
      setTimeout(() => {
        if (printRef.current) {
          const printContents = printRef.current.innerHTML;
          const win = window.open('', '_blank');
          if (win) {
            win.document.write('<html><head><title>Print Order</title>');
            win.document.write('<link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">');
            win.document.write('<style>body { margin: 0; } .print-only-container { width: 100%; min-height: 100vh; } @media print { body { size: auto; margin: 0; } .print-only { display: block !important; } .print-only-container { display: block !important; } }</style>');
            win.document.write('</head><body>');
            win.document.write(printContents);
            win.document.write('</body></html>');
            win.document.close();
            win.focus();
            setTimeout(() => { win.print(); win.close(); }, 750);
          } else {
            toast({ title: "Print Error", description: "Popup blocked.", variant: "destructive" });
          }
        }
        setOrderToPrint(null); 
      }, 100);
    } else {
      toast({ title: "Cannot Print", description: "Company settings are required.", variant: "destructive" });
    }
  };

  const handlePrepareAndPrintOrderPackingSlip = async (order: Order) => {
    const settings = await fetchCompanySettings();
    if (settings) {
      const absoluteLogoUrl = `${window.location.origin}/Logo.png`;

      setPackingSlipToPrint({
        order: order,
        companySettings: settings,
        logoUrl: absoluteLogoUrl,
      });
      setOrderToPrint(null); 
      setTimeout(() => {
        if (printRef.current) {
          const printContents = printRef.current.innerHTML;
          const win = window.open('', '_blank');
          if (win) {
            win.document.write('<html><head><title>Print Packing Slip</title>');
            win.document.write('<link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">');
            win.document.write('<style>body { margin: 0; } .print-only-container { width: 100%; min-height: 100vh; } @media print { body { size: auto; margin: 0; } .print-only { display: block !important; } .print-only-container { display: block !important; } }</style>');
            win.document.write('</head><body>');
            win.document.write(printContents);
            win.document.write('</body></html>');
            win.document.close();
            win.focus();
            setTimeout(() => { win.print(); win.close(); }, 750);
          } else {
            toast({ title: "Print Error", description: "Popup blocked.", variant: "destructive" });
          }
        }
        setPackingSlipToPrint(null); 
      }, 100);
    } else {
      toast({ title: "Cannot Print", description: "Company settings are required.", variant: "destructive" });
    }
  };


  const handleGenerateEmail = async (order: Order) => {
    setSelectedOrderForEmail(order);
    const customer = customers.find(c => c.id === order.customerId);
    setTargetCustomerForEmail(customer || null);
    setSelectedRecipientEmails([]);
    setAdditionalRecipientEmail('');

    setIsEmailModalOpen(true);
    setIsLoadingEmail(true);
    setEmailDraft(null);
    setEditableSubject('');
    setEditableBody('');

    try {
      const orderItemsDescription = order.lineItems.map(item =>
        `- ${item.productName} (Qty: ${item.quantity}, Unit Price: $${item.unitPrice.toFixed(2)}, Total: $${item.total.toFixed(2)})`
      ).join('\n') || 'Items as per order.';

      const customerDisplayName = customer ? (customer.companyName || `${customer.firstName} ${customer.lastName}`) : (order.customerName || 'Valued Customer');
      const customerEmail = customer?.emailContacts?.find(ec => ec.type === 'Main Contact')?.email || customer?.emailContacts?.[0]?.email || undefined;

      const result = await generateOrderEmailDraft({
        customerName: customerDisplayName,
        customerEmail: customerEmail,
        orderNumber: order.orderNumber,
        orderDate: new Date(order.date).toLocaleDateString(),
        orderItems: orderItemsDescription,
        orderTotal: order.total,
        companyName: (await fetchCompanySettings())?.companyName || "Delaware Fence Pro",
      });

      setEmailDraft({ subject: result.subject, body: result.body });
      setEditableSubject(result.subject);
      setEditableBody(result.body);

    } catch (error) {
      toast({ title: "Error", description: "Failed to generate email draft.", variant: "destructive" });
      setEmailDraft({ subject: "Error generating subject", body: "Could not generate email content." });
      setEditableSubject("Error generating subject");
      setEditableBody("Could not generate email content.");
    } finally {
      setIsLoadingEmail(false);
    }
  };

  const handleSendEmail = async () => {
    if (!selectedOrderForEmail || !editableSubject || !editableBody || !db) {
        toast({ title: "Error", description: "Email content or order details missing.", variant: "destructive"});
        return;
    }
    
    const finalRecipients: { email: string; name: string }[] = [];
    if (targetCustomerForEmail && targetCustomerForEmail.emailContacts) {
        selectedRecipientEmails.forEach(selEmail => {
            const contact = targetCustomerForEmail.emailContacts.find(ec => ec.email === selEmail);
            if (contact) {
                finalRecipients.push({ email: contact.email, name: contact.name || '' });
            }
        });
    }
    if (additionalRecipientEmail.trim() !== "") {
      if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(additionalRecipientEmail.trim())) {
          if (!finalRecipients.some(r => r.email === additionalRecipientEmail.trim())) {
              finalRecipients.push({ email: additionalRecipientEmail.trim(), name: '' });
          }
      } else {
        toast({ title: "Invalid Email", description: "The additional email address is not valid.", variant: "destructive" });
        return;
      }
    }

    if (finalRecipients.length === 0) {
      toast({ title: "No Recipients", description: "Please select or add at least one email recipient.", variant: "destructive" });
      return;
    }

    setIsLoadingEmail(true);
    try {
      await addDoc(collection(db, 'emails'), {
        to: finalRecipients,
        subject: editableSubject,
        html: editableBody,
      });
      toast({
        title: "Email Queued",
        description: `Email for order ${selectedOrderForEmail.orderNumber} has been queued for sending.`,
      });
      setIsEmailModalOpen(false);
    } catch (error: any) {
      toast({
        title: "Email Queue Failed",
        description: error.message || "Could not queue the email. Check Firestore permissions and console.",
        variant: "destructive",
        duration: 7000,
      });
    } finally {
      setIsLoadingEmail(false);
    }
  };

  const formatDateForDisplay = (dateString: string | undefined, options?: Intl.DateTimeFormatOptions) => {
    if (!dateString) return 'N/A';
    if (!isClient) return new Date(dateString).toISOString().split('T')[0];
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  const handleConvertToInvoice = (order: Order) => {
    localStorage.setItem('orderToConvert_invoice', JSON.stringify(order));
    router.push('/invoices');
  };

  const handleViewItems = (orderToView: Order) => {
    setOrderForViewingItems(orderToView);
    setIsLineItemsViewerOpen(true);
  };

  const requestSort = (key: SortableOrderKeys) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key) {
      direction = sortConfig.direction === 'asc' ? 'desc' : 'asc';
    } else {
      if (key === 'date' || key === 'total' || key === 'amountPaid' || key === 'balanceDue' ||
          key === 'expectedDeliveryDate' || key === 'readyForPickUpDate' || key === 'pickedUpDate') {
        direction = 'desc';
      } else {
        direction = 'asc';
      }
    }
    setSortConfig({ key, direction });
  };

  const sortedAndFilteredOrders = useMemo(() => {
    const sortableItems = orders.filter(order => {
        if (!searchTerm.trim()) return true;
        const lowercasedFilter = searchTerm.toLowerCase();
        const searchFields = [
            order.orderNumber,
            order.customerName,
            order.poNumber,
            order.status,
            order.orderState,
        ];
        return searchFields.some(field =>
            field && field.toLowerCase().includes(lowercasedFilter)
        );
    });

    if (sortConfig.key) {
      sortableItems.sort((a, b) => {
        const valA = a[sortConfig.key as keyof Order];
        const valB = b[sortConfig.key as keyof Order];

        let comparison = 0;

        if (valA === null || valA === undefined) comparison = 1;
        else if (valB === null || valB === undefined) comparison = -1;
        else if (['date', 'expectedDeliveryDate', 'readyForPickUpDate', 'pickedUpDate'].includes(sortConfig.key)) {
          comparison = new Date(valA as string).getTime() - new Date(valB as string).getTime();
        } else if (typeof valA === 'number' && typeof valB === 'number') {
          comparison = valA - valB;
        } else {
          comparison = String(valA).toLowerCase().localeCompare(String(valB).toLowerCase());
        }
        return sortConfig.direction === 'asc' ? comparison : -comparison;
      });
    }
    return sortableItems;
  }, [orders, searchTerm, sortConfig]);

  const renderSortArrow = (columnKey: SortableOrderKeys) => {
    if (sortConfig.key === columnKey) {
      return sortConfig.direction === 'asc' ? <Icon name="ChevronUp" className="inline ml-1 h-4 w-4" /> : <Icon name="ChevronDown" className="inline ml-1 h-4 w-4" />;
    }
    return null;
  };

  if (isLoading) {
    return (
      <PageHeader title="Orders" description="Loading orders database...">
        <div className="flex items-center justify-center h-32">
          <Icon name="Loader2" className="h-8 w-8 animate-spin" />
        </div>
      </PageHeader>
    );
  }

  return (
    <>
      <PageHeader title="Orders" description="Create and manage customer orders.">
        <OrderDialog
          triggerButton={
            <Button>
              <Icon name="PlusCircle" className="mr-2 h-4 w-4" />
              New Order
            </Button>
          }
          onSave={handleSaveOrder}
          onSaveProduct={handleSaveProduct}
          onSaveCustomer={handleSaveCustomer}
          customers={customers}
          products={products}
          vendors={vendors}
          productCategories={stableProductCategories}
          productSubcategories={stableProductSubcategories}
        />
      </PageHeader>

      {isConvertingOrder && conversionOrderData && !isLoading && (
        <OrderDialog
            isOpen={isConvertingOrder}
            onOpenChange={(open) => {
                setIsConvertingOrder(open);
                if (!open) setConversionOrderData(null);
            }}
            initialData={conversionOrderData}
            onSave={handleSaveOrder}
            onSaveProduct={handleSaveProduct}
            onSaveCustomer={handleSaveCustomer}
            customers={customers}
            products={products}
            vendors={vendors}
            productCategories={stableProductCategories}
            productSubcategories={stableProductSubcategories}
        />
      )}

      <Card>
        <CardHeader>
          <CardTitle>All Orders</CardTitle>
          <CardDescription>A list of all orders in the system.</CardDescription>
        </CardHeader>
        <CardContent>
          <Input
            placeholder="Search by #, customer, PO, status, or state..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm mb-4"
          />
          <OrderTable
            orders={sortedAndFilteredOrders}
            onSave={handleSaveOrder}
            onDelete={handleDeleteOrder}
            onGenerateEmail={handleGenerateEmail}
            onPrint={handlePrepareAndPrintOrder}
            onPrintPackingSlip={handlePrepareAndPrintOrderPackingSlip}
            formatDate={formatDateForDisplay}
            customers={customers}
            products={products}
            vendors={vendors}
            productCategories={stableProductCategories}
            productSubcategories={stableProductSubcategories}
            onViewItems={handleViewItems}
            onConvertToInvoice={handleConvertToInvoice}
            sortConfig={sortConfig}
            requestSort={requestSort}
            renderSortArrow={renderSortArrow}
            onSaveProduct={handleSaveProduct}
            onSaveCustomer={handleSaveCustomer}
          />
           {sortedAndFilteredOrders.length === 0 && (
             <p className="p-4 text-center text-muted-foreground">
               {orders.length === 0 ? "No orders found." : "No orders match your search."}
            </p>
          )}
        </CardContent>
      </Card>

       {selectedOrderForEmail && (
        <Dialog open={isEmailModalOpen} onOpenChange={setIsEmailModalOpen}>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Email Draft for Order {selectedOrderForEmail.orderNumber}</DialogTitle>
              <DialogDescription>
                Review and send the email to {selectedOrderForEmail.customerName}.
              </DialogDescription>
            </DialogHeader>
            {isLoadingEmail && !emailDraft ? ( 
              <div className="flex flex-col justify-center items-center h-60 space-y-2">
                 <Icon name="Loader2" className="h-8 w-8 animate-spin text-primary" />
                 <p>Loading email draft...</p>
              </div>
            ) : emailDraft ? (
              <div className="space-y-4 py-4">
                <div>
                  <Label className="text-sm font-medium mb-2 block">Recipients</Label>
                  {targetCustomerForEmail && targetCustomerForEmail.emailContacts.length > 0 ? (
                    <ScrollArea className="h-24 w-full rounded-md border p-2 mb-2">
                      {targetCustomerForEmail.emailContacts.map((contact: EmailContact) => (
                        <div key={contact.id} className="flex items-center space-x-2 mb-1">
                          <Checkbox
                            id={`email-contact-order-${contact.id}`}
                            checked={selectedRecipientEmails.includes(contact.email)}
                            onCheckedChange={(checked) => {
                              setSelectedRecipientEmails(prev =>
                                checked ? [...prev, contact.email] : prev.filter(e => e !== contact.email)
                              );
                            }}
                          />
                          <Label htmlFor={`email-contact-order-${contact.id}`} className="text-sm font-normal">
                            {contact.email} ({contact.type} - {contact.name || 'N/A'})
                          </Label>
                        </div>
                      ))}
                    </ScrollArea>
                  ) : (
                    <p className="text-sm text-muted-foreground mb-2">No saved email contacts for this customer.</p>
                  )}
                  <FormFieldWrapper>
                    <Label htmlFor="additionalEmailOrder">Or add another email:</Label>
                    <Input
                      id="additionalEmailOrder"
                      type="email"
                      placeholder="another@example.com"
                      value={additionalRecipientEmail}
                      onChange={(e) => setAdditionalRecipientEmail(e.target.value)}
                    />
                  </FormFieldWrapper>
                </div>
                <Separator />
                <div>
                  <Label htmlFor="emailSubjectOrder">Subject</Label>
                  <Input id="emailSubjectOrder" value={editableSubject} onChange={(e) => setEditableSubject(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="emailBodyOrder">Body</Label>
                  <Textarea id="emailBodyOrder" value={editableBody} onChange={(e) => setEditableBody(e.target.value)} rows={8} className="min-h-[150px]" />
                </div>
              </div>
            ) : ( <p className="text-center py-4">Could not load email draft.</p> )}
            <DialogFooter>
              <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
              <Button type="button" onClick={handleSendEmail} disabled={isLoadingEmail || !emailDraft}>
                {isLoadingEmail && <Icon name="Loader2" className="mr-2 h-4 w-4 animate-spin" />}
                Send Email
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
      
      <div style={{ display: 'none' }}>
        {orderToPrint && <PrintableOrder ref={printRef} {...orderToPrint} />}
        {packingSlipToPrint && <PrintableOrderPackingSlip ref={printRef} {...packingSlipToPrint} />}
      </div>

      <LineItemsViewerDialog
        isOpen={isLineItemsViewerOpen}
        onOpenChange={setIsLineItemsViewerOpen}
        lineItems={orderForViewingItems?.lineItems ?? []}
        documentType="Order"
        documentNumber={orderForViewingItems?.orderNumber ?? ''}
        distributor={orderForViewingItems?.distributor}
      />
    </>
  );
}

const FormFieldWrapper: React.FC<{children: React.ReactNode}> = ({ children }) => (
  <div className="space-y-1">{children}</div>
);

    