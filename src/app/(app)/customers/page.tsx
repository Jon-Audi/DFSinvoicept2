
"use client";

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/icons';
import { CustomerTable } from '@/components/customers/customer-table';
import { CustomerDialog } from '@/components/customers/customer-dialog';
import { CustomerCreditDialog } from '@/components/customers/customer-credit-dialog';
import type { Customer, Estimate, Order, Invoice } from '@/types';
import { useToast } from "@/hooks/use-toast";
import { useFirebase } from '@/components/firebase-provider';
import { collection, addDoc, setDoc, deleteDoc, onSnapshot, doc, writeBatch, getDocs } from 'firebase/firestore';
import { Input } from '@/components/ui/input';
import { PrintableCustomerList } from '@/components/customers/printable-customer-list';
import { useCustomers, useEstimates, useOrders, useInvoices, useCustomerMutations } from '@/hooks/use-data-query';

type CustomerWithLastInteraction = Customer & {
  lastEstimateDate?: string;
  lastPurchaseDate?: string;
};

const buildSearchIndex = (c: Partial<Customer>) => {
  const parts = [
    c.companyName ?? "",
    c.firstName ?? "",
    c.lastName ?? "",
    ...(c.emailContacts?.map(e => e.email) || []),
    c.phone ?? "",
  ]
    .join(" ")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, " ")
    .trim();
  return parts || null;
};

const cleanFirestoreData = <T extends object>(data: T): Partial<T> => {
  const cleaned: Partial<T> = {};
  for (const key in data) {
    const value = data[key];
    if (value !== undefined && value !== null) {
      if (Array.isArray(value)) {
        (cleaned as any)[key] = value.map(cleanFirestoreData).filter(item => item !== undefined);
      } else if (typeof value === 'object' && !Array.isArray(value) && value !== null) {
        const cleanedObject = cleanFirestoreData(value as object);
        if (Object.keys(cleanedObject).length > 0) {
            (cleaned as any)[key] = cleanedObject;
        }
      } else {
        (cleaned as any)[key] = value;
      }
    }
  }
  return cleaned;
};


const hasName = (c: Partial<Customer>) => {
  const company = (c.companyName ?? "").trim();
  const person = [c.firstName, c.lastName].filter(Boolean).join(" ").trim();
  return Boolean(company || person);
};

const sortKey = (c: Partial<Customer>) => {
  const company = (c.companyName ?? "").trim();
  const person = [c.firstName, c.lastName].filter(Boolean).join(" ").trim();
  const key = company || person || "~"; // tilde sorts after A–Z with localeCompare
  return key.toLowerCase();
};


