"use client";

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Icon } from '@/components/icons';
import { cn } from '@/lib/utils';
import type { Customer, Product, CompanySettings } from '@/types';
import { ALL_CATEGORIES_MARKUP_KEY } from '@/lib/constants';
import { PrintablePriceSheet } from './printable-price-sheet';
import { useReactToPrint } from 'react-to-print';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';

interface CustomerPriceSheetDialogProps {
  customers: Customer[];
  products: Product[];
  companySettings: CompanySettings | null;
}

export function CustomerPriceSheetDialog({
  customers,
  products,
  companySettings,
}: CustomerPriceSheetDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(new Set());
  const printRef = React.useRef<HTMLDivElement>(null);

  const selectedCustomer = customers.find(c => c.id === selectedCustomerId);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Price_Sheet_${selectedCustomer?.companyName || selectedCustomer?.firstName}_${new Date().toLocaleDateString()}`,
    print: async (printIframe) => {
      // Wait a bit for images to load from URL before printing
      await new Promise((resolve) => setTimeout(resolve, 500));

      const document = printIframe.contentDocument;
      if (document) {
        document.defaultView?.print();
      }
    },
  });

  const calculateCustomerPrice = (product: Product, customer: Customer): number => {
    let finalPrice = product.price;
    if (customer.specificMarkups && customer.specificMarkups.length > 0) {
      const specificRule = customer.specificMarkups.find(m => m.categoryName === product.category);
      const allCategoriesRule = customer.specificMarkups.find(m => m.categoryName === ALL_CATEGORIES_MARKUP_KEY);

      if (specificRule) {
        finalPrice = product.cost * (1 + specificRule.markupPercentage / 100);
      } else if (allCategoriesRule) {
        finalPrice = product.cost * (1 + allCategoriesRule.markupPercentage / 100);
      }
    }
    return parseFloat(finalPrice.toFixed(2));
  };

  const customerProducts = React.useMemo(() => {
    if (!selectedCustomer) return products;

    return products.map(p => ({
      ...p,
      price: calculateCustomerPrice(p, selectedCustomer),
    }));
  }, [products, selectedCustomer]);

  const filteredProductsForPrinting = React.useMemo(() => {
    if (selectedProductIds.size === 0) {
      return customerProducts; // If no products selected, show all
    }
    return customerProducts.filter(p => selectedProductIds.has(p.id));
  }, [customerProducts, selectedProductIds]);

  const groupedProducts = React.useMemo(() => {
    const grouped = new Map<string, Product[]>();
    filteredProductsForPrinting.forEach(product => {
      const category = product.category || 'Uncategorized';
      if (!grouped.has(category)) {
        grouped.set(category, []);
      }
      grouped.get(category)!.push(product);
    });
    return new Map([...grouped.entries()].sort());
  }, [filteredProductsForPrinting]);

  const customerDisplayName = selectedCustomer
    ? (selectedCustomer.companyName || `${selectedCustomer.firstName} ${selectedCustomer.lastName}`)
    : '';

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline">
            <Icon name="Printer" className="mr-2 h-4 w-4" />
            Customer Price Sheet
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Print Customer Price Sheet</DialogTitle>
            <DialogDescription>
              Select a customer to print a price sheet with their custom pricing.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Select Customer</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" role="combobox" className={cn("w-full justify-between", !selectedCustomerId && "text-muted-foreground")}>
                    {selectedCustomerId
                      ? customerDisplayName
                      : "Select customer"}
                    <Icon name="ChevronsUpDown" className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                  <Command>
                    <CommandInput placeholder="Search customer..." />
                    <CommandList>
                      <CommandEmpty>No customer found.</CommandEmpty>
                      <CommandGroup>
                        {customers.map((customer) => {
                          const displayName = customer.companyName
                            ? `${customer.companyName} (${customer.firstName} ${customer.lastName})`
                            : `${customer.firstName} ${customer.lastName}`;
                          return (
                            <CommandItem
                              value={displayName}
                              key={customer.id}
                              onSelect={() => {
                                setSelectedCustomerId(customer.id);
                              }}
                            >
                              <Icon
                                name="Check"
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  customer.id === selectedCustomerId ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {displayName}
                            </CommandItem>
                          );
                        })}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
            {selectedCustomerId && (
              <div>
                <label className="text-sm font-medium mb-2 block">Select Products to Include (Optional)</label>
                <p className="text-xs text-muted-foreground mb-2">Leave all unchecked to include all products</p>
                <ScrollArea className="h-[200px] border rounded-md p-4">
                  <div className="space-y-2">
                    {customerProducts.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No products available</p>
                    ) : (
                      customerProducts.map((product) => (
                        <div key={product.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={product.id}
                            checked={selectedProductIds.has(product.id)}
                            onCheckedChange={(checked) => {
                              const newSet = new Set(selectedProductIds);
                              if (checked) {
                                newSet.add(product.id);
                              } else {
                                newSet.delete(product.id);
                              }
                              setSelectedProductIds(newSet);
                            }}
                          />
                          <label
                            htmlFor={product.id}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                          >
                            {product.name}
                          </label>
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => {
                if (selectedCustomerId) {
                  handlePrint();
                }
              }} disabled={!selectedCustomerId}>
                <Icon name="Printer" className="mr-2 h-4 w-4" />
                Print
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Hidden print component */}
      <div style={{ display: 'none' }}>
        <PrintablePriceSheet
          ref={printRef}
          groupedProducts={groupedProducts}
          companySettings={companySettings}
          customerName={customerDisplayName}
        />
      </div>
    </>
  );
}
