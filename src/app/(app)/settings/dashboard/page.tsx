"use client";

import React, { useState, useEffect } from 'react';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
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
          setPreferences(docSnap.data() as DashboardPreferences);
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
    if (!db || !user?.id) return;

    setIsSaving(true);
    try {
      const docRef = doc(db, 'dashboardPreferences', user.id);
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

              <div className="flex justify-end pt-4">
                <Button onClick={handleSave} disabled={isSaving}>
                  {isSaving ? 'Saving...' : 'Save Preferences'}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </>
  );
}
