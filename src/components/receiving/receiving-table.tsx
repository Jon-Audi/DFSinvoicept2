"use client";

import React, { useState } from 'react';
import type { ReceivingOrder, ReceivingLineItem, ReceivingStatus, ReceivingType } from '@/types';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/icons';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import {
  Card,
  CardContent,
} from "@/components/ui/card";
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
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';

const RECEIVING_STATUSES: ReceivingStatus[] = ['Expected', 'In Transit', 'Partially Received', 'Received', 'Discrepancy', 'Voided'];

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
    return 'Invalid date';
  }
};

interface ReceivingTableProps {
  orders: ReceivingOrder[];
  onEdit: (order: ReceivingOrder) => void;
  onMarkAsReceived: (order: ReceivingOrder) => void;
  onDelete: (order: ReceivingOrder) => void;
  onUpdateStatus?: (order: ReceivingOrder, newStatus: ReceivingStatus) => Promise<void>;
  onUpdateReceivedQuantities?: (order: ReceivingOrder, lineItems: ReceivingLineItem[]) => Promise<void>;
  onUpdateNotes?: (order: ReceivingOrder, notes: string, internalNotes: string) => Promise<void>;
  onUpdateEta?: (order: ReceivingOrder, eta: Date | undefined) => Promise<void>;
}

