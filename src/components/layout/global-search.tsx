"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Icon } from '@/components/icons';
import { useFirebase } from '@/components/firebase-provider';
import { collection, onSnapshot } from 'firebase/firestore';
import type { Customer, Product, Order, Invoice, Estimate } from '@/types';

type SearchResult = {
  id: string;
  type: 'customer' | 'product' | 'order' | 'invoice' | 'estimate';
  title: string;
  subtitle?: string;
  href: string;
};

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const router = useRouter();
  const { db } = useFirebase();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [estimates, setEstimates] = useState<Estimate[]>([]);

  // Keyboard shortcut: Cmd+K or Ctrl+K
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  // Load data from Firebase
  useEffect(() => {
    if (!db) return;

    const unsubscribes: (() => void)[] = [];

    unsubscribes.push(
      onSnapshot(collection(db, 'customers'), (snapshot) => {
        const items = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Customer));
        setCustomers(items);
      })
    );

    unsubscribes.push(
      onSnapshot(collection(db, 'products'), (snapshot) => {
        const items = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Product));
        setProducts(items);
      })
    );

    unsubscribes.push(
      onSnapshot(collection(db, 'orders'), (snapshot) => {
        const items = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Order));
        setOrders(items);
      })
    );

    unsubscribes.push(
      onSnapshot(collection(db, 'invoices'), (snapshot) => {
        const items = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Invoice));
        setInvoices(items);
      })
    );

    unsubscribes.push(
      onSnapshot(collection(db, 'estimates'), (snapshot) => {
        const items = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Estimate));
        setEstimates(items);
      })
    );

    return () => unsubscribes.forEach(unsub => unsub());
  }, [db]);

  const searchResults = useMemo((): SearchResult[] => {
    if (!search) return [];

    const results: SearchResult[] = [];
    const searchLower = search.toLowerCase();

    // Search customers
    customers.forEach(customer => {
      const name = customer.name?.toLowerCase() || '';
      const email = customer.email?.toLowerCase() || '';
      const phone = customer.phone?.toLowerCase() || '';
      const company = customer.company?.toLowerCase() || '';

      if (name.includes(searchLower) || email.includes(searchLower) ||
          phone.includes(searchLower) || company.includes(searchLower)) {
        results.push({
          id: customer.id,
          type: 'customer',
          title: customer.name || 'Unknown Customer',
          subtitle: customer.company || customer.email,
          href: `/customers?id=${customer.id}`,
        });
      }
    });

    // Search products
    products.forEach(product => {
      const name = product.name?.toLowerCase() || '';
      const category = product.category?.toLowerCase() || '';
      const subcategory = product.subcategory?.toLowerCase() || '';

      if (name.includes(searchLower) || category.includes(searchLower) || subcategory.includes(searchLower)) {
        results.push({
          id: product.id,
          type: 'product',
          title: product.name,
          subtitle: `${product.category}${product.subcategory ? ` - ${product.subcategory}` : ''} • $${product.price?.toFixed(2) || '0.00'}`,
          href: `/products?id=${product.id}`,
        });
      }
    });

    // Search orders
    orders.forEach(order => {
      const orderNumber = order.orderNumber?.toString() || '';
      const customerName = order.customerName?.toLowerCase() || '';

      if (orderNumber.includes(searchLower) || customerName.includes(searchLower)) {
        results.push({
          id: order.id,
          type: 'order',
          title: `Order #${order.orderNumber}`,
          subtitle: `${order.customerName} • ${new Date(order.date).toLocaleDateString()}`,
          href: `/orders?id=${order.id}`,
        });
      }
    });

    // Search invoices
    invoices.forEach(invoice => {
      const invoiceNumber = invoice.invoiceNumber?.toString() || '';
      const customerName = invoice.customerName?.toLowerCase() || '';

      if (invoiceNumber.includes(searchLower) || customerName.includes(searchLower)) {
        results.push({
          id: invoice.id,
          type: 'invoice',
          title: `Invoice #${invoice.invoiceNumber}`,
          subtitle: `${invoice.customerName} • ${new Date(invoice.date).toLocaleDateString()}`,
          href: `/invoices?id=${invoice.id}`,
        });
      }
    });

    // Search estimates
    estimates.forEach(estimate => {
      const estimateNumber = estimate.estimateNumber?.toString() || '';
      const customerName = estimate.customerName?.toLowerCase() || '';

      if (estimateNumber.includes(searchLower) || customerName.includes(searchLower)) {
        results.push({
          id: estimate.id,
          type: 'estimate',
          title: `Estimate #${estimate.estimateNumber}`,
          subtitle: `${estimate.customerName} • ${new Date(estimate.date).toLocaleDateString()}`,
          href: `/estimates?id=${estimate.id}`,
        });
      }
    });

    return results.slice(0, 50); // Limit to 50 results
  }, [search, customers, products, orders, invoices, estimates]);

  const groupedResults = useMemo(() => {
    const grouped: Record<string, SearchResult[]> = {
      customer: [],
      product: [],
      order: [],
      invoice: [],
      estimate: [],
    };

    searchResults.forEach(result => {
      grouped[result.type].push(result);
    });

    return grouped;
  }, [searchResults]);

  const handleSelect = (href: string) => {
    setOpen(false);
    setSearch('');
    router.push(href);
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'customer': return 'Users';
      case 'product': return 'Package';
      case 'order': return 'ShoppingCart';
      case 'invoice': return 'FileDigit';
      case 'estimate': return 'FileText';
      default: return 'Search';
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 w-full max-w-sm hover:bg-accent hover:text-accent-foreground transition-colors"
      >
        <Icon name="Search" className="h-4 w-4 text-muted-foreground" />
        <span className="text-muted-foreground">Search...</span>
        <kbd className="ml-auto pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
          <span className="text-xs">⌘</span>K
        </kbd>
      </button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput
          placeholder="Search customers, products, orders..."
          value={search}
          onValueChange={setSearch}
        />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>

          {groupedResults.customer.length > 0 && (
            <>
              <CommandGroup heading="Customers">
                {groupedResults.customer.map((result) => (
                  <CommandItem
                    key={result.id}
                    value={result.title}
                    onSelect={() => handleSelect(result.href)}
                  >
                    <Icon name={getIcon(result.type)} className="mr-2 h-4 w-4" />
                    <div className="flex flex-col">
                      <span>{result.title}</span>
                      {result.subtitle && (
                        <span className="text-xs text-muted-foreground">{result.subtitle}</span>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
              <CommandSeparator />
            </>
          )}

          {groupedResults.product.length > 0 && (
            <>
              <CommandGroup heading="Products">
                {groupedResults.product.map((result) => (
                  <CommandItem
                    key={result.id}
                    value={result.title}
                    onSelect={() => handleSelect(result.href)}
                  >
                    <Icon name={getIcon(result.type)} className="mr-2 h-4 w-4" />
                    <div className="flex flex-col">
                      <span>{result.title}</span>
                      {result.subtitle && (
                        <span className="text-xs text-muted-foreground">{result.subtitle}</span>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
              <CommandSeparator />
            </>
          )}

          {groupedResults.estimate.length > 0 && (
            <>
              <CommandGroup heading="Estimates">
                {groupedResults.estimate.map((result) => (
                  <CommandItem
                    key={result.id}
                    value={result.title}
                    onSelect={() => handleSelect(result.href)}
                  >
                    <Icon name={getIcon(result.type)} className="mr-2 h-4 w-4" />
                    <div className="flex flex-col">
                      <span>{result.title}</span>
                      {result.subtitle && (
                        <span className="text-xs text-muted-foreground">{result.subtitle}</span>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
              <CommandSeparator />
            </>
          )}

          {groupedResults.order.length > 0 && (
            <>
              <CommandGroup heading="Orders">
                {groupedResults.order.map((result) => (
                  <CommandItem
                    key={result.id}
                    value={result.title}
                    onSelect={() => handleSelect(result.href)}
                  >
                    <Icon name={getIcon(result.type)} className="mr-2 h-4 w-4" />
                    <div className="flex flex-col">
                      <span>{result.title}</span>
                      {result.subtitle && (
                        <span className="text-xs text-muted-foreground">{result.subtitle}</span>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
              <CommandSeparator />
            </>
          )}

          {groupedResults.invoice.length > 0 && (
            <>
              <CommandGroup heading="Invoices">
                {groupedResults.invoice.map((result) => (
                  <CommandItem
                    key={result.id}
                    value={result.title}
                    onSelect={() => handleSelect(result.href)}
                  >
                    <Icon name={getIcon(result.type)} className="mr-2 h-4 w-4" />
                    <div className="flex flex-col">
                      <span>{result.title}</span>
                      {result.subtitle && (
                        <span className="text-xs text-muted-foreground">{result.subtitle}</span>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}
