
"use client";

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/icons';
import { Input } from '@/components/ui/input';
import { CustomerTable } from '@/components/customers/customer-table';
import { CustomerDialog } from '@/components/customers/customer-dialog';
import type { Customer } from '@/types';
import { useToast } from "@/hooks/use-toast";
import { useFirebase } from '@/components/firebase-provider';
import { collection, onSnapshot, doc, setDoc, addDoc, deleteDoc } from 'firebase/firestore';
import { CustomerImportDialog } from '@/components/customers/customer-import-dialog';
import { buildSearchIndex, customerDisplayName, fullName } from '@/lib/utils';
import { PrintableCustomerList } from '@/components/customers/printable-customer-list';

export default function CustomersPage() {
  const { db } = useFirebase();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();
  const printRef = useRef<HTMLDivElement>(null);
  const [customersToPrint, setCustomersToPrint] = useState<Customer[] | null>(null);

  useEffect(() => {
    if (!db) return;
    setIsLoading(true);
    const unsubscribe = onSnapshot(collection(db, 'customers'), (snapshot) => {
      const fetchedCustomers: Customer[] = [];
      snapshot.forEach(docSnap => {
        fetchedCustomers.push({ ...docSnap.data() as Omit<Customer, 'id'>, id: docSnap.id });
      });
      setCustomers(fetchedCustomers);
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching customers:", error);
      toast({ title: "Error", description: "Could not fetch customers.", variant: "destructive" });
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [db, toast]);
  
  const handleSaveCustomer = async (customerToSave: Omit<Customer, 'id' | 'createdAt' | 'updatedAt' | 'searchIndex'> & { id?: string }) => {
    if (!db) return;
    const { id, ...customerData } = customerToSave;
    
    const searchIndex = buildSearchIndex({
      firstName: customerData.firstName,
      lastName: customerData.lastName,
      companyName: customerData.companyName,
    });
    
    const dataWithTimestamp = {
      ...customerData,
      searchIndex,
      updatedAt: new Date().toISOString(),
    };

    try {
      if (id) {
        const docRef = doc(db, 'customers', id);
        await setDoc(docRef, dataWithTimestamp, { merge: true });
        toast({ title: "Customer Updated", description: `Updated details for ${customerDisplayName(customerData)}.` });
      } else {
        const docRef = await addDoc(collection(db, 'customers'), {
          ...dataWithTimestamp,
          createdAt: new Date().toISOString(),
        });
        toast({ title: "Customer Added", description: `${customerDisplayName(customerData)} has been added.` });
      }
    } catch (error) {
      console.error("Error saving customer:", error);
      toast({ title: "Error", description: "Could not save customer details.", variant: "destructive" });
    }
  };

  const handleDeleteCustomer = async (customerId: string) => {
    if (!db) return;
    try {
      await deleteDoc(doc(db, 'customers', customerId));
      toast({ title: "Customer Deleted", description: "The customer has been removed." });
    } catch (error) {
      console.error("Error deleting customer:", error);
      toast({ title: "Error", description: "Could not delete customer.", variant: "destructive" });
    }
  };

  const handleImportCustomers = async (importedCustomers: Omit<Customer, 'id'>[]) => {
    if (!db) return;
    const batch = [];
    for (const cust of importedCustomers) {
        const searchIndex = buildSearchIndex({
          firstName: cust.firstName,
          lastName: cust.lastName,
          companyName: cust.companyName,
        });

        const newCustomerData = {
          ...cust,
          searchIndex,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        batch.push(addDoc(collection(db, 'customers'), newCustomerData));
    }
    
    try {
        await Promise.all(batch);
        toast({ title: "Import Successful", description: `${batch.length} customers have been imported.` });
    } catch (error) {
        console.error("Error importing customers:", error);
        toast({ title: "Import Failed", description: "An error occurred while importing customers.", variant: "destructive" });
    }
  };
  
  const handlePrint = () => {
    setCustomersToPrint(filteredCustomers);
    setTimeout(() => {
        if (printRef.current) {
            const printContents = printRef.current.innerHTML;
            const win = window.open('', '_blank');
            if (win) {
                win.document.write('<html><head><title>Print Customer List</title></head><body>');
                win.document.write(printContents);
                win.document.write('</body></html>');
                win.document.close();
                win.print();
                win.close();
            }
        }
        setCustomersToPrint(null);
    }, 100);
  };

  const filteredCustomers = useMemo(() => {
    if (!searchTerm) {
      return customers;
    }
    const lowercasedFilter = searchTerm.toLowerCase();
    return customers.filter(customer =>
      customer.searchIndex?.toLowerCase().includes(lowercasedFilter)
    );
  }, [customers, searchTerm]);

  return (
    <>
      <PageHeader title="CRM" description="Manage your customer database.">
        <div className="flex items-center gap-2">
          <CustomerImportDialog onImport={handleImportCustomers} />
          <CustomerDialog
            triggerButton={
              <Button>
                <Icon name="PlusCircle" className="mr-2 h-4 w-4" />
                New Customer
              </Button>
            }
            onSave={handleSaveCustomer}
          />
           <Button variant="outline" onClick={handlePrint}>
            <Icon name="Printer" className="mr-2 h-4 w-4" /> Print List
          </Button>
        </div>
      </PageHeader>
      <div className="mb-4">
        <Input
          placeholder="Search by name, company, email, or phone..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
      </div>
      <CustomerTable
        customers={filteredCustomers}
        onSave={handleSaveCustomer}
        onDelete={handleDeleteCustomer}
        isLoading={isLoading}
      />
      <div style={{ display: 'none' }}>
        {customersToPrint && <PrintableCustomerList ref={printRef} customers={customersToPrint} />}
      </div>
    </>
  );
}
