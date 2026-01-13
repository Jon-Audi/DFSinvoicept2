"use client";

import React, { useState } from 'react';
import type { ReceivingOrder, Vendor, Product, ReceivingStatus, ReceivingType } from '@/types';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/icons';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { cn } from '@/lib/utils';

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
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return 'Invalid date';
  }
};

interface ReceivingTableProps {
  orders: ReceivingOrder[];
  onEdit: (order: ReceivingOrder) => void;
  onMarkAsReceived: (order: ReceivingOrder) => void;
  onDelete: (order: ReceivingOrder) => void;
}

export function ReceivingTable({
  orders,
  onEdit,
  onMarkAsReceived,
  onDelete,
}: ReceivingTableProps) {
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  const toggleExpand = (orderId: string) => {
    setExpandedOrderId(expandedOrderId === orderId ? null : orderId);
  };

  if (orders.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No receiving orders yet.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {orders.map((order) => {
        const isExpanded = expandedOrderId === order.id;
        
        return (
          <Card 
            key={order.id}
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => toggleExpand(order.id)}
          >
            <CardContent className="p-4">
              {/* Collapsed View - Main Info */}
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-lg">#{order.receivingNumber}</span>
                    <Badge variant="outline" className={getTypeColor(order.type)}>
                      {order.type}
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {order.vendorName}
                    {order.poNumber && ` • PO: ${order.poNumber}`}
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge className={getStatusColor(order.status)}>
                      {order.status}
                    </Badge>
                    <span className="text-sm font-medium">${order.total.toFixed(2)}</span>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Icon 
                    name={isExpanded ? "ChevronUp" : "ChevronDown"} 
                    className="h-5 w-5 text-muted-foreground"
                  />
                </div>
              </div>

              {/* Expanded View - Details */}
              {isExpanded && (
                <div 
                  className="mt-4 pt-4 border-t space-y-3"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Dates */}
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <div className="text-muted-foreground text-xs mb-1">Order Date</div>
                      <div className="font-medium">{formatDate(order.date)}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground text-xs mb-1">Expected Delivery</div>
                      <div className="font-medium">{formatDate(order.expectedDeliveryDate)}</div>
                    </div>
                  </div>

                  {/* Additional Info */}
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <div className="text-muted-foreground text-xs mb-1">Subtotal</div>
                      <div className="font-medium">${(order.subtotal || 0).toFixed(2)}</div>
                    </div>
                    {order.taxAmount !== undefined && order.taxAmount > 0 && (
                      <div>
                        <div className="text-muted-foreground text-xs mb-1">Tax</div>
                        <div className="font-medium">${order.taxAmount.toFixed(2)}</div>
                      </div>
                    )}
                  </div>

                  {/* Notes */}
                  {order.notes && (
                    <div className="text-sm">
                      <div className="text-muted-foreground text-xs mb-1">Notes</div>
                      <div className="mt-1 text-sm bg-muted p-2 rounded">
                        {order.notes}
                      </div>
                    </div>
                  )}

                  {/* Line Items Summary */}
                  {order.lineItems && order.lineItems.length > 0 ? (
                    <div className="text-sm">
                      <div className="text-muted-foreground text-xs mb-2">Items ({order.lineItems.length})</div>
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {order.lineItems.map((item, idx) => (
                          <div key={idx} className="flex justify-between py-2 px-2 bg-muted/50 rounded">
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-sm truncate">{item.description || 'No description'}</div>
                              {item.notes && (
                                <div className="text-xs text-muted-foreground mt-1">{item.notes}</div>
                              )}
                            </div>
                            <div className="text-right ml-4 flex-shrink-0">
                              <div className="text-sm font-medium">
                                {item.quantityOrdered || 0} {item.unit || 'pcs'}
                              </div>
                              {item.quantityReceived !== undefined && item.quantityReceived !== null && (
                                <div className="text-xs text-green-600">
                                  {item.quantityReceived} received
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground italic">
                      No line items
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEdit(order);
                      }}
                    >
                      <Icon name="Edit" className="mr-2 h-4 w-4" />
                      Edit
                    </Button>
                    
                    {order.status !== 'Received' && order.status !== 'Voided' && (
                      <Button
                        variant="default"
                        size="sm"
                        className="flex-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          onMarkAsReceived(order);
                        }}
                      >
                        <Icon name="Check" className="mr-2 h-4 w-4" />
                        Mark Received
                      </Button>
                    )}
                    
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(order);
                      }}
                    >
                      <Icon name="Trash2" className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
