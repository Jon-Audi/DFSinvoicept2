"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { PageHeader } from '@/components/page-header';
import { Icon } from '@/components/icons';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Separator } from '@/components/ui/separator';
import type { Order, Invoice, Vendor, ShopStatus, LineItem } from '@/types';
import { useToast } from "@/hooks/use-toast";
import { useFirebase } from '@/components/firebase-provider';
import { useAuth } from '@/contexts/auth-context';
import { collection, onSnapshot, doc, setDoc, query, where } from 'firebase/firestore';
import { format, parseISO, differenceInBusinessDays, addBusinessDays } from 'date-fns';
import { cn } from '@/lib/utils';

// Combined type for shop items
type ShopItem = {
  id: string;
  type: 'order' | 'invoice';
  documentNumber: string;
  customerName: string;
  poNumber?: string;
  vendorId?: string;
  vendorName?: string;
  expectedDeliveryDate?: string;
  shopStatus?: ShopStatus;
  receivedDate?: string;
  receivedBy?: string;
  packingSlipPhotos?: string[];
  lineItems: LineItem[];
  date: string;
  pickedUpDate?: string;
  readyForPickUpDate?: string;
  shopNotes?: string;
  // Reference to original document
  originalDoc: Order | Invoice;
};

const SHOP_STATUSES: ShopStatus[] = ['Pending', 'Ordered', 'Shipped', 'Partial Received', 'Received', 'Ready for Pickup', 'Picked Up'];

const getStatusColor = (status?: ShopStatus): string => {
  switch (status) {
    case 'Pending': return 'bg-gray-100 text-gray-800 border-gray-300';
    case 'Ordered': return 'bg-blue-100 text-blue-800 border-blue-300';
    case 'Shipped': return 'bg-purple-100 text-purple-800 border-purple-300';
    case 'Partial Received': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    case 'Received': return 'bg-green-100 text-green-800 border-green-300';
    case 'Ready for Pickup': return 'bg-orange-100 text-orange-800 border-orange-300';
    case 'Picked Up': return 'bg-emerald-100 text-emerald-800 border-emerald-300';
    default: return 'bg-gray-100 text-gray-800 border-gray-300';
  }
};

const formatDate = (dateString?: string): string => {
  if (!dateString) return 'N/A';
  try {
    return format(parseISO(dateString), 'MMM d, yyyy');
  } catch {
    return 'Invalid Date';
  }
};

