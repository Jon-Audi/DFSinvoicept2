
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/icons';
import { useAuth } from '@/contexts/auth-context';
import { useFirebase } from '@/components/firebase-provider';
import { collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore';
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import type { Product, Invoice, DashboardPreferences } from '@/types';
import { AnalyticsMetrics } from '@/components/dashboard/analytics-metrics';
import { RevenueChart } from '@/components/dashboard/revenue-chart';
import { TopProducts } from '@/components/dashboard/top-products';

const DEFAULT_PREFERENCES: DashboardPreferences = {
  showLowStockAlert: true,
  showUnpaidInvoices: true,
  showQuickStats: true,
  showQuickActions: true,
  lowStockThreshold: 10,
  showAnalyticsMetrics: true,
  showRevenueChart: true,
  showTopProducts: true,
  defaultChartPeriod: 30,
  defaultTopProductsPeriod: 'all',
};

export default function DashboardPage() {
  const { user } = useAuth();
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

  // Load user preferences (one-time fetch, not real-time)
  useEffect(() => {
    if (!db || !user?.uid) {
      setIsLoadingPreferences(false);
      return;
    }

    const fetchPreferences = async () => {
      try {
        const docRef = doc(db, 'dashboardPreferences', user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setPreferences({ ...DEFAULT_PREFERENCES, ...docSnap.data() } as DashboardPreferences);
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

    fetchPreferences();
  }, [db, user]);

  // Fetch dashboard data (one-time fetch for better performance)
  const fetchDashboardData = useCallback(async () => {
    if (!db || !preferences) return;

    // Fetch all data in parallel for faster loading
    const fetchPromises = [];

    // Order count
    setIsLoadingOrderCount(true);
    fetchPromises.push(
      getDocs(collection(db, 'orders'))
        .then(snapshot => {
          setOrderCount(snapshot.size);
          setIsLoadingOrderCount(false);
        })
        .catch(error => {
          console.error('Error fetching order count:', error);
          setIsLoadingOrderCount(false);
        })
    );

    // Customer count
    setIsLoadingCustomerCount(true);
    fetchPromises.push(
      getDocs(collection(db, 'customers'))
        .then(snapshot => {
          setCustomerCount(snapshot.size);
          setIsLoadingCustomerCount(false);
        })
        .catch(error => {
          console.error('Error fetching customer count:', error);
          setIsLoadingCustomerCount(false);
        })
    );

    // Active estimates count
    setIsLoadingActiveEstimateCount(true);
    const activeEstimatesQuery = query(collection(db, 'estimates'), where('status', 'in', ['Draft', 'Sent']));
    fetchPromises.push(
      getDocs(activeEstimatesQuery)
        .then(snapshot => {
          setActiveEstimateCount(snapshot.size);
          setIsLoadingActiveEstimateCount(false);
        })
        .catch(error => {
          console.error('Error fetching active estimate count:', error);
          setIsLoadingActiveEstimateCount(false);
        })
    );

    // Low stock products
    setIsLoadingLowStock(true);
    fetchPromises.push(
      getDocs(collection(db, 'products'))
        .then(snapshot => {
          const allProducts: Product[] = [];
          snapshot.forEach(docSnap => {
            const product = { ...docSnap.data() as Omit<Product, 'id'>, id: docSnap.id };
            allProducts.push(product);
          });

          const lowStock = allProducts.filter(p =>
            p.quantityInStock !== undefined &&
            p.quantityInStock !== null &&
            p.quantityInStock <= preferences.lowStockThreshold
          ).sort((a, b) => (a.quantityInStock || 0) - (b.quantityInStock || 0));

          setLowStockProducts(lowStock);
          setIsLoadingLowStock(false);
        })
        .catch(error => {
          console.error('Error fetching product data:', error);
          setIsLoadingLowStock(false);
        })
    );

    // Unpaid invoices
    setIsLoadingUnpaidInvoices(true);
    const unpaidInvoicesQuery = query(
      collection(db, 'invoices'),
      where('status', 'in', ['Sent', 'Ordered', 'Partial Packed', 'Packed', 'Ready for pick up', 'Picked up', 'Partially Paid'])
    );
    fetchPromises.push(
      getDocs(unpaidInvoicesQuery)
        .then(snapshot => {
          const invoices: Invoice[] = [];
          snapshot.forEach(docSnap => {
            const invoice = { ...docSnap.data() as Omit<Invoice, 'id'>, id: docSnap.id };
            if (invoice.balanceDue > 0) {
              invoices.push(invoice);
            }
          });

          invoices.sort((a, b) => {
            const dateA = a.dueDate || a.createdAt || '';
            const dateB = b.dueDate || b.createdAt || '';
            return dateA.localeCompare(dateB);
          });

          setUnpaidInvoices(invoices.slice(0, 10));
          setIsLoadingUnpaidInvoices(false);
        })
        .catch(error => {
          console.error('Error fetching unpaid invoices:', error);
          setIsLoadingUnpaidInvoices(false);
        })
    );

    await Promise.all(fetchPromises);
  }, [db, preferences]);

  useEffect(() => {
    if (!isLoadingPreferences) {
      fetchDashboardData();
    }
  }, [isLoadingPreferences, fetchDashboardData]);

  return (
    <>
      <PageHeader title="Dashboard" description="Welcome back! Here's what's happening today." />

      {/* Analytics Metrics */}
      {preferences.showAnalyticsMetrics && (
        <div className="mb-6">
          <AnalyticsMetrics />
        </div>
      )}

      {/* Revenue Chart and Top Products */}
      {(preferences.showRevenueChart || preferences.showTopProducts) && (
        <div className="grid gap-6 mb-6 lg:grid-cols-2">
          {preferences.showRevenueChart && (
            <RevenueChart defaultPeriod={preferences.defaultChartPeriod} />
          )}
          {preferences.showTopProducts && (
            <TopProducts defaultPeriod={preferences.defaultTopProductsPeriod} />
          )}
        </div>
      )}

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
              <p className="text-sm text-muted-foreground py-4">All products are well stocked!</p>
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
                  <Link href="/inventory" className="block" aria-label={`View all ${lowStockProducts.length} low stock items`}>
                    <Button variant="ghost" size="sm" className="w-full mt-2 min-h-[24px]">
                      View all {lowStockProducts.length} items <Icon name="ChevronRight" className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                )}
              </div>
            )}
            <Link href="/inventory" className="block mt-4" aria-label="Manage inventory">
              <Button variant="outline" className="w-full min-h-[24px]">
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
              <p className="text-sm text-muted-foreground py-4">All invoices are paid!</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {unpaidInvoices.map(invoice => {
                  const daysOverdue = invoice.dueDate
                    ? Math.floor((new Date().getTime() - new Date(invoice.dueDate).getTime()) / (1000 * 60 * 60 * 24))
                    : null;
                  const isOverdue = daysOverdue !== null && daysOverdue > 0;

                  return (
                    <Link key={invoice.id} href={`/invoices`} aria-label={`View invoice #${invoice.invoiceNumber} for ${invoice.customerName}`}>
                      <div className="flex items-center justify-between p-2 border rounded hover:bg-muted/50 cursor-pointer min-h-[48px]">
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
            <Link href="/invoices" className="block mt-4" aria-label="View all unpaid invoices">
              <Button variant="outline" className="w-full min-h-[24px]">
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
