
"use client";

import React, { useState, useEffect } from 'react';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/icons';
import { VendorTable } from '@/components/vendors/vendor-table';
import { VendorDialog } from '@/components/vendors/vendor-dialog';
import type { Vendor } from '@/types';
import { useToast } from "@/hooks/use-toast";
import { useFirebase } from '@/components/firebase-provider';
import { collection, onSnapshot, doc, setDoc, addDoc, deleteDoc } from 'firebase/firestore';

export default function VendorsPage() {
  const { db } = useFirebase();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (!db) return;
    setIsLoading(true);
    const unsubscribe = onSnapshot(collection(db, 'vendors'), 
      (snapshot) => {
        const fetchedVendors: Vendor[] = [];
        snapshot.forEach((doc) => {
          fetchedVendors.push({ id: doc.id, ...doc.data() } as Vendor);
        });
        setVendors(fetchedVendors.sort((a, b) => a.name.localeCompare(b.name)));
        setIsLoading(false);
      },
      (error) => {
        console.error("Error fetching vendors: ", error);
        toast({ title: "Error", description: "Could not fetch vendors.", variant: "destructive" });
        setIsLoading(false);
      }
    );
    return () => unsubscribe();
  }, [db, toast]);

  const handleSaveVendor = async (vendorToSave: Omit<Vendor, 'id'> & { id?: string }) => {
    if (!db) return;
    const { id, ...vendorData } = vendorToSave;

    try {
      if (id) {
        const vendorDocRef = doc(db, 'vendors', id);
        await setDoc(vendorDocRef, vendorData, { merge: true });
        toast({ title: "Vendor Updated", description: `Vendor "${vendorData.name}" has been updated.` });
      } else {
        await addDoc(collection(db, 'vendors'), vendorData);
        toast({ title: "Vendor Added", description: `Vendor "${vendorData.name}" has been added.` });
      }
    } catch (error) {
      console.error("Error saving vendor:", error);
      toast({ title: "Error", description: "Could not save vendor data.", variant: "destructive" });
    }
  };

  const handleDeleteVendor = async (vendorId: string) => {
    if (!db) return;
    try {
      await deleteDoc(doc(db, 'vendors', vendorId));
      toast({ title: "Vendor Deleted", description: "The vendor has been removed.", variant: "default" });
    } catch (error) {
      console.error("Error deleting vendor:", error);
      toast({ title: "Error", description: "Could not delete vendor.", variant: "destructive" });
    }
  };
  
  if (isLoading) {
    return (
      <PageHeader title="Vendor Management" description="Loading vendor data...">
        <div className="flex items-center justify-center h-32">
          <Icon name="Loader2" className="h-8 w-8 animate-spin" />
        </div>
      </PageHeader>
    );
  }

  return (
    <>
      <PageHeader title="Vendor Management" description="Manage your list of vendors and distributors.">
         <VendorDialog 
            triggerButton={
              <Button>
                <Icon name="PlusCircle" className="mr-2 h-4 w-4" />
                Add Vendor
              </Button>
            }
            onSave={handleSaveVendor}
          />
      </PageHeader>
      <VendorTable vendors={vendors} onSave={handleSaveVendor} onDelete={handleDeleteVendor} />
    </>
  );
}
