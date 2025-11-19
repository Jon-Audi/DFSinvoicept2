
"use client";

import React from 'react';
import type { Vendor } from '@/types';
import { VendorForm, type VendorFormData } from './vendor-form';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface VendorDialogProps {
  vendor?: Vendor;
  triggerButton: React.ReactElement;
  onSave: (vendor: Omit<Vendor, 'id'> & { id?: string }) => void;
}

export function VendorDialog({ vendor, triggerButton, onSave }: VendorDialogProps) {
  const [open, setOpen] = React.useState(false);

  const handleSubmit = (data: VendorFormData) => {
    onSave({ id: vendor?.id, ...data });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {triggerButton}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{vendor ? 'Edit Vendor' : 'Add New Vendor'}</DialogTitle>
          <DialogDescription>
            {vendor ? 'Update the details for this vendor.' : 'Fill in the details for the new vendor.'}
          </DialogDescription>
        </DialogHeader>
        <VendorForm vendor={vendor} onSubmit={handleSubmit} onClose={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}
