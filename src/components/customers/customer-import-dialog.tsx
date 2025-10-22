
"use client";

import React from 'react';
import type { Customer } from '@/types';
import { CustomerImportForm } from './customer-import-form';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/icons';

interface CustomerImportDialogProps {
  onImport: (customers: Omit<Customer, 'id'>[]) => void;
}

export function CustomerImportDialog({ onImport }: CustomerImportDialogProps) {
  const [open, setOpen] = React.useState(false);

  const handleSubmit = (data: { customers: Omit<Customer, 'id'>[] }) => {
    onImport(data.customers);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
            <Icon name="Upload" className="mr-2 h-4 w-4" />
            Import CSV
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import Customers from CSV</DialogTitle>
          <DialogDescription>
            Upload a CSV file with customer data. The file should have columns for: firstName, lastName, companyName, phone, email.
          </DialogDescription>
        </DialogHeader>
        <CustomerImportForm
          onSubmit={handleSubmit}
          onClose={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
