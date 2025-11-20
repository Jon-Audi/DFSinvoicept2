
"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/icons';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CustomerDialog } from '@/components/customers/customer-dialog';
import { EstimateDialog } from '@/components/estimates/estimate-dialog';
import { OrderDialog } from '@/components/orders/order-dialog';
import { InvoiceDialog } from '@/components/invoices/invoice-dialog';
import type { Customer, Estimate, Order, Invoice, Product, Vendor } from '@/types';
import { useToast } from "@/hooks/use-toast";
import { useFirebase } from '@/components/firebase-provider';
import { collection, doc, onSnapshot, query, where, addDoc, setDoc } from 'firebase/firestore';
import { customerDisplayName } from '@/lib/utils';
import { EstimateTable } from '@/components/estimates/estimate-table';
import { OrderTable } from '@/components/orders/order-table';
import { InvoiceTable } from '@/components/invoices/invoice-table';

export default function CustomerDetailPage() {
  const { db } = useFirebase();
  const { toast } = useToast();
  const router = useRouter();
  const params = useParams();
  const customerId = params.customerId as string;

  // State for all data
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [estimates, setEstimates] = useState<Estimate[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [productCategories, setProductCategories] = useState<string[]>([]);
  const [productSubcategories, setProductSubcategories] = useState<string[]>([]);
  
  // Loading states
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!db || !customerId) return;

    const unsubscribes: (() => void)[] = [];
    setIsLoading(true);

    // Fetch customer
    unsubscribes.push(onSnapshot(doc(db, 'customers', customerId), (docSnap) => {
      if (docSnap.exists()) {
        setCustomer({ id: docSnap.id, ...docSnap.data() } as Customer);
      } else {
        toast({ title: "Error", description: "Customer not found.", variant: "destructive" });
        router.push('/customers');
      }
    }));

    // Fetch related documents
    const collectionsToWatch = {
        estimates: setEstimates,
        orders: setOrders,
        invoices: setInvoices,
    };
    
    for (const [path, setter] of Object.entries(collectionsToWatch)) {
        const q = query(collection(db, path), where('customerId', '==', customerId));
        unsubscribes.push(onSnapshot(q, (snapshot) => {
            const docsData = snapshot.docs.map(d => ({ ...d.data(), id: d.id })) as any[];
            setter(docsData);
        }));
    }

    // Fetch products and vendors (needed for dialogs)
     unsubscribes.push(onSnapshot(collection(db, 'products'), (snapshot) => {
      const fetchedProducts: Product[] = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Product));
      setProducts(fetchedProducts);
      const categories = Array.from(new Set(fetchedProducts.map(p => p.category))).sort();
      const subcategories = Array.from(new Set(fetchedProducts.map(p => p.subcategory).filter(Boolean) as string[])).sort();
      setProductCategories(categories);
      setProductSubcategories(subcategories);
    }));

    unsubscribes.push(onSnapshot(collection(db, 'vendors'), (snapshot) => {
        setVendors(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Vendor)));
    }));

    // Simple loading complete detection
    const timer = setTimeout(() => setIsLoading(false), 1500); // Give snapshots time to load
    unsubscribes.push(() => clearTimeout(timer));

    return () => unsubscribes.forEach(unsub => unsub());

  }, [db, customerId, router, toast]);

  const handleSaveCustomer = async (customerToSave: Omit<Customer, 'id'> & { id?: string }) => {
    if (!db || !customer) return;
    const { id, ...customerData } = { ...customer, ...customerToSave };
    try {
      await setDoc(doc(db, 'customers', id), customerData, { merge: true });
      toast({ title: "Customer Updated", description: "Customer details have been saved." });
    } catch (error) {
      console.error("Error saving customer:", error);
      toast({ title: "Error", description: "Could not save customer.", variant: "destructive" });
    }
  };

  const handleSaveDocument = async (docType: 'estimates' | 'orders' | 'invoices', data: any) => {
    if (!db) return;
    try {
        if (data.id) {
            await setDoc(doc(db, docType, data.id), data, { merge: true });
        } else {
            await addDoc(collection(db, docType), data);
        }
        toast({ title: `${docType.slice(0,1).toUpperCase()}${docType.slice(1,-1)} Saved`, description: `The document has been saved successfully.` });
    } catch (error) {
         toast({ title: "Error", description: `Could not save document.`, variant: "destructive" });
    }
  }


  if (isLoading || !customer) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-6">
        <Icon name="Loader2" className="h-10 w-10 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Loading customer details...</p>
      </div>
    );
  }

  const mainEmail = customer.emailContacts?.find(e => e.type === 'Main Contact')?.email || customer.emailContacts?.[0]?.email || 'N/A';
  const totalInvoiced = invoices.reduce((sum, inv) => sum + inv.total, 0);
  const totalPaid = invoices.reduce((sum, inv) => sum + (inv.amountPaid || 0), 0);
  const outstandingBalance = totalInvoiced - totalPaid;

  return (
    <>
      <PageHeader title={customerDisplayName(customer)} description={`Manage all details and documents for ${customerDisplayName(customer)}.`}>
        <div className="flex gap-2">
            <CustomerDialog
                customer={customer}
                onSave={handleSaveCustomer}
                triggerButton={
                    <Button variant="outline">
                        <Icon name="Edit" className="mr-2 h-4 w-4" /> Edit Customer
                    </Button>
                }
            />
            <EstimateDialog
                onSave={(data) => handleSaveDocument('estimates', data)}
                onSaveProduct={() => Promise.resolve('')}
                onSaveCustomer={async (c) => { await handleSaveCustomer(c); return c.id || ''; }}
                customers={[customer]}
                products={products}
                productCategories={productCategories}
                productSubcategories={productSubcategories}
                initialData={{ customerId: customer.id }}
                triggerButton={
                     <Button>
                        <Icon name="PlusCircle" className="mr-2 h-4 w-4" /> New Estimate
                    </Button>
                }
            />
        </div>
      </PageHeader>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-6">
        <Card>
            <CardHeader><CardTitle>Contact Info</CardTitle></CardHeader>
            <CardContent>
                <p><strong>Phone:</strong> {customer.phone || 'N/A'}</p>
                <p><strong>Email:</strong> {mainEmail}</p>
            </CardContent>
        </Card>
         <Card>
            <CardHeader><CardTitle>Total Invoiced</CardTitle></CardHeader>
            <CardContent>
                <p className="text-2xl font-bold">${totalInvoiced.toFixed(2)}</p>
            </CardContent>
        </Card>
        <Card>
            <CardHeader><CardTitle>Total Paid</CardTitle></CardHeader>
            <CardContent>
                <p className="text-2xl font-bold text-green-600">${totalPaid.toFixed(2)}</p>
            </CardContent>
        </Card>
        <Card>
            <CardHeader><CardTitle>Outstanding</CardTitle></CardHeader>
            <CardContent>
                <p className="text-2xl font-bold text-destructive">${outstandingBalance.toFixed(2)}</p>
            </CardContent>
        </Card>
      </div>

       <Tabs defaultValue="estimates" className="w-full">
        <TabsList>
            <TabsTrigger value="estimates">Estimates ({estimates.length})</TabsTrigger>
            <TabsTrigger value="orders">Orders ({orders.length})</TabsTrigger>
            <TabsTrigger value="invoices">Invoices ({invoices.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="estimates">
            <Card>
                <CardHeader>
                    <CardTitle>Estimates</CardTitle>
                    <CardDescription>All estimates associated with this customer.</CardDescription>
                </CardHeader>
                <CardContent>
                    <EstimateTable 
                        estimates={estimates} 
                        customers={customers}
                        products={products}
                        productCategories={productCategories}
                        productSubcategories={productSubcategories}
                        onSave={(data) => handleSaveDocument('estimates', data)}
                        onDelete={()=>{}}
                        onGenerateEmail={()=>{}}
                        onPrint={()=>{}}
                        onConvertToInvoice={()=>{}}
                        onConvertToOrder={()=>{}}
                        formatDate={(d) => d ? new Date(d).toLocaleDateString() : ''}
                        onViewItems={()=>{}}
                        onSaveProduct={() => Promise.resolve('')}
                        onSaveCustomer={async (c) => { await handleSaveCustomer(c); return c.id || ''; }}
                        requestSort={()=>{}}
                        sortConfig={{key: 'date', direction: 'desc'}}
                        renderSortArrow={() => null}
                    />
                </CardContent>
            </Card>
        </TabsContent>
        <TabsContent value="orders">
             <Card>
                <CardHeader>
                    <CardTitle>Orders</CardTitle>
                    <CardDescription>All orders associated with this customer.</CardDescription>
                </CardHeader>
                <CardContent>
                    <OrderTable 
                        orders={orders}
                        customers={customers}
                        products={products}
                        vendors={vendors}
                        productCategories={productCategories}
                        productSubcategories={productSubcategories}
                        onSave={(data) => handleSaveDocument('orders', data)}
                        onDelete={()=>{}}
                        onGenerateEmail={()=>{}}
                        onPrint={()=>{}}
                        onPrintPackingSlip={()=>{}}
                        onConvertToInvoice={()=>{}}
                        formatDate={(d) => d ? new Date(d).toLocaleDateString() : ''}
                        onViewItems={()=>{}}
                        onSaveProduct={() => Promise.resolve('')}
                        onSaveCustomer={async (c) => { await handleSaveCustomer(c); return c.id || ''; }}
                        requestSort={()=>{}}
                        sortConfig={{key: 'date', direction: 'desc'}}
                        renderSortArrow={() => null}
                    />
                </CardContent>
            </Card>
        </TabsContent>
        <TabsContent value="invoices">
             <Card>
                <CardHeader>
                    <CardTitle>Invoices</CardTitle>
                    <CardDescription>All invoices associated with this customer.</CardDescription>
                </CardHeader>
                <CardContent>
                    <InvoiceTable 
                        invoices={invoices}
                        customers={customers}
                        products={products}
                        vendors={vendors}
                        productCategories={productCategories}
                        productSubcategories={productSubcategories}
                        onSave={(data) => handleSaveDocument('invoices', data)}
                        onDelete={()=>{}}
                        onGenerateEmail={()=>{}}
                        onPrint={()=>{}}
                        onPrintPackingSlip={()=>{}}
                        onSendToPacking={()=>{}}
                        formatDate={(d) => d ? new Date(d).toLocaleDateString() : ''}
                        onViewItems={()=>{}}
                        onSaveProduct={() => Promise.resolve('')}
                        onSaveCustomer={async (c) => { await handleSaveCustomer(c as Customer); return c.id || ''; }}
                        requestSort={()=>{}}
                        sortConfig={{key: 'date', direction: 'desc'}}
                        renderSortArrow={() => null}
                    />
                </CardContent>
            </Card>
        </TabsContent>
      </Tabs>
    </>
  );
}

// Dummy EstimateTable for compilation
const EstimateTable = ({ estimates }: { estimates: Estimate[] }) => (
    <p>{estimates.length} estimates found.</p>
);