export default function CustomersPage() {
  const { db } = useFirebase();
  const router = useRouter();
  const printRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Use React Query hooks for data fetching with caching
  const { data: customers = [], isLoading: isLoadingCustomers } = useCustomers();
  const { data: estimates = [], isLoading: isLoadingEstimates } = useEstimates();
  const { data: orders = [], isLoading: isLoadingOrders } = useOrders();
  const { data: invoices = [], isLoading: isLoadingInvoices } = useInvoices();
  const { addCustomer, updateCustomer, deleteCustomer } = useCustomerMutations();

  const isLoading = isLoadingCustomers || isLoadingEstimates || isLoadingOrders || isLoadingInvoices;
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: keyof CustomerWithLastInteraction; direction: 'asc' | 'desc' }>({ key: 'companyName', direction: 'asc' });
  const [creditDialogCustomer, setCreditDialogCustomer] = useState<Customer | null>(null);

  const printRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const router = useRouter();

  const handleSaveCustomer = async (customerToSave: Omit<Customer, 'id' | 'createdAt' | 'updatedAt' | 'searchIndex'> & { id?: string }) => {
    const { id, ...customerData } = customerToSave;
    const now = new Date();
    
    const cleanCustomerData = cleanFirestoreData(customerData);
    
    const searchIndex = buildSearchIndex(cleanCustomerData);

    try {
      if (id) {
        // Update existing customer
        await updateCustomer.mutateAsync({
          id,
          ...cleanCustomerData,
          updatedAt: now,
          searchIndex,
        } as Customer);
        toast({ title: "Success", description: "Customer updated successfully!" });
      } else {
        // Add new customer
        await addCustomer.mutateAsync({
          ...cleanCustomerData,
          createdAt: now,
          updatedAt: now,
          searchIndex,
        } as Omit<Customer, 'id'>);
        toast({ title: "Success", description: "Customer added successfully!" });
      }
    } catch (error: any) {
      console.error('Error saving customer:', error);
      toast({ title: "Error", description: `Could not save customer: ${error.message}`, variant: "destructive" });
    }
  };

  const handleDeleteCustomer = async (customerId: string) => {
    try {
      await deleteCustomer.mutateAsync(customerId);
      toast({ title: "Success", description: "Customer deleted successfully!" });
    } catch (error: any) {
      console.error('Error deleting customer:', error);
      toast({ title: "Error", description: `Could not delete customer: ${error.message}`, variant: "destructive" });
    }
  };
        await setDoc(customerRef, { ...cleanCustomerData, searchIndex, updatedAt: now.toISOString() }, { merge: true });
        toast({ title: "Customer Updated", description: `Customer ${cleanCustomerData.companyName || `${cleanCustomerData.firstName} ${cleanCustomerData.lastName}`} updated.` });
      } else {
      }
    } catch (error: any) {
      console.error('Error saving customer:', error);
      toast({ title: "Error", description: `Could not save customer: ${error.message}`, variant: "destructive" });
    }
  };

  const handleDeleteCustomer = async (customerId: string) => {
    try {
      await deleteCustomer.mutateAsync(customerId);
      toast({ title: "Success", description: "Customer deleted successfully!" });
    } catch (error: any) {
      console.error('Error deleting customer:', error);
      toast({ title: "Error", description: `Could not delete customer: ${error.message}`, variant: "destructive" });
    }
  };

  const handleUpdateCredit = async (customerId: string, newCreditBalance: number, notes: string) => {
    try {
      const customer = customers.find(c => c.id === customerId);
      if (!customer) {
        throw new Error('Customer not found');
      }

      await updateCustomer.mutateAsync({
        ...customer,
        creditBalance: newCreditBalance,
        updatedAt: new Date(),
      });

      const customerName = customer.companyName || `${customer.firstName} ${customer.lastName}`;

      toast({
        title: "Credit Updated",
        description: `${customerName}'s credit balance is now $${newCreditBalance.toFixed(2)}${notes ? `. ${notes}` : ''}`
      });
    } catch (error: any) {
      console.error('Error updating credit:', error);
      toast({ title: "Error", description: `Could not update credit balance: ${error.message}`, variant: "destructive" });
    }
  };

  const customersWithLastInteraction = useMemo((): CustomerWithLastInteraction[] => {
    return customers.map((customer): CustomerWithLastInteraction => {
      const customerEstimates = estimates.filter(e => e.customerId === customer.id).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      const customerOrders = orders.filter(o => o.customerId === customer.id);
      const customerInvoices = invoices.filter(i => i.customerId === customer.id);
      
      const allPurchases = [...customerOrders, ...customerInvoices].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      return {
        ...customer,
        lastEstimateDate: customerEstimates[0]?.date,
        lastPurchaseDate: allPurchases[0]?.date,
      };
    });
  }, [customers, estimates, orders, invoices]);

  const filteredAndSortedCustomers = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
  
    const matches = (c: Customer) => {
      if (!q) return true;
      const idx = c.searchIndex ?? buildSearchIndex(c);
      return idx ? idx.includes(q) : false;
    };
  
    const filtered = customersWithLastInteraction.filter(matches);
  
    return filtered.sort((a, b) => {
      if (sortConfig.key === 'companyName' || sortConfig.key === 'firstName') {
        const aHas = hasName(a);
        const bHas = hasName(b);
        if (aHas && !bHas) return -1;
        if (!aHas && bHas) return 1;
  
        const comparison = sortKey(a).localeCompare(sortKey(b), undefined, { sensitivity: "base" });
        return sortConfig.direction === 'asc' ? comparison : -comparison;
      }
  
      const valA = a[sortConfig.key as keyof typeof a];
      const valB = b[sortConfig.key as keyof typeof b];
  
      let comparison = 0;
      if (valA === null || valA === undefined) {
          comparison = 1;
      } else if (valB === null || valB === undefined) {
          comparison = -1;
      } else if (sortConfig.key === 'lastEstimateDate' || sortConfig.key === 'lastPurchaseDate' || sortConfig.key === 'createdAt') {
          const timeA = valA ? new Date(valA as string).getTime() : 0;
          const timeB = valB ? new Date(valB as string).getTime() : 0;
          comparison = timeA - timeB;
      } else if (typeof valA === 'string' && typeof valB === 'string') {
          comparison = valA.localeCompare(valB);
      }
      
      return sortConfig.direction === 'asc' ? comparison : -comparison;
    });
  }, [customersWithLastInteraction, searchTerm, sortConfig]);

  const handlePrint = () => {
    if (printRef.current) {
      const printContents = printRef.current.innerHTML;
      const win = window.open('', '_blank');
      if (win) {
        win.document.write(`<html><head><title>Customer List</title><style>body { font-family: sans-serif; margin: 2rem; } table { width: 100%; border-collapse: collapse; } th, td { border: 1px solid #ddd; padding: 8px; text-align: left; } th { background-color: #f2f2f2; } h1 { text-align: center; }</style></head><body>${printContents}</body></html>`);
        win.document.close();
        win.focus();
        setTimeout(() => { win.print(); win.close(); }, 250);
      } else {
        toast({ title: "Print Error", description: "Could not open print window.", variant: "destructive" });
      }
    }
  };
  
  const handleRowClick = (customerId: string) => {
    router.push(`/customers/${customerId}`);
  };

  const requestSort = (key: keyof CustomerWithLastInteraction) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
        direction = 'desc';
    }
    setSortConfig({ key, direction });
  };


  if (isLoading) {
    return (
      <PageHeader title="CRM" description="Loading customer database...">
        <div className="flex items-center justify-center h-32">
          <Icon name="Loader2" className="h-8 w-8 animate-spin" />
        </div>
      </PageHeader>
    );
  }

  return (
    <>
      <PageHeader title="CRM" description="Manage your customer relationships and data.">
        <div className="flex gap-2">
          <Button variant="outline" onClick={handlePrint} disabled={isLoading}>
            <Icon name="Printer" className="mr-2 h-4 w-4" />
            Print List
          </Button>
          <CustomerDialog
            triggerButton={
              <Button disabled={isLoading}>
                <Icon name="PlusCircle" className="mr-2 h-4 w-4" />
                Add Customer
              </Button>
            }
            onSave={handleSaveCustomer}
          />
        </div>
      </PageHeader>
      
      <div className="flex flex-wrap gap-4 mb-4">
        <Input
          placeholder="Search by name, company, or email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
      </div>

      <CustomerTable
        customers={filteredAndSortedCustomers}
        onSave={handleSaveCustomer}
        onDelete={handleDeleteCustomer}
        onManageCredit={(customer) => setCreditDialogCustomer(customer)}
        isLoading={isLoading}
        onRowClick={handleRowClick}
      />

      <CustomerCreditDialog
        open={!!creditDialogCustomer}
        onOpenChange={(open) => !open && setCreditDialogCustomer(null)}
        customer={creditDialogCustomer}
        onSave={handleUpdateCredit}
      />
       {filteredAndSortedCustomers.length === 0 && !isLoading && (
        <p className="p-4 text-center text-muted-foreground">
          {searchTerm ? "No customers match your search criteria." : "No customers found. Try adding one."}
        </p>
      )}

      <div style={{ display: 'none' }}>
        <PrintableCustomerList ref={printRef} customers={filteredAndSortedCustomers} />
      </div>
    </>
  );
}
