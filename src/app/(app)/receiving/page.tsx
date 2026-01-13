
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/icons';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from "@/hooks/use-toast";
import type { ReceivingOrder, ReceivingLineItem, ReceivingStatus, ReceivingType, Vendor, Product } from '@/types';
import { useFirebase } from '@/components/firebase-provider';
import { useAuth } from '@/contexts/auth-context';
import { collection, addDoc, setDoc, deleteDoc, onSnapshot, doc, runTransaction, query, orderBy } from 'firebase/firestore';
import { PackingSlipUpload } from '@/components/receiving/packing-slip-upload';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';

const RECEIVING_STATUSES: ReceivingStatus[] = ['Expected', 'In Transit', 'Partially Received', 'Received', 'Discrepancy', 'Voided'];
const RECEIVING_TYPES: ReceivingType[] = ['Vendor Order', 'Customer Return', 'Transfer', 'Adjustment'];

const getStatusColor = (status: ReceivingStatus): string => {
  switch (status) {
    case 'Expected': return 'bg-blue-100 text-blue-800 border-blue-300';
    case 'In Transit': return 'bg-purple-100 text-purple-800 border-purple-300';
    case 'Partially Received': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    case 'Received': return 'bg-green-100 text-green-800 border-green-300';
    case 'Discrepancy': return 'bg-orange-100 text-orange-800 border-orange-300';
    case 'Voided': return 'bg-gray-100 text-gray-800 border-gray-300';
    default: return 'bg-gray-100 text-gray-800 border-gray-300';
  }
};

