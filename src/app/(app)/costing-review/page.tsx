
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { PageHeader } from '@/components/page-header';
import { Icon } from '@/components/icons';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { Order, Invoice, Customer, Product, LineItem, Vendor } from '@/types';
import { useToast } from "@/hooks/use-toast";
import { useFirebase } from '@/components/firebase-provider';
import { collection, onSnapshot, doc, runTransaction, getDocs } from 'firebase/firestore';
import { OrderDialog } from '@/components/orders/order-dialog';
import { InvoiceDialog } from '@/components/invoices/invoice-dialog';
import { ALL_CATEGORIES_MARKUP_KEY } from '@/lib/constants';

// A unified type for displaying documents in the review list.
type ReviewableDocument = (Order | Invoice) & { docType: 'Order' | 'Invoice' };

export default function CostingReviewPage() {
  const { db } = useFirebase();
  const [orders, setOrders] = useState<Order[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [productCategories, setProductCategories] = useState<string[]>([]);
  const [productSubcategories, setProductSubcategories] = useState<string[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState<string | null>(null); // For loading state on auto-cost button
  const { toast } = useToast();

  const [editingDoc, setEditingDoc] = useState<ReviewableDocument | null>(null);

  useEffect(() => {
    if (!db) return;
    const unsubscribes: (() => void)[] = [];
    setIsLoading(true);

    // Load reference data once (customers, vendors, products)
    const loadReferenceData = async () => {
      try {
        const [customersSnap, vendorsSnap, productsSnap] = await Promise.all([
          getDocs(collection(db, 'customers')),
          getDocs(collection(db, 'vendors')),
          getDocs(collection(db, 'products')),
        ]);

        setCustomers(customersSnap.docs.map(doc => ({ ...doc.data(), id: doc.id } as Customer)));
        setVendors(vendorsSnap.docs.map(doc => ({ ...doc.data(), id: doc.id } as Vendor)));
        
        const products = productsSnap.docs.map(doc => ({ ...doc.data(), id: doc.id } as Product));
        setProducts(products);
        const categories = Array.from(new Set(products.map(p => p.category))).sort();
        setProductCategories(categories);
        const subcategories = Array.from(new Set(products.map(p => p.subcategory).filter(Boolean) as string[])).sort();
        setProductSubcategories(subcategories);
      } catch (error) {
        toast({ title: "Error", description: "Could not load reference data.", variant: "destructive" });
      }
    };

    // Real-time listeners for frequently updated data
    unsubscribes.push(
      onSnapshot(collection(db, 'orders'), (snapshot) => {
        setOrders(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Order)));
      }, (error) => {
        toast({ title: "Error", description: "Could not fetch orders.", variant: "destructive" });
      })
    );

    unsubscribes.push(
      onSnapshot(collection(db, 'invoices'), (snapshot) => {
        setInvoices(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Invoice)));
        setIsLoading(false); // Set loading false after the last real-time data loads
      }, (error) => {
        toast({ title: "Error", description: "Could not fetch invoices.", variant: "destructive" });
        setIsLoading(false);
      })
    );

    loadReferenceData();

    return () => unsubscribes.forEach(unsub => unsub());
  }, [db, toast]);

  const documentsToReview = useMemo((): ReviewableDocument[] => {
    const docs: ReviewableDocument[] = [];
    // Only non-stock items missing cost; skip returns (cost not meaningful for accounting)
    const hasMissingCost = (item: LineItem) =>
      item.isNonStock && !item.isReturn && (!item.cost || item.cost === 0);

    orders.forEach(order => {
      // Skip voided orders — no point costing them
      if (order.status === 'Voided') return;
      if (order.lineItems.some(hasMissingCost)) {
        docs.push({ ...order, docType: 'Order' });
      }
    });

    invoices.forEach(invoice => {
      // Skip voided invoices
      if (invoice.status === 'Voided') return;
      if (invoice.lineItems.some(hasMissingCost)) {
        docs.push({ ...invoice, docType: 'Invoice' });
      }
    });

    return docs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [orders, invoices]);
  
  const handleSaveOrder = async (order: Order) => {
    if (!db) return;
    setIsProcessing(order.id);
    try {
      await runTransaction(db, async (transaction) => {
          // Strip the synthetic docType field before writing to Firestore
          const { id, ...orderData } = order;
          const { docType: _docType, ...cleanOrderData } = orderData as any;
          const orderRef = doc(db, 'orders', id);
          transaction.set(orderRef, cleanOrderData, { merge: true });
      });
      toast({ title: "Order Updated", description: `Order #${(order as any).orderNumber} has been updated.` });
      if (editingDoc?.id === order.id) setEditingDoc(null);
    } catch (error) {
       toast({ title: "Error", description: "Could not save order.", variant: "destructive" });
    } finally {
      setIsProcessing(null);
    }
  };

  const handleSaveInvoice = async (invoice: Invoice) => {
    if (!db) return;
    setIsProcessing(invoice.id);
    try {
      await runTransaction(db, async (transaction) => {
          // Strip the synthetic docType field before writing to Firestore
          const { id, ...invoiceData } = invoice;
          const { docType: _docType, ...cleanInvoiceData } = invoiceData as any;
          const invoiceRef = doc(db, 'invoices', id);
          transaction.set(invoiceRef, cleanInvoiceData, { merge: true });
      });
      toast({ title: "Invoice Updated", description: `Invoice #${(invoice as any).invoiceNumber} has been updated.` });
      if (editingDoc?.id === invoice.id) setEditingDoc(null);
    } catch (error) {
       toast({ title: "Error", description: "Could not save invoice.", variant: "destructive" });
    } finally {
      setIsProcessing(null);
    }
  };

  const handleAutoCost = async (docToCost: ReviewableDocument) => {
    const customer = customers.find(c => c.id === docToCost.customerId);
    if (!customer) {
        toast({ title: "Customer not found", description: "Cannot auto-cost without customer data.", variant: "destructive"});
        return;
    }

    const DEFAULT_MARKUP_PERCENT = 35; // Default markup if no specific rule applies.

    const getMarkupForCategory = (categoryName?: string): number => {
        const specificRule = customer.specificMarkups?.find(m => m.categoryName === categoryName);
        const allCategoriesRule = customer.specificMarkups?.find(m => m.categoryName === ALL_CATEGORIES_MARKUP_KEY);

        if (specificRule) return specificRule.markupPercentage;
        if (allCategoriesRule) return allCategoriesRule.markupPercentage;
        return DEFAULT_MARKUP_PERCENT;
    };
    
    const updatedLineItems = docToCost.lineItems.map(item => {
      // Skip return items and items that already have a cost
      if (item.isNonStock && !item.isReturn && (!item.cost || item.cost === 0)) {
        const product = products.find(p => p.id === item.productId);
        const categoryForMarkup = item.newProductCategory || product?.category || undefined;

        const markupPercent = getMarkupForCategory(categoryForMarkup);
        const divisor = 1 + markupPercent / 100;

        // Guard against divide-by-zero (e.g. markup = -100%)
        if (divisor <= 0) {
          toast({ title: "Auto-Cost Warning", description: `Skipped an item — markup of ${markupPercent}% would result in invalid cost.`, variant: "destructive" });
          return item;
        }

        const calculatedCost = item.unitPrice / divisor;

        return {
          ...item,
          cost: parseFloat(calculatedCost.toFixed(2)),
          markupPercentage: markupPercent,
        };
      }
      return item;
    });
    
    // Create a new document object with the updated line items to be saved.
    const updatedDoc = {
        ...docToCost,
        lineItems: updatedLineItems,
    };
    
    // Call the appropriate save function.
    if (updatedDoc.docType === 'Order') {
        await handleSaveOrder(updatedDoc as Order);
    } else {
        await handleSaveInvoice(updatedDoc as Invoice);
    }
  };


  if (isLoading) {
    return (
      <PageHeader title="Costing Review" description="Finding documents needing attention...">
        <div className="flex items-center justify-center h-32">
          <Icon name="Loader2" className="h-8 w-8 animate-spin" />
        </div>
      </PageHeader>
    );
  }

  return (
    <>
      <PageHeader title="Costing Review" description="Orders & Invoices with non-stock items missing a cost." />
      <Card>
        <CardHeader>
          <CardTitle>Documents Requiring Costing</CardTitle>
          <CardDescription>
            The following documents contain non-stock items that do not have a cost associated. 
            Edit them manually or use the "Auto-Cost" feature to calculate costs based on customer markup.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Number</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-center">Items Missing Cost</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {documentsToReview.length > 0 ? documentsToReview.map((doc) => {
                const missingCount = doc.lineItems.filter(
                  item => item.isNonStock && !item.isReturn && (!item.cost || item.cost === 0)
                ).length;
                const isFinalized = (doc as Invoice).isFinalized === true;
                return (
                <TableRow key={doc.id}>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <Badge variant={doc.docType === 'Order' ? 'secondary' : 'outline'}>
                        {doc.docType}
                      </Badge>
                      {isFinalized && (
                        <Badge variant="outline" className="text-orange-600 border-orange-300 text-xs w-fit">
                          <Icon name="Lock" className="mr-1 h-3 w-3" />Finalized
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{(doc as Order).orderNumber || (doc as Invoice).invoiceNumber}</TableCell>
                  <TableCell>{doc.customerName}</TableCell>
                  <TableCell>{new Date(doc.date).toLocaleDateString()}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant="destructive" className="text-xs">
                      {missingCount} {missingCount === 1 ? 'item' : 'items'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button variant="secondary" size="sm" onClick={() => handleAutoCost(doc)} disabled={isProcessing === doc.id}>
                      {isProcessing === doc.id ? <Icon name="Loader2" className="mr-2 h-4 w-4 animate-spin" /> : <Icon name="Calculator" className="mr-2 h-4 w-4" />}
                      Auto-Cost
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setEditingDoc(doc)} disabled={!!isProcessing}>
                      <Icon name="Edit" className="mr-2 h-4 w-4" /> Edit
                    </Button>
                  </TableCell>
                </TableRow>
                );
              }) : (
                <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground p-6">
                        No documents require costing at this time.
                    </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      {editingDoc?.docType === 'Order' && (
        <OrderDialog
            isOpen={!!editingDoc && editingDoc.docType === 'Order'}
            onOpenChange={() => setEditingDoc(null)}
            order={editingDoc as Order}
            onSave={handleSaveOrder}
            onSaveProduct={() => Promise.resolve()}
            onSaveCustomer={() => Promise.resolve()}
            customers={customers}
            products={products}
            vendors={vendors}
            productCategories={productCategories}
            productSubcategories={productSubcategories}
        />
      )}
      
       {editingDoc?.docType === 'Invoice' && (
        <InvoiceDialog
            isOpen={!!editingDoc && editingDoc.docType === 'Invoice'}
            onOpenChange={() => setEditingDoc(null)}
            invoice={editingDoc as Invoice}
            onSave={handleSaveInvoice}
            onSaveProduct={() => Promise.resolve()}
            onSaveCustomer={() => Promise.resolve()}
            customers={customers}
            products={products}
            vendors={vendors}
            productCategories={productCategories}
            productSubcategories={productSubcategories}
        />
      )}
    </>
  );
}
