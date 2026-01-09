
"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/icons';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CustomerDialog } from '@/components/customers/customer-dialog';
import type { Customer, Estimate, Order, Invoice } from '@/types';
import { useToast } from "@/hooks/use-toast";
import { useFirebase } from '@/components/firebase-provider';
import { collection, doc, onSnapshot, query, where, setDoc } from 'firebase/firestore';
import { customerDisplayName } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
};

const formatDate = (dateString?: string) => {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString();
};

const getStatusBadgeVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
  switch (status) {
    case 'Paid':
    case 'Accepted':
    case 'Picked up':
    case 'Invoiced':
      return 'default';
    case 'Draft':
    case 'Ordered':
      return 'secondary';
    case 'Voided':
    case 'Rejected':
      return 'destructive';
    default:
      return 'outline';
  }
};

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
  const [notFound, setNotFound] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!db || !customerId) {
      setIsLoading(false);
      return;
    }

    const unsubscribes: (() => void)[] = [];
    setIsLoading(true);

    // Fetch customer - don't redirect, just show not found message
    unsubscribes.push(onSnapshot(doc(db, 'customers', customerId), (docSnap) => {
      if (docSnap.exists()) {
        setCustomer({ id: docSnap.id, ...docSnap.data() } as Customer);
        setNotFound(false);
      } else {
        setCustomer(null);
        setNotFound(true);
      }
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching customer:", error);
      setNotFound(true);
      setIsLoading(false);
    }));

    // Fetch related documents
    const collectionsToWatch: Record<string, React.Dispatch<React.SetStateAction<any[]>>> = {
        estimates: setEstimates,
        orders: setOrders,
        invoices: setInvoices,
    };

    for (const [path, setter] of Object.entries(collectionsToWatch)) {
        const q = query(collection(db, path), where('customerId', '==', customerId));
        unsubscribes.push(onSnapshot(q, (snapshot) => {
            const docsData = snapshot.docs.map(d => ({ ...d.data(), id: d.id }));
            setter(docsData);
        }));
    }

    return () => unsubscribes.forEach(unsub => unsub());
  }, [db, customerId]);

  const handleSaveCustomer = async (customerToSave: Omit<Customer, 'id'> & { id?: string }) => {
    if (!db || !customer) return;
    const { id, ...customerData } = { ...customer, ...customerToSave };
    try {
      await setDoc(doc(db, 'customers', id), customerData, { merge: true });
      toast({ title: "Customer Updated", description: "Customer details have been saved." });
    } catch (error) {
      toast({ title: "Error", description: "Could not save customer.", variant: "destructive" });
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center">
        <Icon name="Loader2" className="h-10 w-10 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Loading customer details...</p>
      </div>
    );
  }

  // Not found state
  if (notFound || !customer) {
    return (
      <>
        <PageHeader title="Customer Not Found" description="The requested customer could not be found.">
          <Button variant="outline" onClick={() => router.push('/customers')}>
            <Icon name="ArrowLeft" className="mr-2 h-4 w-4" />
            Back to CRM
          </Button>
        </PageHeader>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Icon name="UserX" className="h-16 w-16 text-muted-foreground mb-4" />
            <p className="text-lg text-muted-foreground">Customer ID: {customerId}</p>
            <p className="text-sm text-muted-foreground mt-2">This customer may have been deleted or the ID is invalid.</p>
          </CardContent>
        </Card>
      </>
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
          <Button variant="outline" onClick={() => router.push('/customers')}>
            <Icon name="ArrowLeft" className="mr-2 h-4 w-4" />
            Back to CRM
          </Button>
          <CustomerDialog
            customer={customer}
            onSave={handleSaveCustomer}
            triggerButton={
              <Button variant="outline">
                <Icon name="Edit" className="mr-2 h-4 w-4" /> Edit Customer
              </Button>
            }
          />
        </div>
      </PageHeader>

      {/* Summary Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-6">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Contact Info</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm"><strong>Phone:</strong> {customer.phone || 'N/A'}</p>
            <p className="text-sm"><strong>Email:</strong> {mainEmail}</p>
            <p className="text-sm"><strong>Type:</strong> {customer.customerType}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Total Invoiced</CardTitle></CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(totalInvoiced)}</p>
            <p className="text-xs text-muted-foreground">{invoices.length} invoices</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Total Paid</CardTitle></CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">{formatCurrency(totalPaid)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Outstanding</CardTitle></CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${outstandingBalance > 0 ? 'text-destructive' : ''}`}>
              {formatCurrency(outstandingBalance)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Address and Notes */}
      {(customer.address || customer.notes) && (
        <Card className="mb-6">
          <CardContent className="grid gap-4 md:grid-cols-2 pt-6">
            {customer.address && (
              <div>
                <h4 className="font-medium mb-2">Address</h4>
                <p className="text-sm text-muted-foreground">
                  {customer.address.street && <>{customer.address.street}<br /></>}
                  {customer.address.city && `${customer.address.city}, `}
                  {customer.address.state} {customer.address.zip}
                </p>
              </div>
            )}
            {customer.notes && (
              <div>
                <h4 className="font-medium mb-2">Notes</h4>
                <p className="text-sm text-muted-foreground">{customer.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tabs for Estimates, Orders, Invoices */}
      <Tabs defaultValue="invoices" className="w-full">
        <TabsList>
          <TabsTrigger value="invoices">Invoices ({invoices.length})</TabsTrigger>
          <TabsTrigger value="orders">Orders ({orders.length})</TabsTrigger>
          <TabsTrigger value="estimates">Estimates ({estimates.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="invoices">
          <Card>
            <CardHeader>
              <CardTitle>Invoices</CardTitle>
              <CardDescription>All invoices for this customer</CardDescription>
            </CardHeader>
            <CardContent>
              {invoices.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No invoices found for this customer.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice #</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="text-right">Balance</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoices
                      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                      .map((invoice) => (
                        <TableRow key={invoice.id}>
                          <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                          <TableCell>{formatDate(invoice.date)}</TableCell>
                          <TableCell>
                            <Badge variant={getStatusBadgeVariant(invoice.status)}>{invoice.status}</Badge>
                          </TableCell>
                          <TableCell className="text-right">{formatCurrency(invoice.total)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(invoice.balanceDue || 0)}</TableCell>
                          <TableCell>
                            <Button variant="ghost" size="sm" onClick={() => router.push(`/invoices?id=${invoice.id}`)}>
                              <Icon name="ExternalLink" className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="orders">
          <Card>
            <CardHeader>
              <CardTitle>Orders</CardTitle>
              <CardDescription>All orders for this customer</CardDescription>
            </CardHeader>
            <CardContent>
              {orders.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No orders found for this customer.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order #</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="text-right">Balance</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders
                      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                      .map((order) => (
                        <TableRow key={order.id}>
                          <TableCell className="font-medium">{order.orderNumber}</TableCell>
                          <TableCell>{formatDate(order.date)}</TableCell>
                          <TableCell>
                            <Badge variant={getStatusBadgeVariant(order.status)}>{order.status}</Badge>
                          </TableCell>
                          <TableCell className="text-right">{formatCurrency(order.total)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(order.balanceDue || 0)}</TableCell>
                          <TableCell>
                            <Button variant="ghost" size="sm" onClick={() => router.push(`/orders?id=${order.id}`)}>
                              <Icon name="ExternalLink" className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="estimates">
          <Card>
            <CardHeader>
              <CardTitle>Estimates</CardTitle>
              <CardDescription>All estimates for this customer</CardDescription>
            </CardHeader>
            <CardContent>
              {estimates.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No estimates found for this customer.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Estimate #</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {estimates
                      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                      .map((estimate) => (
                        <TableRow key={estimate.id}>
                          <TableCell className="font-medium">{estimate.estimateNumber}</TableCell>
                          <TableCell>{formatDate(estimate.date)}</TableCell>
                          <TableCell>
                            <Badge variant={getStatusBadgeVariant(estimate.status)}>{estimate.status}</Badge>
                          </TableCell>
                          <TableCell className="text-right">{formatCurrency(estimate.total)}</TableCell>
                          <TableCell>
                            <Button variant="ghost" size="sm" onClick={() => router.push(`/estimates?id=${estimate.id}`)}>
                              <Icon name="ExternalLink" className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </>
  );
}