const getTypeColor = (type: ReceivingType): string => {
  switch (type) {
    case 'Vendor Order': return 'bg-indigo-100 text-indigo-800';
    case 'Customer Return': return 'bg-pink-100 text-pink-800';
    case 'Transfer': return 'bg-cyan-100 text-cyan-800';
    case 'Adjustment': return 'bg-amber-100 text-amber-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

const formatDate = (dateString?: string): string => {
  if (!dateString) return 'Not set';
  try {
    return format(parseISO(dateString), 'MMM d, yyyy');
  } catch {
    return dateString;
  }
};

const generateReceivingNumber = (): string => {
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 90000) + 10000;
  return `RCV-${year}-${random}`;
};

type SortableKeys = 'receivingNumber' | 'date' | 'vendorName' | 'expectedDeliveryDate' | 'status' | 'total';

export default function ReceivingPage() {
  const { db } = useFirebase();
  const { user } = useAuth();
  const { toast } = useToast();

  const [receivingOrders, setReceivingOrders] = useState<ReceivingOrder[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [sortConfig, setSortConfig] = useState<{ key: SortableKeys; direction: 'asc' | 'desc' }>({ key: 'date', direction: 'desc' });

  // Form state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<ReceivingOrder | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Delete confirmation
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<ReceivingOrder | null>(null);

  // Product filter state per line item
  const [lineItemFilters, setLineItemFilters] = useState<Record<string, { category: string; subcategory: string; popoverOpen: boolean }>>({});

  // Get unique categories and subcategories from products
  const productCategories = useMemo(() => {
    const cats = [...new Set(products.map(p => p.category).filter(Boolean))];
    return cats.sort();
  }, [products]);

  const getAvailableSubcategories = (category: string): string[] => {
    if (!category || category === 'all') return [];
    const subs = [...new Set(products.filter(p => p.category === category).map(p => p.subcategory).filter((s): s is string => Boolean(s)))];
    return subs.sort();
  };

  const getFilteredProducts = (lineItemId: string) => {
    const filter = lineItemFilters[lineItemId] || { category: 'all', subcategory: 'all' };
    return products.filter(p => {
      if (filter.category && filter.category !== 'all' && p.category !== filter.category) return false;
      if (filter.subcategory && filter.subcategory !== 'all' && p.subcategory !== filter.subcategory) return false;
      return true;
    });
  };

  const updateLineItemFilter = (lineItemId: string, field: 'category' | 'subcategory' | 'popoverOpen', value: string | boolean) => {
    setLineItemFilters(prev => {
      const current = prev[lineItemId] || { category: 'all', subcategory: 'all', popoverOpen: false };
      const updated = { ...current, [field]: value };
      // Reset subcategory when category changes
      if (field === 'category') {
        updated.subcategory = 'all';
      }
      return { ...prev, [lineItemId]: updated };
    });
  };

  // Form fields
  const [formData, setFormData] = useState({
    receivingNumber: '',
    vendorId: '',
    vendorName: '',
    date: new Date(),
    expectedDeliveryDate: undefined as Date | undefined,
    actualDeliveryDate: undefined as Date | undefined,
    poNumber: '',
    status: 'Expected' as ReceivingStatus,
    type: 'Vendor Order' as ReceivingType,
    notes: '',
    internalNotes: '',
    packingSlipUrls: [] as string[],
    lineItems: [] as ReceivingLineItem[],
  });

  // Fetch data
  useEffect(() => {
    if (!db) return;

    const unsubscribes: (() => void)[] = [];

    // Receiving Orders
    const receivingQuery = query(collection(db, 'receivingOrders'), orderBy('date', 'desc'));
    unsubscribes.push(
      onSnapshot(receivingQuery, (snapshot) => {
        const data = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as ReceivingOrder));
        setReceivingOrders(data);
        setIsLoading(false);
      }, (error) => {
        console.error('Error fetching receiving orders:', error);
        toast({ title: "Error", description: "Could not fetch receiving orders.", variant: "destructive" });
        setIsLoading(false);
      })
    );

    // Vendors
    unsubscribes.push(
      onSnapshot(collection(db, 'vendors'), (snapshot) => {
        const data = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Vendor));
        setVendors(data);
      })
    );

    // Products
    unsubscribes.push(
      onSnapshot(collection(db, 'products'), (snapshot) => {
        const data = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Product));
        setProducts(data);
      })
    );

    return () => unsubscribes.forEach(unsub => unsub());
  }, [db, toast]);

  // Reset form
  const resetForm = () => {
    setFormData({
      receivingNumber: generateReceivingNumber(),
      vendorId: '',
      vendorName: '',
      date: new Date(),
      expectedDeliveryDate: undefined,
      actualDeliveryDate: undefined,
      poNumber: '',
      status: 'Expected',
      type: 'Vendor Order',
      notes: '',
      internalNotes: '',
      packingSlipUrls: [],
      lineItems: [createEmptyLineItem()],
    });
    setEditingOrder(null);
  };

  const createEmptyLineItem = (): ReceivingLineItem => ({
    id: crypto.randomUUID(),
    productId: '',
    productName: '',
    expectedQuantity: 0,
    receivedQuantity: 0,
    unitPrice: 0,
    total: 0,
  });

  // Open form for new order
  const handleNewOrder = () => {
    resetForm();
    setIsFormOpen(true);
  };

  // Open form for editing
  const handleEditOrder = (order: ReceivingOrder) => {
    setEditingOrder(order);
    setFormData({
      receivingNumber: order.receivingNumber,
      vendorId: order.vendorId,
      vendorName: order.vendorName,
      date: parseISO(order.date),
      expectedDeliveryDate: order.expectedDeliveryDate ? parseISO(order.expectedDeliveryDate) : undefined,
      actualDeliveryDate: order.actualDeliveryDate ? parseISO(order.actualDeliveryDate) : undefined,
      poNumber: order.poNumber || '',
      status: order.status,
      type: order.type,
      notes: order.notes || '',
      internalNotes: order.internalNotes || '',
      packingSlipUrls: order.packingSlipUrls || [],
      lineItems: order.lineItems.length > 0 ? order.lineItems : [createEmptyLineItem()],
    });
    setIsFormOpen(true);
  };

  // Save receiving order
  const handleSaveOrder = async () => {
    if (!db) return;
    if (!formData.vendorId) {
      toast({ title: "Validation Error", description: "Please select a vendor.", variant: "destructive" });
      return;
    }
    if (formData.lineItems.length === 0 || !formData.lineItems.some(li => li.productId)) {
      toast({ title: "Validation Error", description: "Please add at least one line item with a product.", variant: "destructive" });
      return;
    }

    setIsSaving(true);
    try {
      const subtotal = formData.lineItems.reduce((sum, li) => sum + li.total, 0);
      const orderData: Omit<ReceivingOrder, 'id'> = {
        receivingNumber: formData.receivingNumber,
        vendorId: formData.vendorId,
        vendorName: formData.vendorName,
        date: formData.date.toISOString(),
        expectedDeliveryDate: formData.expectedDeliveryDate?.toISOString(),
        actualDeliveryDate: formData.actualDeliveryDate?.toISOString(),
        poNumber: formData.poNumber || undefined,
        status: formData.status,
        type: formData.type,
        lineItems: formData.lineItems.filter(li => li.productId),
        subtotal,
        total: subtotal, // Could add tax calculation here
        notes: formData.notes || undefined,
        internalNotes: formData.internalNotes || undefined,
        packingSlipUrls: formData.packingSlipUrls.length > 0 ? formData.packingSlipUrls : undefined,
        updatedAt: new Date().toISOString(),
        createdAt: editingOrder?.createdAt || new Date().toISOString(),
        createdBy: editingOrder?.createdBy || user?.email,
      };

      if (editingOrder) {
        await setDoc(doc(db, 'receivingOrders', editingOrder.id), orderData);
        toast({ title: "Updated", description: `Receiving order ${formData.receivingNumber} has been updated.` });
      } else {
        await addDoc(collection(db, 'receivingOrders'), orderData);
        toast({ title: "Created", description: `Receiving order ${formData.receivingNumber} has been created.` });
      }

      setIsFormOpen(false);
      resetForm();
    } catch (error: any) {
      toast({ title: "Error", description: `Could not save receiving order: ${error.message}`, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  // Delete receiving order
  const handleDeleteOrder = async () => {
    if (!db || !orderToDelete) return;

    try {
      await deleteDoc(doc(db, 'receivingOrders', orderToDelete.id));
      toast({ title: "Deleted", description: `Receiving order ${orderToDelete.receivingNumber} has been deleted.` });
    } catch (error: any) {
      toast({ title: "Error", description: `Could not delete: ${error.message}`, variant: "destructive" });
    } finally {
      setDeleteConfirmOpen(false);
      setOrderToDelete(null);
    }
  };

  // Mark as received and update inventory
  const handleMarkAsReceived = async (order: ReceivingOrder) => {
    if (!db) return;

    try {
      // Update inventory using transaction
      await runTransaction(db, async (transaction) => {
        // Update each product's stock
        for (const item of order.lineItems) {
          if (item.productId && item.receivedQuantity > 0) {
            const productRef = doc(db, 'products', item.productId);
            const productSnap = await transaction.get(productRef);
            if (productSnap.exists()) {
              const currentStock = productSnap.data().quantityInStock || 0;
              transaction.update(productRef, {
                quantityInStock: currentStock + item.receivedQuantity
              });
            }
          }
        }

        // Update receiving order status
        const orderRef = doc(db, 'receivingOrders', order.id);
        transaction.update(orderRef, {
          status: 'Received',
          actualDeliveryDate: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      });

      toast({
        title: "Inventory Updated",
        description: `Receiving order ${order.receivingNumber} marked as received. Inventory has been updated.`,
      });
    } catch (error: any) {
      toast({ title: "Error", description: `Could not update inventory: ${error.message}`, variant: "destructive" });
    }
  };

  // Update line item
  const updateLineItem = (index: number, field: keyof ReceivingLineItem, value: any) => {
    const newLineItems = [...formData.lineItems];
    newLineItems[index] = { ...newLineItems[index], [field]: value };

    // Auto-calculate total
    if (field === 'expectedQuantity' || field === 'unitPrice') {
      newLineItems[index].total = newLineItems[index].expectedQuantity * newLineItems[index].unitPrice;
    }

    // If product selected, auto-fill name and price
    if (field === 'productId') {
      const product = products.find(p => p.id === value);
      if (product) {
        newLineItems[index].productName = product.name;
        newLineItems[index].unitPrice = product.cost || 0;
        newLineItems[index].unit = product.unit;
        newLineItems[index].total = newLineItems[index].expectedQuantity * newLineItems[index].unitPrice;
      }
    }

    setFormData({ ...formData, lineItems: newLineItems });
  };

  // Add line item
  const addLineItem = () => {
    setFormData({
      ...formData,
      lineItems: [...formData.lineItems, createEmptyLineItem()],
    });
  };

  // Remove line item
  const removeLineItem = (index: number) => {
    if (formData.lineItems.length <= 1) return;
    const newLineItems = formData.lineItems.filter((_, i) => i !== index);
    setFormData({ ...formData, lineItems: newLineItems });
  };

  // Sort handler
  const requestSort = (key: SortableKeys) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // Filter and sort
  const filteredAndSortedOrders = useMemo(() => {
    let filtered = receivingOrders;

    // Search filter
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      filtered = filtered.filter(o =>
        o.receivingNumber.toLowerCase().includes(lower) ||
        o.vendorName.toLowerCase().includes(lower) ||
        (o.poNumber && o.poNumber.toLowerCase().includes(lower))
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(o => o.status === statusFilter);
    }

    // Type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter(o => o.type === typeFilter);
    }

    // Sort
    filtered.sort((a, b) => {
      const valA = a[sortConfig.key];
      const valB = b[sortConfig.key];

      if (valA === undefined || valA === null) return 1;
      if (valB === undefined || valB === null) return -1;

      let comparison = 0;
      if (['date', 'expectedDeliveryDate'].includes(sortConfig.key)) {
        comparison = new Date(valA as string).getTime() - new Date(valB as string).getTime();
      } else if (typeof valA === 'number' && typeof valB === 'number') {
        comparison = valA - valB;
      } else {
        comparison = String(valA).localeCompare(String(valB));
      }

      return sortConfig.direction === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [receivingOrders, searchTerm, statusFilter, typeFilter, sortConfig]);

  // Stats
  const stats = useMemo(() => ({
    expected: receivingOrders.filter(o => o.status === 'Expected').length,
    inTransit: receivingOrders.filter(o => o.status === 'In Transit').length,
    partiallyReceived: receivingOrders.filter(o => o.status === 'Partially Received').length,
    received: receivingOrders.filter(o => o.status === 'Received').length,
    discrepancy: receivingOrders.filter(o => o.status === 'Discrepancy').length,
  }), [receivingOrders]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Icon name="Loader2" className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <PageHeader title="Receiving" description="Track incoming inventory from vendors, returns, and adjustments.">
        <Button onClick={handleNewOrder}>
          <Icon name="PlusCircle" className="mr-2 h-4 w-4" />
          New Receiving Order
        </Button>
      </PageHeader>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-5 mb-6">
        <Card className="cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => setStatusFilter('Expected')}>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600">{stats.expected}</div>
            <p className="text-xs text-muted-foreground">Expected</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => setStatusFilter('In Transit')}>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-purple-600">{stats.inTransit}</div>
            <p className="text-xs text-muted-foreground">In Transit</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => setStatusFilter('Partially Received')}>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-yellow-600">{stats.partiallyReceived}</div>
            <p className="text-xs text-muted-foreground">Partial</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => setStatusFilter('Received')}>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">{stats.received}</div>
            <p className="text-xs text-muted-foreground">Received</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => setStatusFilter('Discrepancy')}>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-orange-600">{stats.discrepancy}</div>
            <p className="text-xs text-muted-foreground">Discrepancy</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Table Card */}
      <Card>
        <CardHeader>
          <CardTitle>Receiving Orders</CardTitle>
          <CardDescription>Track and manage all incoming inventory.</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-wrap gap-4 mb-4">
            <Input
              placeholder="Search by RCV#, vendor, PO#..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-xs"
            />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {RECEIVING_STATUSES.map(s => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {RECEIVING_TYPES.map(t => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {(statusFilter !== 'all' || typeFilter !== 'all') && (
              <Button variant="ghost" size="sm" onClick={() => { setStatusFilter('all'); setTypeFilter('all'); }}>
                <Icon name="X" className="mr-1 h-4 w-4" /> Clear Filters
              </Button>
            )}
          </div>

          {/* Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="cursor-pointer" onClick={() => requestSort('receivingNumber')}>
                    RCV # {sortConfig.key === 'receivingNumber' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="cursor-pointer" onClick={() => requestSort('vendorName')}>
                    Vendor {sortConfig.key === 'vendorName' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </TableHead>
                  <TableHead>PO #</TableHead>
                  <TableHead className="cursor-pointer" onClick={() => requestSort('date')}>
                    Order Date {sortConfig.key === 'date' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </TableHead>
                  <TableHead className="cursor-pointer" onClick={() => requestSort('expectedDeliveryDate')}>
                    Expected {sortConfig.key === 'expectedDeliveryDate' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </TableHead>
                  <TableHead className="cursor-pointer" onClick={() => requestSort('status')}>
                    Status {sortConfig.key === 'status' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </TableHead>
                  <TableHead className="text-right cursor-pointer" onClick={() => requestSort('total')}>
                    Total {sortConfig.key === 'total' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAndSortedOrders.map(order => (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium">{order.receivingNumber}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={getTypeColor(order.type)}>{order.type}</Badge>
                    </TableCell>
                    <TableCell>{order.vendorName}</TableCell>
                    <TableCell>{order.poNumber || '-'}</TableCell>
                    <TableCell>{formatDate(order.date)}</TableCell>
                    <TableCell>{formatDate(order.expectedDeliveryDate)}</TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(order.status)}>{order.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right">${order.total.toFixed(2)}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <Icon name="MoreHorizontal" className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => handleEditOrder(order)}>
                            <Icon name="Edit" className="mr-2 h-4 w-4" /> Edit
                          </DropdownMenuItem>
                          {order.status !== 'Received' && order.status !== 'Voided' && (
                            <DropdownMenuItem onClick={() => handleMarkAsReceived(order)}>
                              <Icon name="Check" className="mr-2 h-4 w-4" /> Mark as Received
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => { setOrderToDelete(order); setDeleteConfirmOpen(true); }}
                          >
                            <Icon name="Trash2" className="mr-2 h-4 w-4" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredAndSortedOrders.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      {receivingOrders.length === 0 ? "No receiving orders yet." : "No orders match your filters."}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Form Sheet */}
      <Sheet open={isFormOpen} onOpenChange={setIsFormOpen}>
        <SheetContent className="sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{editingOrder ? 'Edit Receiving Order' : 'New Receiving Order'}</SheetTitle>
            <SheetDescription>
              {editingOrder ? 'Update the receiving order details.' : 'Create a new receiving order to track incoming inventory.'}
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-6 py-6">
            {/* Header Fields */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Receiving Number</Label>
                <Input value={formData.receivingNumber} disabled className="bg-muted" />
              </div>
              <div>
                <Label>Type</Label>
                <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v as ReceivingType })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {RECEIVING_TYPES.map(t => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Vendor *</Label>
                <Select
                  value={formData.vendorId}
                  onValueChange={(v) => {
                    const vendor = vendors.find(vnd => vnd.id === v);
                    setFormData({ ...formData, vendorId: v, vendorName: vendor?.name || '' });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select vendor" />
                  </SelectTrigger>
                  <SelectContent>
                    {vendors.map(v => (
                      <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>PO Number</Label>
                <Input
                  value={formData.poNumber}
                  onChange={(e) => setFormData({ ...formData, poNumber: e.target.value })}
                  placeholder="Optional"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Order Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !formData.date && "text-muted-foreground")}>
                      {formData.date ? format(formData.date, "PPP") : "Pick a date"}
                      <Icon name="Calendar" className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={formData.date} onSelect={(d) => d && setFormData({ ...formData, date: d })} />
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <Label>Expected Delivery</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !formData.expectedDeliveryDate && "text-muted-foreground")}>
                      {formData.expectedDeliveryDate ? format(formData.expectedDeliveryDate, "PPP") : "Pick a date"}
                      <Icon name="Calendar" className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={formData.expectedDeliveryDate} onSelect={(d) => setFormData({ ...formData, expectedDeliveryDate: d })} />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div>
              <Label>Status</Label>
              <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v as ReceivingStatus })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RECEIVING_STATUSES.map(s => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Separator />

            {/* Line Items */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <Label className="text-base font-semibold">Line Items</Label>
                <Button type="button" variant="outline" size="sm" onClick={addLineItem}>
                  <Icon name="Plus" className="mr-1 h-4 w-4" /> Add Item
                </Button>
              </div>

              <div className="space-y-4">
                {formData.lineItems.map((item, index) => (
                  <div key={item.id} className="p-4 border rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-muted-foreground">Item {index + 1}</span>
                      {formData.lineItems.length > 1 && (
                        <Button type="button" variant="ghost" size="sm" onClick={() => removeLineItem(index)}>
                          <Icon name="Trash2" className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {/* Category Filter */}
                      <div>
                        <Label>Category</Label>
                        <Select
                          value={lineItemFilters[item.id]?.category || 'all'}
                          onValueChange={(v) => updateLineItemFilter(item.id, 'category', v)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="All Categories" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Categories</SelectItem>
                            {productCategories.map(cat => (
                              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Subcategory Filter */}
                      <div>
                        <Label>Subcategory</Label>
                        <Select
                          value={lineItemFilters[item.id]?.subcategory || 'all'}
                          onValueChange={(v) => updateLineItemFilter(item.id, 'subcategory', v)}
                          disabled={!lineItemFilters[item.id]?.category || lineItemFilters[item.id]?.category === 'all'}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="All Subcategories" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Subcategories</SelectItem>
                            {getAvailableSubcategories(lineItemFilters[item.id]?.category || '').map(sub => (
                              <SelectItem key={sub} value={sub}>{sub}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Product Selector */}
                      <div className="col-span-2">
                        <Label>Product</Label>
                        <Popover
                          open={lineItemFilters[item.id]?.popoverOpen || false}
                          onOpenChange={(open) => updateLineItemFilter(item.id, 'popoverOpen', open)}
                        >
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              role="combobox"
                              className={cn("w-full justify-between", !item.productId && "text-muted-foreground")}
                            >
                              {item.productId
                                ? products.find(p => p.id === item.productId)?.name || "Select product"
                                : "Select product"}
                              <Icon name="ChevronsUpDown" className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                            <Command>
                              <CommandInput placeholder="Search product..." />
                              <CommandList>
                                <CommandEmpty>No product found.</CommandEmpty>
                                <CommandGroup>
                                  {getFilteredProducts(item.id).map((product) => {
                                    const stock = product.quantityInStock ?? 0;
                                    const stockDisplay = stock <= 0 ? ' (Out of Stock)' : ` (Stock: ${stock})`;
                                    return (
                                      <CommandItem
                                        key={product.id}
                                        value={`${product.name} ${product.category || ''} ${product.subcategory || ''}`}
                                        onSelect={() => {
                                          updateLineItem(index, 'productId', product.id);
                                          updateLineItemFilter(item.id, 'popoverOpen', false);
                                        }}
                                      >
                                        <Icon
                                          name="Check"
                                          className={cn("mr-2 h-4 w-4", product.id === item.productId ? "opacity-100" : "opacity-0")}
                                        />
                                        <span className={cn(stock <= 0 && "text-destructive")}>
                                          {product.name} - ${(product.cost || 0).toFixed(2)}{stockDisplay}
                                        </span>
                                      </CommandItem>
                                    );
                                  })}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                      </div>
                      <div>
                        <Label>Expected Qty</Label>
                        <Input
                          type="number"
                          min={0}
                          value={item.expectedQuantity}
                          onChange={(e) => updateLineItem(index, 'expectedQuantity', parseInt(e.target.value) || 0)}
                        />
                      </div>
                      <div>
                        <Label>Received Qty</Label>
                        <Input
                          type="number"
                          min={0}
                          value={item.receivedQuantity}
                          onChange={(e) => updateLineItem(index, 'receivedQuantity', parseInt(e.target.value) || 0)}
                        />
                      </div>
                      <div>
                        <Label>Unit Price</Label>
                        <Input
                          type="number"
                          min={0}
                          step={0.01}
                          value={item.unitPrice}
                          onChange={(e) => updateLineItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                        />
                      </div>
                      <div>
                        <Label>Total</Label>
                        <Input value={`$${item.total.toFixed(2)}`} disabled className="bg-muted" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Subtotal */}
              <div className="flex justify-end mt-4">
                <div className="text-right">
                  <span className="text-muted-foreground">Subtotal: </span>
                  <span className="font-semibold">
                    ${formData.lineItems.reduce((sum, li) => sum + li.total, 0).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            <Separator />

            {/* Notes */}
            <div className="space-y-4">
              <div>
                <Label>Notes</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="General notes..."
                  rows={3}
                />
              </div>
              <div>
                <Label>Internal Notes</Label>
                <Textarea
                  value={formData.internalNotes}
                  onChange={(e) => setFormData({ ...formData, internalNotes: e.target.value })}
                  placeholder="Internal notes (not visible to vendors)..."
                  rows={3}
                />
              </div>
            </div>

            <Separator />

            {/* Packing Slip Upload */}
            <PackingSlipUpload
              packingSlipUrls={formData.packingSlipUrls || []}
              onPackingSlipChange={(urls) => setFormData({ ...formData, packingSlipUrls: urls })}
              disabled={isSaving}
            />

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <Button variant="outline" className="flex-1" onClick={() => setIsFormOpen(false)}>
                Cancel
              </Button>
              <Button className="flex-1" onClick={handleSaveOrder} disabled={isSaving}>
                {isSaving && <Icon name="Loader2" className="mr-2 h-4 w-4 animate-spin" />}
                {editingOrder ? 'Update Order' : 'Create Order'}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Receiving Order</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete receiving order {orderToDelete?.receivingNumber}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteOrder} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