export function ReceivingTable({
  orders,
  onEdit,
  onMarkAsReceived,
  onDelete,
  onUpdateStatus,
  onUpdateReceivedQuantities,
  onUpdateNotes,
  onUpdateEta,
}: ReceivingTableProps) {
  // Detail sheet state
  const [selectedOrder, setSelectedOrder] = useState<ReceivingOrder | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  // Status confirmation
  const [showStatusConfirm, setShowStatusConfirm] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<ReceivingStatus | null>(null);

  // Editing states
  const [editingReceivedQty, setEditingReceivedQty] = useState<Record<string, number>>({});
  const [editingNotes, setEditingNotes] = useState('');
  const [editingInternalNotes, setEditingInternalNotes] = useState('');
  const [editingEta, setEditingEta] = useState<Date | undefined>(undefined);
  const [isEditingEta, setIsEditingEta] = useState(false);

  // Open detail sheet
  const openDetail = (order: ReceivingOrder) => {
    setSelectedOrder(order);
    setIsDetailOpen(true);

    // Initialize editing state with existing values
    const initialQty: Record<string, number> = {};
    order.lineItems.forEach(li => {
      initialQty[li.id] = li.receivedQuantity ?? 0;
    });
    setEditingReceivedQty(initialQty);
    setEditingNotes(order.notes || '');
    setEditingInternalNotes(order.internalNotes || '');
    setEditingEta(order.expectedDeliveryDate ? parseISO(order.expectedDeliveryDate) : undefined);
    setIsEditingEta(false);
  };

  // Handle status update
  const handleStatusUpdate = async (newStatus: ReceivingStatus) => {
    if (!selectedOrder || !onUpdateStatus) return;

    setIsUpdating(true);
    try {
      await onUpdateStatus(selectedOrder, newStatus);
      setShowStatusConfirm(false);
      setPendingStatus(null);
    } finally {
      setIsUpdating(false);
    }
  };

  // Save received quantities
  const handleSaveReceivedQuantities = async () => {
    if (!selectedOrder || !onUpdateReceivedQuantities) return;

    setIsUpdating(true);
    try {
      const updatedLineItems = selectedOrder.lineItems.map(li => ({
        ...li,
        receivedQuantity: editingReceivedQty[li.id] ?? li.receivedQuantity ?? 0,
      }));
      await onUpdateReceivedQuantities(selectedOrder, updatedLineItems);
    } finally {
      setIsUpdating(false);
    }
  };

  // Save notes
  const handleSaveNotes = async () => {
    if (!selectedOrder || !onUpdateNotes) return;

    setIsUpdating(true);
    try {
      await onUpdateNotes(selectedOrder, editingNotes, editingInternalNotes);
    } finally {
      setIsUpdating(false);
    }
  };

  // Save ETA
  const handleSaveEta = async () => {
    if (!selectedOrder || !onUpdateEta) return;

    setIsUpdating(true);
    try {
      await onUpdateEta(selectedOrder, editingEta);
      setIsEditingEta(false);
    } finally {
      setIsUpdating(false);
    }
  };

  if (orders.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Icon name="Package" className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>No receiving orders found.</p>
        <p className="text-sm mt-1">Create a new receiving order to track incoming inventory.</p>
      </div>
    );
  }

  return (
    <>
      {/* Touch-Friendly Card List */}
      <div className="space-y-3">
        {orders.map((order) => (
          <Card
            key={order.id}
            className="cursor-pointer hover:shadow-md transition-shadow active:bg-accent/50"
            onClick={() => openDetail(order)}
          >
            <CardContent className="p-4">
              {/* Main Info Row */}
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-semibold text-lg">{order.vendorName}</span>
                    <Badge variant="outline" className={getTypeColor(order.type)}>
                      {order.type}
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground truncate">
                    RCV #{order.receivingNumber}
                    {order.poNumber && ` • PO: ${order.poNumber}`}
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1">
                  <Badge className={getStatusColor(order.status)}>
                    {order.status}
                  </Badge>
                </div>
              </div>

              {/* Secondary Info Row */}
              <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Icon name="Calendar" className="h-4 w-4" />
                  {formatDate(order.date)}
                </div>
                {order.expectedDeliveryDate && (
                  <div className="flex items-center gap-1">
                    <Icon name="Truck" className="h-4 w-4" />
                    ETA: {formatDate(order.expectedDeliveryDate)}
                  </div>
                )}
                <div className="flex items-center gap-1">
                  <Icon name="Package" className="h-4 w-4" />
                  {order.lineItems.length} items
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Detail Sheet */}
      <Sheet open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <SheetContent size="xl" className="p-0 flex flex-col !h-[100vh] overflow-hidden">
          {selectedOrder && (
            <>
              <SheetHeader className="px-6 pt-6 pb-4 border-b shrink-0">
                <div className="flex items-start justify-between">
                  <div>
                    <SheetTitle>
                      Receiving #{selectedOrder.receivingNumber}
                    </SheetTitle>
                    <SheetDescription>
                      {selectedOrder.vendorName}
                      {selectedOrder.poNumber && ` • PO: ${selectedOrder.poNumber}`}
                    </SheetDescription>
                  </div>
                  <Badge className={cn("text-sm", getStatusColor(selectedOrder.status))}>
                    {selectedOrder.status}
                  </Badge>
                </div>
              </SheetHeader>

              <div className="flex-1 overflow-y-auto px-6 py-4 min-h-0">
                <div className="space-y-6">
                  {/* Order Info Grid */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Type</label>
                      <p className="font-medium">
                        <Badge variant="outline" className={getTypeColor(selectedOrder.type)}>
                          {selectedOrder.type}
                        </Badge>
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">PO Number</label>
                      <p className="font-medium">{selectedOrder.poNumber || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Order Date</label>
                      <p className="font-medium">{formatDate(selectedOrder.date)}</p>
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
                          <Button size="sm" onClick={handleSaveEta} disabled={isUpdating || !onUpdateEta}>
                            <Icon name="Check" className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setIsEditingEta(false)}>
                            <Icon name="X" className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{formatDate(selectedOrder.expectedDeliveryDate)}</p>
                          {onUpdateEta && (
                            <Button size="sm" variant="ghost" onClick={() => setIsEditingEta(true)}>
                              <Icon name="Edit" className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                    {selectedOrder.actualDeliveryDate && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Actual Delivery</label>
                        <p className="font-medium text-green-600">{formatDate(selectedOrder.actualDeliveryDate)}</p>
                      </div>
                    )}
                  </div>

                  <Separator />

                  {/* Line Items with Received Quantities */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold">Line Items</h3>
                      {onUpdateReceivedQuantities && (
                        <Button size="sm" onClick={handleSaveReceivedQuantities} disabled={isUpdating}>
                          {isUpdating ? <Icon name="Loader2" className="mr-2 h-4 w-4 animate-spin" /> : <Icon name="Save" className="mr-2 h-4 w-4" />}
                          Save Quantities
                        </Button>
                      )}
                    </div>
                    <div className="space-y-2">
                      {selectedOrder.lineItems.map(item => {
                        const expectedQty = item.expectedQuantity || 0;
                        const receivedQty = editingReceivedQty[item.id] ?? 0;
                        const remainingQty = Math.max(0, expectedQty - receivedQty);
                        const isFullyReceived = receivedQty >= expectedQty;
                        const isPartiallyReceived = receivedQty > 0 && receivedQty < expectedQty;

                        return (
                          <div
                            key={item.id}
                            className={cn(
                              "p-4 border rounded-lg",
                              isFullyReceived && "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800",
                              isPartiallyReceived && "bg-yellow-50 dark:bg-yellow-950/30 border-yellow-200 dark:border-yellow-800"
                            )}
                          >
                            <div className="flex justify-between items-center mb-2">
                              <span className="font-medium">{item.productName || 'Unknown Product'}</span>
                              <Badge variant="secondary" className="text-sm">Expected: {expectedQty}</Badge>
                            </div>
                            <div className="flex flex-wrap items-center gap-4">
                              <div className="flex items-center gap-2">
                                <Label className="text-sm text-muted-foreground">Received:</Label>
                                <Input
                                  type="number"
                                  min={0}
                                  value={receivedQty}
                                  onChange={(e) => setEditingReceivedQty(prev => ({
                                    ...prev,
                                    [item.id]: Math.max(0, parseInt(e.target.value) || 0)
                                  }))}
                                  className="w-20 h-8"
                                  disabled={!onUpdateReceivedQuantities}
                                />
                              </div>
                              {remainingQty > 0 && (
                                <Badge variant="outline" className="bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800">
                                  Remaining: {remainingQty}
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
                  {onUpdateStatus && (
                    <>
                      <div>
                        <h3 className="font-semibold mb-3">Update Status</h3>
                        <div className="flex flex-wrap gap-2">
                          {RECEIVING_STATUSES.map(status => (
                            <Button
                              key={status}
                              variant={selectedOrder.status === status ? "default" : "outline"}
                              size="sm"
                              onClick={() => {
                                setPendingStatus(status);
                                setShowStatusConfirm(true);
                              }}
                              disabled={selectedOrder.status === status}
                              className="min-w-[100px]"
                            >
                              {status}
                            </Button>
                          ))}
                        </div>
                      </div>
                      <Separator />
                    </>
                  )}

                  {/* Notes Section */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold">Notes</h3>
                      {onUpdateNotes && (
                        <Button
                          size="sm"
                          onClick={handleSaveNotes}
                          disabled={isUpdating || (editingNotes === (selectedOrder.notes || '') && editingInternalNotes === (selectedOrder.internalNotes || ''))}
                        >
                          {isUpdating ? <Icon name="Loader2" className="mr-2 h-4 w-4 animate-spin" /> : <Icon name="Save" className="mr-2 h-4 w-4" />}
                          Save Notes
                        </Button>
                      )}
                    </div>
                    <div className="space-y-4">
                      <div>
                        <Label>General Notes</Label>
                        <Textarea
                          value={editingNotes}
                          onChange={(e) => setEditingNotes(e.target.value)}
                          placeholder="Notes visible on the order..."
                          rows={3}
                          disabled={!onUpdateNotes}
                        />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Label>Internal Notes</Label>
                          <Badge variant="outline" className="text-xs">Back of House Only</Badge>
                        </div>
                        <Textarea
                          value={editingInternalNotes}
                          onChange={(e) => setEditingInternalNotes(e.target.value)}
                          placeholder="Internal notes (not shared with vendors)..."
                          rows={3}
                          disabled={!onUpdateNotes}
                        />
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Quick Actions */}
                  <div>
                    <h3 className="font-semibold mb-3">Actions</h3>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setIsDetailOpen(false);
                          onEdit(selectedOrder);
                        }}
                      >
                        <Icon name="Edit" className="mr-2 h-4 w-4" />
                        Edit Full Order
                      </Button>

                      {selectedOrder.status !== 'Received' && selectedOrder.status !== 'Voided' && (
                        <Button
                          variant="default"
                          onClick={() => {
                            setIsDetailOpen(false);
                            onMarkAsReceived(selectedOrder);
                          }}
                        >
                          <Icon name="Check" className="mr-2 h-4 w-4" />
                          Mark All Received & Update Inventory
                        </Button>
                      )}

                      <Button
                        variant="destructive"
                        onClick={() => {
                          setIsDetailOpen(false);
                          onDelete(selectedOrder);
                        }}
                      >
                        <Icon name="Trash2" className="mr-2 h-4 w-4" />
                        Delete
                      </Button>
                    </div>
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
                <span className="block mt-2 text-sm font-medium">
                  Note: This will NOT automatically update inventory. Use &quot;Mark All Received &amp; Update Inventory&quot; button for that.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isUpdating}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => pendingStatus && handleStatusUpdate(pendingStatus)}
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
