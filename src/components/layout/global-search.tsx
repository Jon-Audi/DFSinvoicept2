"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
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
import { collection, getDocs } from 'firebase/firestore';
import type { Customer, Product, Order, Invoice, Estimate } from '@/types';
import { debounce } from '@/hooks/use-optimistic-update';

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
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);
  const router = useRouter();
  const { db } = useFirebase();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [estimates, setEstimates] = useState<Estimate[]>([]);

  // Debounce search input for better performance
  const debouncedSetSearch = useCallback(
    debounce((value: string) => {
      setDebouncedSearch(value);
    }, 300),
    []
  );

  useEffect(() => {
    debouncedSetSearch(search);
  }, [search, debouncedSetSearch]);

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

  // Load data only when dialog opens (lazy loading for performance)
  useEffect(() => {
    if (!db || !open || dataLoaded) return;

    const loadData = async () => {
      setIsLoading(true);
      try {
        // Fetch all collections in parallel
        const [
          customersSnap,
          productsSnap,
          ordersSnap,
          invoicesSnap,
          estimatesSnap
        ] = await Promise.all([
          getDocs(collection(db, 'customers')),
          getDocs(collection(db, 'products')),
          getDocs(collection(db, 'orders')),
          getDocs(collection(db, 'invoices')),
          getDocs(collection(db, 'estimates')),
        ]);

        setCustomers(customersSnap.docs.map(doc => ({ ...doc.data(), id: doc.id } as Customer)));
        setProducts(productsSnap.docs.map(doc => ({ ...doc.data(), id: doc.id } as Product)));
        setOrders(ordersSnap.docs.map(doc => ({ ...doc.data(), id: doc.id } as Order)));
        setInvoices(invoicesSnap.docs.map(doc => ({ ...doc.data(), id: doc.id } as Invoice)));
        setEstimates(estimatesSnap.docs.map(doc => ({ ...doc.data(), id: doc.id } as Estimate)));
        setDataLoaded(true);
      } catch (error) {
        console.error('Error loading search data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [db, open, dataLoaded]);

  // Helper to get customer display name
  const getCustomerDisplayName = (customer: Customer): string => {
    if (customer.companyName) return customer.companyName;
    return `${customer.firstName || ''} ${customer.lastName || ''}`.trim() || 'Unknown Customer';
  };

  // Helper to get customer email
  const getCustomerEmail = (customer: Customer): string => {
    if (!customer.emailContacts || customer.emailContacts.length === 0) return '';
    const mainContact = customer.emailContacts.find(e => e.type === 'Main Contact');
    return mainContact?.email || customer.emailContacts[0]?.email || '';
  };

  const searchResults = useMemo((): SearchResult[] => {
    if (!debouncedSearch || isLoading) return [];

    const results: SearchResult[] = [];
    const searchLower = debouncedSearch.toLowerCase();

    // Search customers - using correct property names
    customers.forEach(customer => {
      const displayName = getCustomerDisplayName(customer).toLowerCase();
      const firstName = customer.firstName?.toLowerCase() || '';
      const lastName = customer.lastName?.toLowerCase() || '';
      const companyName = customer.companyName?.toLowerCase() || '';
      const phone = customer.phone?.toLowerCase() || '';
      const email = getCustomerEmail(customer).toLowerCase();

      if (displayName.includes(searchLower) ||
          firstName.includes(searchLower) ||
          lastName.includes(searchLower) ||
          companyName.includes(searchLower) ||
          phone.includes(searchLower) ||
          email.includes(searchLower)) {
        results.push({
          id: customer.id,
          type: 'customer',
          title: getCustomerDisplayName(customer),
          subtitle: email || phone || customer.customerType,
          href: `/customers/${customer.id}`,
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
          subtitle: `${product.category}${product.subcategory ? ` - ${product.subcategory}` : ''} - $${product.price?.toFixed(2) || '0.00'}`,
          href: `/products?id=${product.id}`,
        });
      }
    });

    // Search orders
    orders.forEach(order => {
      const orderNumber = order.orderNumber?.toString().toLowerCase() || '';
      const customerName = order.customerName?.toLowerCase() || '';

      if (orderNumber.includes(searchLower) || customerName.includes(searchLower)) {
        results.push({
          id: order.id,
          type: 'order',
          title: `Order #${order.orderNumber}`,
          subtitle: `${order.customerName} - ${new Date(order.date).toLocaleDateString()}`,
          href: `/orders?id=${order.id}`,
        });
      }
    });

    // Search invoices
    invoices.forEach(invoice => {
      const invoiceNumber = invoice.invoiceNumber?.toString().toLowerCase() || '';
      const customerName = invoice.customerName?.toLowerCase() || '';

      if (invoiceNumber.includes(searchLower) || customerName.includes(searchLower)) {
        results.push({
          id: invoice.id,
          type: 'invoice',
          title: `Invoice #${invoice.invoiceNumber}`,
          subtitle: `${invoice.customerName} - ${new Date(invoice.date).toLocaleDateString()}`,
          href: `/invoices?id=${invoice.id}`,
        });
      }
    });

    // Search estimates
    estimates.forEach(estimate => {
      const estimateNumber = estimate.estimateNumber?.toString().toLowerCase() || '';
      const customerName = estimate.customerName?.toLowerCase() || '';

      if (estimateNumber.includes(searchLower) || customerName.includes(searchLower)) {
        results.push({
          id: estimate.id,
          type: 'estimate',
          title: `Estimate #${estimate.estimateNumber}`,
          subtitle: `${estimate.customerName} - ${new Date(estimate.date).toLocaleDateString()}`,
          href: `/estimates?id=${estimate.id}`,
        });
      }
    });

    return results.slice(0, 50); // Limit to 50 results
  }, [debouncedSearch, customers, products, orders, invoices, estimates, isLoading]);

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

  // Invalidate cache when dialog closes to get fresh data next time
  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      // Reset data after a delay to allow for quick re-opens
      setTimeout(() => {
        if (!open) {
          setDataLoaded(false);
        }
      }, 60000); // Keep data for 1 minute after closing
    }
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

      <CommandDialog open={open} onOpenChange={handleOpenChange}>
        <CommandInput
          placeholder="Search customers, products, orders..."
          value={search}
          onValueChange={setSearch}
        />
        <CommandList>
          {isLoading ? (
            <div className="py-6 text-center text-sm text-muted-foreground">
              <Icon name="Loader2" className="mx-auto h-6 w-6 animate-spin mb-2" />
              Loading search data...
            </div>
          ) : (
            <>
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
            </>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}
