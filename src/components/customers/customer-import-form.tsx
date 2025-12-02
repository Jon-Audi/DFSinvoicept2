
"use client";

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import type { Customer } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from '@/hooks/use-toast';

// Simple schema for file upload
const importSchema = z.object({
  file: z.instanceof(FileList).refine(files => files.length > 0, 'A file is required.'),
});

type ImportFormData = z.infer<typeof importSchema>;

interface CustomerImportFormProps {
  onSubmit: (data: { customers: Omit<Customer, 'id'>[] }) => void;
  onClose?: () => void;
}

export function CustomerImportForm({ onSubmit, onClose }: CustomerImportFormProps) {
  const { toast } = useToast();
  const form = useForm<ImportFormData>({
    resolver: zodResolver(importSchema),
  });

  const parseCSV = (file: File): Promise<Omit<Customer, 'id'>[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        const rows = text.split('\n').filter(row => row.trim() !== '');
        const headers = rows[0].split(',').map(h => h.trim());
        const customers: Omit<Customer, 'id'>[] = [];

        for (let i = 1; i < rows.length; i++) {
          const values = rows[i].split(',').map(v => v.trim());
          const rowData: { [key: string]: string } = {};
          headers.forEach((header, index) => {
            rowData[header] = values[index];
          });

          // Basic validation
          if (!rowData.firstName || !rowData.lastName) {
            continue;
          }

          customers.push({
            firstName: rowData.firstName,
            lastName: rowData.lastName,
            companyName: rowData.companyName || '',
            phone: rowData.phone || '',
            emailContacts: rowData.email ? [{ id: `temp-${i}`, type: 'Main Contact', email: rowData.email }] : [],
            customerType: 'Fence Contractor', // Default
          } as Omit<Customer, 'id'>);
        }
        resolve(customers);
      };
      reader.onerror = (error) => reject(error);
      reader.readAsText(file);
    });
  };

  const handleFormSubmit = async (data: ImportFormData) => {
    const file = data.file[0];
    if (file) {
      try {
        const parsedCustomers = await parseCSV(file);
        if (parsedCustomers.length === 0) {
          toast({
            title: "No Customers Found",
            description: "The CSV file seems to be empty or incorrectly formatted.",
            variant: "destructive",
          });
          return;
        }
        onSubmit({ customers: parsedCustomers });
      } catch (error) {
        toast({
          title: "Import Error",
          description: "Could not parse the CSV file. Please check its format.",
          variant: "destructive",
        });
      }
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="file"
          render={({ field }) => (
            <FormItem>
              <FormLabel>CSV File</FormLabel>
              <FormControl>
                <Input
                  type="file"
                  accept=".csv"
                  onChange={e => field.onChange(e.target.files)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end gap-2">
          {onClose && <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>}
          <Button type="submit">Import Customers</Button>
        </div>
      </form>
    </Form>
  );
}
