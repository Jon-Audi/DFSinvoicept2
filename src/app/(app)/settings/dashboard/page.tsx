"use client";

import React, { useState, useEffect } from 'react';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useFirebase } from '@/components/firebase-provider';
import { useAuth } from '@/contexts/auth-context';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import type { DashboardPreferences } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';

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

export default function DashboardSettingsPage() {
  const { db } = useFirebase();
  const { user } = useAuth();
  const { toast } = useToast();
  const [preferences, setPreferences] = useState<DashboardPreferences>(DEFAULT_PREFERENCES);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!db || !user?.id) {
      setIsLoading(false);
      return;
    }

    const loadPreferences = async () => {
      try {
        const docRef = doc(db, 'dashboardPreferences', user.id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          setPreferences({ ...DEFAULT_PREFERENCES, ...docSnap.data() } as DashboardPreferences);
        } else {
          setPreferences(DEFAULT_PREFERENCES);
        }
      } catch (error) {
        console.error('Error loading dashboard preferences:', error);
        toast({
          title: "Error",
          description: "Could not load dashboard preferences.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadPreferences();
  }, [db, user, toast]);

  const handleSave = async () => {
    console.log('Save button clicked');
    console.log('DB:', db, 'User ID:', user?.id);

    if (!db || !user?.id) {
      console.log('Missing db or user.id, cannot save');
      toast({
        title: "Error",
        description: "Not authenticated or database not initialized.",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      const docRef = doc(db, 'dashboardPreferences', user.id);
      console.log('Saving preferences:', preferences);
      await setDoc(docRef, preferences);

      toast({
        title: "Settings Saved",
        description: "Your dashboard preferences have been updated.",
      });
    } catch (error) {
      console.error('Error saving dashboard preferences:', error);
      toast({
        title: "Error",
        description: "Could not save dashboard preferences.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggle = (key: keyof DashboardPreferences) => {
    setPreferences(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleThresholdChange = (value: string) => {
    const numValue = parseInt(value);
    if (!isNaN(numValue) && numValue >= 0) {
      setPreferences(prev => ({
        ...prev,
        lowStockThreshold: numValue,
      }));
    }
  };

  return (
    <>
      <PageHeader
        title="Dashboard Settings"
        description="Customize what appears on your dashboard and configure alerts."
      />

      <div className="space-y-6">
        {/* Analytics Widgets */}
        <Card>
          <CardHeader>
            <CardTitle>Analytics Widgets</CardTitle>
            <CardDescription>
              Control which analytics charts and metrics appear on your dashboard
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {isLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="analytics-metrics">Analytics Metrics</Label>
                    <p className="text-sm text-muted-foreground">
                      Show Total Money In, Pending Payments, Total Orders, and Avg Order Value
                    </p>
                  </div>
                  <Switch
                    id="analytics-metrics"
                    checked={preferences.showAnalyticsMetrics}
                    onCheckedChange={() => handleToggle('showAnalyticsMetrics')}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="revenue-chart">Revenue Chart</Label>
                    <p className="text-sm text-muted-foreground">
                      Display revenue trends and order volume over time
                    </p>
                  </div>
                  <Switch
                    id="revenue-chart"
                    checked={preferences.showRevenueChart}
                    onCheckedChange={() => handleToggle('showRevenueChart')}
                  />
                </div>

                {preferences.showRevenueChart && (
                  <div className="ml-6 space-y-2">
                    <Label htmlFor="chart-period">Default Time Period</Label>
                    <Select
                      value={preferences.defaultChartPeriod.toString()}
                      onValueChange={(value) => setPreferences(prev => ({
                        ...prev,
                        defaultChartPeriod: parseInt(value) as 7 | 30 | 60 | 90,
                      }))}
                    >
                      <SelectTrigger id="chart-period" className="w-32" aria-label="Default Time Period for Charts">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="7">7 Days</SelectItem>
                        <SelectItem value="30">30 Days</SelectItem>
                        <SelectItem value="60">60 Days</SelectItem>
                        <SelectItem value="90">90 Days</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="top-products">Top Selling Products</Label>
                    <p className="text-sm text-muted-foreground">
                      Show your best performing products by revenue
                    </p>
                  </div>
                  <Switch
                    id="top-products"
                    checked={preferences.showTopProducts}
                    onCheckedChange={() => handleToggle('showTopProducts')}
                  />
                </div>

                {preferences.showTopProducts && (
                  <div className="ml-6 space-y-2">
                    <Label htmlFor="products-period">Default Time Period</Label>
                    <Select
                      value={preferences.defaultTopProductsPeriod.toString()}
                      onValueChange={(value) => setPreferences(prev => ({
                        ...prev,
                        defaultTopProductsPeriod: value === 'all' ? 'all' : parseInt(value) as 30 | 60 | 90,
                      }))}
                    >
                      <SelectTrigger id="products-period" className="w-32" aria-label="Default Time Period for Top Products">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Time</SelectItem>
                        <SelectItem value="30">30 Days</SelectItem>
                        <SelectItem value="60">60 Days</SelectItem>
                        <SelectItem value="90">90 Days</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Dashboard Widgets */}
        <Card>
          <CardHeader>
            <CardTitle>Dashboard Widgets</CardTitle>
            <CardDescription>
              Choose which widgets to display on your dashboard
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {isLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="quick-stats">Quick Stats</Label>
                    <p className="text-sm text-muted-foreground">
                      Show summary cards for orders, customers, estimates, and invoices
                    </p>
                  </div>
                  <Switch
                    id="quick-stats"
                    checked={preferences.showQuickStats}
                    onCheckedChange={() => handleToggle('showQuickStats')}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="low-stock">Low Stock Alert</Label>
                    <p className="text-sm text-muted-foreground">
                      Display products with low inventory levels
                    </p>
                  </div>
                  <Switch
                    id="low-stock"
                    checked={preferences.showLowStockAlert}
                    onCheckedChange={() => handleToggle('showLowStockAlert')}
                  />
                </div>

                {preferences.showLowStockAlert && (
                  <div className="ml-6 space-y-2">
                    <Label htmlFor="threshold">Low Stock Threshold</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="threshold"
                        type="number"
                        min="0"
                        value={preferences.lowStockThreshold}
                        onChange={(e) => handleThresholdChange(e.target.value)}
                        className="w-32"
                      />
                      <span className="text-sm text-muted-foreground">
                        Show products with {preferences.lowStockThreshold} or fewer items in stock
                      </span>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="unpaid-invoices">Unpaid Invoices</Label>
                    <p className="text-sm text-muted-foreground">
                      Display invoices awaiting payment with overdue alerts
                    </p>
                  </div>
                  <Switch
                    id="unpaid-invoices"
                    checked={preferences.showUnpaidInvoices}
                    onCheckedChange={() => handleToggle('showUnpaidInvoices')}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="quick-actions">Quick Actions</Label>
                    <p className="text-sm text-muted-foreground">
                      Show navigation shortcuts to key areas
                    </p>
                  </div>
                  <Switch
                    id="quick-actions"
                    checked={preferences.showQuickActions}
                    onCheckedChange={() => handleToggle('showQuickActions')}
                  />
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button type="button" onClick={handleSave} disabled={isSaving || isLoading}>
            {isSaving ? 'Saving...' : 'Save Preferences'}
          </Button>
        </div>
      </div>
    </>
  );
}
