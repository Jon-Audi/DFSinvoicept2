
"use client";

import React, { useState, useEffect } from 'react';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/icons';
import { useAuth } from '@/contexts/auth-context';
import { useFirebase } from '@/components/firebase-provider';
import { collection, onSnapshot, query, where, doc, getDoc } from 'firebase/firestore';
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import type { Product, Invoice, DashboardPreferences } from '@/types';

const DEFAULT_PREFERENCES: DashboardPreferences = {
  showLowStockAlert: true,
  showUnpaidInvoices: true,
  showQuickStats: true,
  showQuickActions: true,
  lowStockThreshold: 10,
};

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const { db } = useFirebase();
  const { toast } = useToast();
  const [preferences, setPreferences] = useState<DashboardPreferences>(DEFAULT_PREFERENCES);
  const [isLoadingPreferences, setIsLoadingPreferences] = useState(true);
  const [orderCount, setOrderCount] = useState<number | null>(null);
  const [isLoadingOrderCount, setIsLoadingOrderCount] = useState(true);
  const [customerCount, setCustomerCount] = useState<number | null>(null);
  const [isLoadingCustomerCount, setIsLoadingCustomerCount] = useState(true);
  const [activeEstimateCount, setActiveEstimateCount] = useState<number | null>(null);
  const [isLoadingActiveEstimateCount, setIsLoadingActiveEstimateCount] = useState(true);
  const [lowStockProducts, setLowStockProducts] = useState<Product[]>([]);
  const [isLoadingLowStock, setIsLoadingLowStock] = useState(true);
  const [unpaidInvoices, setUnpaidInvoices] = useState<Invoice[]>([]);
  const [isLoadingUnpaidInvoices, setIsLoadingUnpaidInvoices] = useState(true);

  // Load user preferences
  useEffect(() => {
    if (!db || !user?.id) {
      setIsLoadingPreferences(false);
      return;
    }

    const loadPreferences = async () => {
      try {
        const docRef = doc(db, 'dashboardPreferences', user.id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          setPreferences(docSnap.data() as DashboardPreferences);
        } else {
          setPreferences(DEFAULT_PREFERENCES);
        }
      } catch (error) {
        console.error('Error loading dashboard preferences:', error);
        setPreferences(DEFAULT_PREFERENCES);
      } finally {
        setIsLoadingPreferences(false);
      }
    };

    loadPreferences();
  }, [db, user]);

  useEffect(() => {
    if (!db || !preferences) return;
    setIsLoadingOrderCount(true);
    const unsubscribeOrders = onSnapshot(collection(db, 'orders'), (snapshot) => {
      setOrderCount(snapshot.size);
      setIsLoadingOrderCount(false);
    }, (error) => {
      toast({
        title: "Error",
        description: "Could not fetch order count.",
        variant: "destructive",
      });
      setIsLoadingOrderCount(false);
    });

    setIsLoadingCustomerCount(true);
    const unsubscribeCustomers = onSnapshot(collection(db, 'customers'), (snapshot) => {
      setCustomerCount(snapshot.size);
      setIsLoadingCustomerCount(false);
    }, (error) => {
      toast({
        title: "Error",
        description: "Could not fetch customer count.",
        variant: "destructive",
      });
      setIsLoadingCustomerCount(false);
    });

    setIsLoadingActiveEstimateCount(true);
    const activeEstimatesQuery = query(collection(db, 'estimates'), where('status', 'in', ['Draft', 'Sent']));
    const unsubscribeActiveEstimates = onSnapshot(activeEstimatesQuery, (snapshot) => {
      setActiveEstimateCount(snapshot.size);
      setIsLoadingActiveEstimateCount(false);
    }, (error) => {
      toast({
        title: "Error",
        description: "Could not fetch active estimate count.",
        variant: "destructive",
      });
      setIsLoadingActiveEstimateCount(false);
    });

    // Subscribe to products for low stock alerts
    setIsLoadingLowStock(true);
    const unsubscribeProducts = onSnapshot(collection(db, 'products'), (snapshot) => {
      const allProducts: Product[] = [];
      snapshot.forEach(docSnap => {
        const product = { ...docSnap.data() as Omit<Product, 'id'>, id: docSnap.id };
        allProducts.push(product);
      });

      // Filter for low stock items (where quantityInStock exists and is below threshold)
      const lowStock = allProducts.filter(p =>
        p.quantityInStock !== undefined &&
        p.quantityInStock !== null &&
        p.quantityInStock <= preferences.lowStockThreshold
      ).sort((a, b) => (a.quantityInStock || 0) - (b.quantityInStock || 0));

      setLowStockProducts(lowStock);
      setIsLoadingLowStock(false);
    }, (error) => {
      toast({
        title: "Error",
        description: "Could not fetch product data.",
        variant: "destructive",
      });
      setIsLoadingLowStock(false);
    });

    // Subscribe to unpaid/partially paid invoices
    setIsLoadingUnpaidInvoices(true);
    const unpaidInvoicesQuery = query(
      collection(db, 'invoices'),
      where('status', 'in', ['Sent', 'Ordered', 'Partial Packed', 'Packed', 'Ready for pick up', 'Picked up', 'Partially Paid'])
    );
    const unsubscribeUnpaidInvoices = onSnapshot(unpaidInvoicesQuery, (snapshot) => {
      const invoices: Invoice[] = [];
      snapshot.forEach(docSnap => {
        const invoice = { ...docSnap.data() as Omit<Invoice, 'id'>, id: docSnap.id };
        if (invoice.balanceDue > 0) {
          invoices.push(invoice);
        }
      });

      // Sort by due date (oldest first) or created date if no due date
      invoices.sort((a, b) => {
        const dateA = a.dueDate || a.createdAt || '';
        const dateB = b.dueDate || b.createdAt || '';
        return dateA.localeCompare(dateB);
      });

      setUnpaidInvoices(invoices.slice(0, 10)); // Show top 10 oldest
      setIsLoadingUnpaidInvoices(false);
    }, (error) => {
      toast({
        title: "Error",
        description: "Could not fetch unpaid invoices.",
        variant: "destructive",
      });
      setIsLoadingUnpaidInvoices(false);
    });

    return () => {
      unsubscribeOrders();
      unsubscribeCustomers();
      unsubscribeActiveEstimates();
      unsubscribeProducts();
      unsubscribeUnpaidInvoices();
    };
  }, [db, toast, preferences.lowStockThreshold]);

  return (
    <>
      <PageHeader title="Dashboard" description="Welcome back! Here's what's happening today." />

      {/* Quick Stats */}
      {preferences.showQuickStats && (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <Icon name="ShoppingCart" className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoadingOrderCount ? (
              <Skeleton className="h-8 w-1/2" />
            ) : (
              <div className="text-2xl font-bold">{orderCount ?? 'N/A'}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
            <Icon name="Users" className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoadingCustomerCount ? (
              <Skeleton className="h-8 w-1/2" />
            ) : (
              <div className="text-2xl font-bold">{customerCount ?? 'N/A'}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Estimates</CardTitle>
            <Icon name="FileText" className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoadingActiveEstimateCount ? (
              <Skeleton className="h-8 w-1/2" />
            ) : (
              <div className="text-2xl font-bold">{activeEstimateCount ?? 'N/A'}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unpaid Invoices</CardTitle>
            <Icon name="AlertCircle" className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            {isLoadingUnpaidInvoices ? (
              <Skeleton className="h-8 w-1/2" />
            ) : (
              <div className="text-2xl font-bold text-destructive">{unpaidInvoices.length}</div>
            )}
          </CardContent>
        </Card>
      </div>
      )}

      {/* Alert Widgets */}
      {(preferences.showLowStockAlert || preferences.showUnpaidInvoices) && (
      <div className={`grid gap-6 mb-6 ${preferences.showLowStockAlert && preferences.showUnpaidInvoices ? 'md:grid-cols-2' : 'md:grid-cols-1'}`}>
        {/* Low Stock Alert */}
        {preferences.showLowStockAlert && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Icon name="AlertTriangle" className="h-5 w-5 text-yellow-600" />
              Low Stock Alert
              {!isLoadingLowStock && lowStockProducts.length > 0 && (
                <Badge variant="destructive" className="ml-auto">{lowStockProducts.length}</Badge>
              )}
            </CardTitle>
            <CardDescription>Products running low on inventory</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingLowStock ? (
              <div className="space-y-2">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : lowStockProducts.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">All products are well stocked! ✓</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {lowStockProducts.slice(0, 10).map(product => (
                  <div key={product.id} className="flex items-center justify-between p-2 border rounded hover:bg-muted/50">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{product.name}</p>
                      <p className="text-xs text-muted-foreground">{product.category}</p>
                    </div>
                    <Badge variant={product.quantityInStock === 0 ? "destructive" : "secondary"}>
                      {product.quantityInStock || 0} {product.unit}
                    </Badge>
                  </div>
                ))}
                {lowStockProducts.length > 10 && (
                  <Link href="/inventory" className="block">
                    <Button variant="ghost" size="sm" className="w-full mt-2">
                      View all {lowStockProducts.length} items <Icon name="ChevronRight" className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                )}
              </div>
            )}
            <Link href="/inventory" className="block mt-4">
              <Button variant="outline" className="w-full">
                Manage Inventory <Icon name="ChevronRight" className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
        )}

        {/* Unpaid Invoices Widget */}
        {preferences.showUnpaidInvoices && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Icon name="DollarSign" className="h-5 w-5 text-green-600" />
              Unpaid Invoices
              {!isLoadingUnpaidInvoices && unpaidInvoices.length > 0 && (
                <Badge variant="default" className="ml-auto">{unpaidInvoices.length}</Badge>
              )}
            </CardTitle>
            <CardDescription>Invoices awaiting payment</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingUnpaidInvoices ? (
              <div className="space-y-2">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : unpaidInvoices.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">All invoices are paid! ✓</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {unpaidInvoices.map(invoice => {
                  const daysOverdue = invoice.dueDate
                    ? Math.floor((new Date().getTime() - new Date(invoice.dueDate).getTime()) / (1000 * 60 * 60 * 24))
                    : null;
                  const isOverdue = daysOverdue !== null && daysOverdue > 0;

                  return (
                    <Link key={invoice.id} href={`/invoices`}>
                      <div className="flex items-center justify-between p-2 border rounded hover:bg-muted/50 cursor-pointer">
                        <div className="flex-1">
                          <p className="font-medium text-sm">Invoice #{invoice.invoiceNumber}</p>
                          <p className="text-xs text-muted-foreground">{invoice.customerName}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-sm">${invoice.balanceDue.toFixed(2)}</p>
                          {isOverdue && (
                            <Badge variant="destructive" className="text-xs">
                              {daysOverdue}d overdue
                            </Badge>
                          )}
                          {!isOverdue && invoice.dueDate && (
                            <p className="text-xs text-muted-foreground">
                              Due {new Date(invoice.dueDate).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
            <Link href="/invoices" className="block mt-4">
              <Button variant="outline" className="w-full">
                View All Invoices <Icon name="ChevronRight" className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
        )}
      </div>
      )}

      {/* Quick Actions */}
      {preferences.showQuickActions && (
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Navigate to key areas of your business</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <Link href="/orders" className="group">
              <div className="flex items-center gap-3 p-4 border rounded-lg hover:border-primary hover:shadow-md transition-all">
                <Icon name="ShoppingCart" className="h-8 w-8 text-primary" />
                <div>
                  <p className="font-medium group-hover:text-primary">Orders</p>
                  <p className="text-sm text-muted-foreground">Manage orders</p>
                </div>
              </div>
            </Link>

            <Link href="/estimates" className="group">
              <div className="flex items-center gap-3 p-4 border rounded-lg hover:border-primary hover:shadow-md transition-all">
                <Icon name="FileText" className="h-8 w-8 text-primary" />
                <div>
                  <p className="font-medium group-hover:text-primary">Estimates</p>
                  <p className="text-sm text-muted-foreground">Create quotes</p>
                </div>
              </div>
            </Link>

            <Link href="/products" className="group">
              <div className="flex items-center gap-3 p-4 border rounded-lg hover:border-primary hover:shadow-md transition-all">
                <Icon name="Package" className="h-8 w-8 text-primary" />
                <div>
                  <p className="font-medium group-hover:text-primary">Products</p>
                  <p className="text-sm text-muted-foreground">Manage catalog</p>
                </div>
              </div>
            </Link>

            <Link href="/customers" className="group">
              <div className="flex items-center gap-3 p-4 border rounded-lg hover:border-primary hover:shadow-md transition-all">
                <Icon name="Users" className="h-8 w-8 text-primary" />
                <div>
                  <p className="font-medium group-hover:text-primary">Customers</p>
                  <p className="text-sm text-muted-foreground">View contacts</p>
                </div>
              </div>
            </Link>

            <Link href="/reports" className="group">
              <div className="flex items-center gap-3 p-4 border rounded-lg hover:border-primary hover:shadow-md transition-all">
                <Icon name="BarChart3" className="h-8 w-8 text-primary" />
                <div>
                  <p className="font-medium group-hover:text-primary">Reports</p>
                  <p className="text-sm text-muted-foreground">View analytics</p>
                </div>
              </div>
            </Link>

            <Link href="/settings" className="group">
              <div className="flex items-center gap-3 p-4 border rounded-lg hover:border-primary hover:shadow-md transition-all">
                <Icon name="Settings" className="h-8 w-8 text-primary" />
                <div>
                  <p className="font-medium group-hover:text-primary">Settings</p>
                  <p className="text-sm text-muted-foreground">Configure app</p>
                </div>
              </div>
            </Link>
          </div>
        </CardContent>
      </Card>
      )}
    </>
  );
}