export default function ShopPage() {
  const { db } = useFirebase();
  const { user } = useAuth();
  const { toast } = useToast();

  const [orders, setOrders] = useState<Order[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [vendorFilter, setVendorFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('active');
  const [selectedItem, setSelectedItem] = useState<ShopItem | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showStatusConfirm, setShowStatusConfirm] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<ShopStatus | null>(null);
  const [editingReceivedQty, setEditingReceivedQty] = useState<Record<string, number>>({});
  const [editingNotes, setEditingNotes] = useState('');
  const [editingEta, setEditingEta] = useState<Date | undefined>(undefined);
  const [isEditingEta, setIsEditingEta] = useState(false);

  // Fetch orders with vendor
  useEffect(() => {
    if (!db) return;

    const ordersRef = collection(db, 'orders');
    const unsubOrders = onSnapshot(ordersRef, (snapshot) => {
      const orderData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Order[];
      setOrders(orderData);
    });

    const invoicesRef = collection(db, 'invoices');
    const unsubInvoices = onSnapshot(invoicesRef, (snapshot) => {
      const invoiceData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Invoice[];
      setInvoices(invoiceData);
    });

    const vendorsRef = collection(db, 'vendors');
    const unsubVendors = onSnapshot(vendorsRef, (snapshot) => {
      const vendorData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Vendor[];
      setVendors(vendorData);
      setIsLoading(false);
    });

    return () => {
      unsubOrders();
      unsubInvoices();
      unsubVendors();
    };
  }, [db]);

  // Convert orders and invoices to shop items
  const shopItems = useMemo(() => {
    const items: ShopItem[] = [];

    // Add orders that have a vendor (distributor)
    orders.forEach(order => {
      if (order.distributor) {
        const vendor = vendors.find(v => v.id === order.distributor || v.name === order.distributor);
        items.push({
          id: order.id,
          type: 'order',
          documentNumber: order.orderNumber,
          customerName: order.customerName || 'Unknown Customer',
          poNumber: order.poNumber,
          vendorId: order.distributor,
          vendorName: vendor?.name || order.distributor,
          expectedDeliveryDate: order.expectedDeliveryDate,
          shopStatus: order.shopStatus || 'Pending',
          receivedDate: order.receivedDate,
          receivedBy: order.receivedBy,
          packingSlipPhotos: order.packingSlipPhotos,
          lineItems: order.lineItems,
          date: order.date,
          pickedUpDate: order.pickedUpDate,
          readyForPickUpDate: order.readyForPickUpDate,
          shopNotes: order.shopNotes,
          originalDoc: order,
        });
      }
    });

    // Add invoices that have a vendor (distributor)
    invoices.forEach(invoice => {
      if (invoice.distributor) {
        const vendor = vendors.find(v => v.id === invoice.distributor || v.name === invoice.distributor);
        items.push({
          id: invoice.id,
          type: 'invoice',
          documentNumber: invoice.invoiceNumber,
          customerName: invoice.customerName || 'Unknown Customer',
          poNumber: invoice.poNumber,
          vendorId: invoice.distributor,
          vendorName: vendor?.name || invoice.distributor,
          expectedDeliveryDate: invoice.expectedDeliveryDate,
          shopStatus: invoice.shopStatus || 'Pending',
          receivedDate: invoice.receivedDate,
          receivedBy: invoice.receivedBy,
          packingSlipPhotos: invoice.packingSlipPhotos,
          lineItems: invoice.lineItems,
          date: invoice.date,
          pickedUpDate: invoice.pickedUpDate,
          readyForPickUpDate: invoice.readyForPickUpDate,
          shopNotes: invoice.shopNotes,
          originalDoc: invoice,
        });
      }
    });

    return items;
  }, [orders, invoices, vendors]);

  // Filter shop items
  const filteredItems = useMemo(() => {
    return shopItems.filter(item => {
      // Search filter
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = !searchTerm ||
        item.customerName.toLowerCase().includes(searchLower) ||
        item.documentNumber.toLowerCase().includes(searchLower) ||
        (item.poNumber && item.poNumber.toLowerCase().includes(searchLower)) ||
        (item.vendorName && item.vendorName.toLowerCase().includes(searchLower));

      // Vendor filter
      const matchesVendor = vendorFilter === 'all' || item.vendorId === vendorFilter || item.vendorName === vendorFilter;

      // Status filter
      let matchesStatus = true;
      if (statusFilter === 'active') {
        matchesStatus = item.shopStatus !== 'Picked Up';
      } else if (statusFilter !== 'all') {
        matchesStatus = item.shopStatus === statusFilter;
      }

      return matchesSearch && matchesVendor && matchesStatus;
    });
  }, [shopItems, searchTerm, vendorFilter, statusFilter]);

  // Group items by vendor
  const groupedByVendor = useMemo(() => {
    const groups: Record<string, ShopItem[]> = {};

    filteredItems.forEach(item => {
      const vendorKey = item.vendorName || 'Unknown Vendor';
      if (!groups[vendorKey]) {
        groups[vendorKey] = [];
      }
      groups[vendorKey].push(item);
    });

    // Sort each group by expected delivery date
    Object.keys(groups).forEach(key => {
      groups[key].sort((a, b) => {
        if (!a.expectedDeliveryDate) return 1;
        if (!b.expectedDeliveryDate) return -1;
        return new Date(a.expectedDeliveryDate).getTime() - new Date(b.expectedDeliveryDate).getTime();
      });
    });

    return groups;
  }, [filteredItems]);

  // Get unique vendors that have items
  const activeVendors = useMemo(() => {
    const vendorSet = new Set<string>();
    shopItems.forEach(item => {
      if (item.vendorName) vendorSet.add(item.vendorName);
    });
    return Array.from(vendorSet).sort();
  }, [shopItems]);

  // Update shop status
  const handleStatusUpdate = async (item: ShopItem, newStatus: ShopStatus) => {
    if (!db) return;

    setIsUpdating(true);
    try {
      const collectionName = item.type === 'order' ? 'orders' : 'invoices';
      const docRef = doc(db, collectionName, item.id);

      const updateData: Partial<Order | Invoice> = {
        shopStatus: newStatus,
      };

      // Add received date and who received it when marked as received
      if (newStatus === 'Received' && !item.receivedDate) {
        updateData.receivedDate = new Date().toISOString();
        updateData.receivedBy = user?.email || 'Unknown';
      }

      // Update ready for pickup date
      if (newStatus === 'Ready for Pickup' && !item.readyForPickUpDate) {
        updateData.readyForPickUpDate = new Date().toISOString();
      }

      // Update picked up date
      if (newStatus === 'Picked Up' && !item.pickedUpDate) {
        updateData.pickedUpDate = new Date().toISOString();
      }

      await setDoc(docRef, updateData, { merge: true });

      toast({
        title: "Status Updated",
        description: `${item.type === 'order' ? 'Order' : 'Invoice'} #${item.documentNumber} is now "${newStatus}"`,
      });

      setShowStatusConfirm(false);
      setPendingStatus(null);
    } catch (error: any) {
      toast({
        title: "Error",
        description: `Failed to update status: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  // Check if pickup reminder needed (7 business days after ready)
  const needsPickupReminder = (item: ShopItem): boolean => {
    if (item.shopStatus !== 'Ready for Pickup' || !item.readyForPickUpDate) return false;
    try {
      const readyDate = parseISO(item.readyForPickUpDate);
      const daysSinceReady = differenceInBusinessDays(new Date(), readyDate);
      return daysSinceReady >= 7;
    } catch {
      return false;
    }
  };

  // Stats
  const stats = useMemo(() => {
    const pending = shopItems.filter(i => i.shopStatus === 'Pending' || !i.shopStatus).length;
    const ordered = shopItems.filter(i => i.shopStatus === 'Ordered').length;
    const shipped = shopItems.filter(i => i.shopStatus === 'Shipped').length;
    const partialReceived = shopItems.filter(i => i.shopStatus === 'Partial Received').length;
    const received = shopItems.filter(i => i.shopStatus === 'Received').length;
    const readyForPickup = shopItems.filter(i => i.shopStatus === 'Ready for Pickup').length;
    const needsReminder = shopItems.filter(needsPickupReminder).length;

    return { pending, ordered, shipped, partialReceived, received, readyForPickup, needsReminder };
  }, [shopItems]);

  const openItemDetail = (item: ShopItem) => {
    setSelectedItem(item);
    setIsDetailOpen(true);
    // Initialize editing state with existing values
    const initialQty: Record<string, number> = {};
    item.lineItems.forEach(li => {
      initialQty[li.id] = li.receivedQuantity ?? 0;
    });
    setEditingReceivedQty(initialQty);
    setEditingNotes(item.shopNotes || '');
    setEditingEta(item.expectedDeliveryDate ? parseISO(item.expectedDeliveryDate) : undefined);
    setIsEditingEta(false);
  };

  // Save received quantities for line items
  const handleSaveReceivedQuantities = async () => {
    if (!db || !selectedItem) return;

    setIsUpdating(true);
    try {
      const collectionName = selectedItem.type === 'order' ? 'orders' : 'invoices';
      const docRef = doc(db, collectionName, selectedItem.id);

      // Update line items with received quantities
      const updatedLineItems = selectedItem.lineItems.map(li => ({
        ...li,
        receivedQuantity: editingReceivedQty[li.id] ?? li.receivedQuantity ?? 0,
      }));

      // Check if all items are fully received, partially received, or none received
      const totalOrdered = selectedItem.lineItems.reduce((sum, li) => sum + li.quantity, 0);
      const totalReceived = Object.values(editingReceivedQty).reduce((sum, qty) => sum + qty, 0);

      let newStatus: ShopStatus = selectedItem.shopStatus || 'Pending';
      if (totalReceived === 0) {
        // Keep current status or Shipped
      } else if (totalReceived > 0 && totalReceived < totalOrdered) {
        newStatus = 'Partial Received';
      } else if (totalReceived >= totalOrdered) {
        newStatus = 'Received';
      }

      const updateData: Partial<Order | Invoice> = {
        lineItems: updatedLineItems,
        shopStatus: newStatus,
      };

      // Add received date/by if marking as received for first time
      if ((newStatus === 'Partial Received' || newStatus === 'Received') && !selectedItem.receivedDate) {
        updateData.receivedDate = new Date().toISOString();
        updateData.receivedBy = user?.email || 'Unknown';
      }

      await setDoc(docRef, updateData, { merge: true });

      toast({
        title: "Quantities Updated",
        description: `Received quantities saved. Status: ${newStatus}`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: `Failed to save quantities: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  // Save shop notes
  const handleSaveNotes = async () => {
    if (!db || !selectedItem) return;

    setIsUpdating(true);
    try {
      const collectionName = selectedItem.type === 'order' ? 'orders' : 'invoices';
      const docRef = doc(db, collectionName, selectedItem.id);

      await setDoc(docRef, { shopNotes: editingNotes }, { merge: true });

      toast({
        title: "Notes Saved",
        description: "Internal notes have been updated.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: `Failed to save notes: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  // Save expected delivery date (ETA)
  const handleSaveEta = async () => {
    if (!db || !selectedItem) return;

    setIsUpdating(true);
    try {
      const collectionName = selectedItem.type === 'order' ? 'orders' : 'invoices';
      const docRef = doc(db, collectionName, selectedItem.id);

      await setDoc(docRef, {
        expectedDeliveryDate: editingEta ? editingEta.toISOString() : null
      }, { merge: true });

      toast({
        title: "ETA Updated",
        description: editingEta ? `Expected delivery date set to ${format(editingEta, 'PPP')}` : "Expected delivery date cleared.",
      });
      setIsEditingEta(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: `Failed to save ETA: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Icon name="Loader2" className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <PageHeader title="Shop" description="Track incoming vendor orders and manage receiving">
        <Button variant="outline" onClick={() => window.location.reload()}>
          <Icon name="RefreshCw" className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </PageHeader>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4 lg:grid-cols-7 mb-6">
        <Card className="cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => setStatusFilter('Pending')}>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{stats.pending}</div>
            <p className="text-xs text-muted-foreground">Pending</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => setStatusFilter('Ordered')}>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600">{stats.ordered}</div>
            <p className="text-xs text-muted-foreground">Ordered</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => setStatusFilter('Shipped')}>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-purple-600">{stats.shipped}</div>
            <p className="text-xs text-muted-foreground">Shipped</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => setStatusFilter('Partial Received')}>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-yellow-600">{stats.partialReceived}</div>
            <p className="text-xs text-muted-foreground">Partial Received</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => setStatusFilter('Received')}>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">{stats.received}</div>
            <p className="text-xs text-muted-foreground">Received</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => setStatusFilter('Ready for Pickup')}>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-orange-600">{stats.readyForPickup}</div>
            <p className="text-xs text-muted-foreground">Ready for Pickup</p>
          </CardContent>
        </Card>
        {stats.needsReminder > 0 && (
          <Card className="border-red-300 bg-red-50 dark:bg-red-950/20">
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-red-600">{stats.needsReminder}</div>
              <p className="text-xs text-red-600">Needs Reminder Call</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search by customer, PO, or order #..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-md"
              />
            </div>
            <div className="flex gap-2">
              <Select value={vendorFilter} onValueChange={setVendorFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by vendor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Vendors</SelectItem>
                  {activeVendors.map(vendor => (
                    <SelectItem key={vendor} value={vendor}>{vendor}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active (Not Picked Up)</SelectItem>
                  {SHOP_STATUSES.map(status => (
                    <SelectItem key={status} value={status}>{status}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Items grouped by vendor */}
      {Object.keys(groupedByVendor).length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Icon name="Warehouse" className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No vendor orders found</h3>
            <p className="text-muted-foreground">
              Orders and invoices with a vendor assigned will appear here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedByVendor).map(([vendorName, items]) => (
            <Card key={vendorName}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Icon name="Truck" className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg">{vendorName}</CardTitle>
                    <Badge variant="secondary">{items.length} items</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>PO #</TableHead>
                      <TableHead>Expected Delivery</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map(item => (
                      <TableRow
                        key={`${item.type}-${item.id}`}
                        className={cn(
                          "cursor-pointer hover:bg-accent/50",
                          needsPickupReminder(item) && "bg-red-50 dark:bg-red-950/20"
                        )}
                        onClick={() => openItemDetail(item)}
                      >
                        <TableCell>
                          <Badge variant="outline">
                            {item.type === 'order' ? 'Order' : 'Invoice'} #{item.documentNumber}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">
                          {item.customerName}
                          {needsPickupReminder(item) && (
                            <div className="flex items-center gap-1 text-xs text-red-600 mt-1">
                              <Icon name="Phone" className="h-3 w-3" />
                              Reminder needed
                            </div>
                          )}
                        </TableCell>
                        <TableCell>{item.poNumber || 'N/A'}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Icon name="Clock" className="h-4 w-4 text-muted-foreground" />
                            {formatDate(item.expectedDeliveryDate)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(item.shopStatus)}>
                            {item.shopStatus || 'Pending'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              openItemDetail(item);
                            }}
                          >
                            <Icon name="Eye" className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Detail Sheet */}
      <Sheet open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <SheetContent size="xl" className="p-0 flex flex-col !h-[100vh] overflow-hidden">
          {selectedItem && (
            <>
              <SheetHeader className="px-6 pt-6 pb-4 border-b shrink-0">
                <div className="flex items-start justify-between">
                  <div>
                    <SheetTitle>
                      {selectedItem.type === 'order' ? 'Order' : 'Invoice'} #{selectedItem.documentNumber}
                    </SheetTitle>
                    <SheetDescription>
                      {selectedItem.customerName} - {selectedItem.vendorName}
                    </SheetDescription>
                  </div>
                  <Badge className={cn("text-sm", getStatusColor(selectedItem.shopStatus))}>
                    {selectedItem.shopStatus || 'Pending'}
                  </Badge>
                </div>
                {needsPickupReminder(selectedItem) && (
                  <div className="mt-3 rounded-md bg-red-50 p-3 border border-red-200">
                    <div className="flex items-center gap-2 text-red-800">
                      <Icon name="Phone" className="h-5 w-5" />
                      <div>
                        <p className="font-semibold text-sm">Customer reminder needed</p>
                        <p className="text-xs text-red-600">This order has been ready for pickup for more than 7 business days.</p>
                      </div>
                    </div>
                  </div>
                )}
              </SheetHeader>
              <div className="flex-1 overflow-y-auto px-6 py-4 min-h-0">
                <div className="space-y-6">
                  {/* Order Info */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">PO Number</label>
                      <p className="font-medium">{selectedItem.poNumber || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Vendor</label>
                      <p className="font-medium">{selectedItem.vendorName}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Order Date</label>
                      <p className="font-medium">{formatDate(selectedItem.date)}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Expected Delivery (ETA)</label>
                      {isEditingEta ? (
                        <div className="flex items-center gap-2 mt-1">
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="outline" size="sm" className={cn("text-left font-normal", !editingEta && "text-muted-foreground")}>
                                {editingEta ? format(editingEta, "PPP") : "Pick a date"}
                                <Icon name="Calendar" className="ml-2 h-4 w-4" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar mode="single" selected={editingEta} onSelect={setEditingEta} />
                            </PopoverContent>
                          </Popover>
                          <Button size="sm" onClick={handleSaveEta} disabled={isUpdating}>
                            <Icon name="Check" className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setIsEditingEta(false)}>
                            <Icon name="X" className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{formatDate(selectedItem.expectedDeliveryDate)}</p>
                          <Button size="sm" variant="ghost" onClick={() => setIsEditingEta(true)}>
                            <Icon name="Edit" className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                    {selectedItem.receivedDate && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Received Date</label>
                        <p className="font-medium">{formatDate(selectedItem.receivedDate)}</p>
                      </div>
                    )}
                    {selectedItem.receivedBy && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Received By</label>
                        <p className="font-medium">{selectedItem.receivedBy}</p>
                      </div>
                    )}
                  </div>

                  <Separator />

                  {/* Line Items with Received Quantities */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold">Materials Ordered</h3>
                      <Button size="sm" onClick={handleSaveReceivedQuantities} disabled={isUpdating}>
                        {isUpdating ? <Icon name="Loader2" className="mr-2 h-4 w-4 animate-spin" /> : <Icon name="Save" className="mr-2 h-4 w-4" />}
                        Save Quantities
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {selectedItem.lineItems.map(item => {
                        const orderedQty = item.quantity;
                        const receivedQty = editingReceivedQty[item.id] ?? 0;
                        const backorderedQty = Math.max(0, orderedQty - receivedQty);
                        const isFullyReceived = receivedQty >= orderedQty;
                        const isPartiallyReceived = receivedQty > 0 && receivedQty < orderedQty;

                        return (
                          <div
                            key={item.id}
                            className={cn(
                              "p-3 border rounded-lg",
                              isFullyReceived && "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800",
                              isPartiallyReceived && "bg-yellow-50 dark:bg-yellow-950/30 border-yellow-200 dark:border-yellow-800"
                            )}
                          >
                            <div className="flex justify-between items-center mb-2">
                              <span className="font-medium">{item.productName}</span>
                              <Badge variant="secondary" className="text-sm">Ordered: {orderedQty}</Badge>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="flex items-center gap-2">
                                <Label className="text-sm text-muted-foreground">Received:</Label>
                                <Input
                                  type="number"
                                  min={0}
                                  max={orderedQty}
                                  value={receivedQty}
                                  onChange={(e) => setEditingReceivedQty(prev => ({
                                    ...prev,
                                    [item.id]: Math.max(0, parseInt(e.target.value) || 0)
                                  }))}
                                  className="w-20 h-8"
                                />
                              </div>
                              {backorderedQty > 0 && (
                                <Badge variant="outline" className="bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800">
                                  Backordered: {backorderedQty}
                                </Badge>
                              )}
                              {isFullyReceived && (
                                <Badge className="bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-300">
                                  <Icon name="Check" className="mr-1 h-3 w-3" /> Complete
                                </Badge>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <Separator />

                  {/* Status Update */}
                  <div>
                    <h3 className="font-semibold mb-3">Update Status</h3>
                    <div className="flex flex-wrap gap-2">
                      {SHOP_STATUSES.map(status => (
                        <Button
                          key={status}
                          variant={selectedItem.shopStatus === status ? "default" : "outline"}
                          size="sm"
                          onClick={() => {
                            setPendingStatus(status);
                            setShowStatusConfirm(true);
                          }}
                          disabled={selectedItem.shopStatus === status}
                        >
                          {status}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <Separator />

                  {/* Packing Slip Photos Placeholder */}
                  <div>
                    <h3 className="font-semibold mb-3">Packing Slip Photos</h3>
                    {selectedItem.packingSlipPhotos && selectedItem.packingSlipPhotos.length > 0 ? (
                      <div className="grid grid-cols-2 gap-4">
                        {selectedItem.packingSlipPhotos.map((url, idx) => (
                          <div key={idx} className="border rounded-lg p-2">
                            <img src={url} alt={`Packing slip ${idx + 1}`} className="w-full h-auto rounded" />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="border-2 border-dashed rounded-lg p-8 text-center text-muted-foreground">
                        <Icon name="Camera" className="h-8 w-8 mx-auto mb-2" />
                        <p>No packing slip photos uploaded</p>
                        <Button variant="outline" size="sm" className="mt-2" disabled>
                          <Icon name="Upload" className="mr-2 h-4 w-4" />
                          Upload Photo (Coming Soon)
                        </Button>
                      </div>
                    )}
                  </div>

                  <Separator />

                  {/* Internal Notes (Back of House / Office only) */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold">Internal Notes</h3>
                      <Badge variant="outline" className="text-xs">Back of House Only</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">
                      These notes are only visible to office and yard staff, not shown to customers.
                    </p>
                    <Textarea
                      value={editingNotes}
                      onChange={(e) => setEditingNotes(e.target.value)}
                      placeholder="Add internal notes about this order..."
                      rows={4}
                      className="mb-2"
                    />
                    <Button
                      size="sm"
                      onClick={handleSaveNotes}
                      disabled={isUpdating || editingNotes === (selectedItem.shopNotes || '')}
                    >
                      {isUpdating ? <Icon name="Loader2" className="mr-2 h-4 w-4 animate-spin" /> : <Icon name="Save" className="mr-2 h-4 w-4" />}
                      Save Notes
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Status Confirm Dialog */}
      <AlertDialog open={showStatusConfirm} onOpenChange={setShowStatusConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Update Status?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to change the status to &quot;{pendingStatus}&quot;?
              {pendingStatus === 'Received' && (
                <span className="block mt-2 text-sm">
                  This will record the current date and time as the received date.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isUpdating}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedItem && pendingStatus && handleStatusUpdate(selectedItem, pendingStatus)}
              disabled={isUpdating}
            >
              {isUpdating && <Icon name="Loader2" className="mr-2 h-4 w-4 animate-spin" />}
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
