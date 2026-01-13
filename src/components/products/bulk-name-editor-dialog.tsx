"use client";

import React, { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import type { Product } from '@/types';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Icon } from '@/components/icons';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const productNameEditSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "Product name is required"),
});

const bulkNameFormSchema = z.object({
  products: z.array(productNameEditSchema),
});

type BulkNameFormData = z.infer<typeof bulkNameFormSchema>;

interface BulkNameEditorDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  categoryName: string;
  products: Product[];
  onSave: (updatedProducts: Pick<Product, 'id' | 'name'>[]) => Promise<void>;
}

export function BulkNameEditorDialog({
  isOpen,
  onOpenChange,
  categoryName,
  products,
  onSave,
}: BulkNameEditorDialogProps) {
  const [isSaving, setIsSaving] = useState(false);

  const form = useForm<BulkNameFormData>({
    resolver: zodResolver(bulkNameFormSchema),
    defaultValues: {
      products: products.map(p => ({ id: p.id, name: p.name })),
    },
  });

  const { fields } = useFieldArray({
    control: form.control,
    name: 'products',
  });

  const watchedProducts = form.watch('products');

  React.useEffect(() => {
    if (isOpen) {
      form.reset({
        products: products.map(p => ({ id: p.id, name: p.name })),
      });
    }
  }, [isOpen, products, form]);

  const handleSubmit = async (data: BulkNameFormData) => {
    setIsSaving(true);
    const updatedProducts = data.products.map(formProduct => ({
      id: formProduct.id,
      name: formProduct.name,
    }));
    await onSave(updatedProducts);
    setIsSaving(false);
    onOpenChange(false);
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => {
      // Prevent closing while saving or when open is false (user trying to close)
      if (!open && !isSaving) {
        return; // Prevent closing
      }
      if (open) {
        onOpenChange(true);
      }
    }}>
      <AlertDialogContent className="sm:max-w-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle>Bulk Edit Product Names for: {categoryName}</AlertDialogTitle>
          <AlertDialogDescription>
            Update product names in this category. Changes are not saved until you click the Save button.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)}>
            <ScrollArea className="h-[60vh] mt-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-full">Product Name</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fields.map((field, index) => (
                    <TableRow key={field.id}>
                      <TableCell>
                        <FormField
                          control={form.control}
                          name={`products.${index}.name`}
                          render={({ field: nameField }) => (
                            <FormItem>
                              <FormControl>
                                <Input
                                  {...nameField}
                                  placeholder="Enter product name"
                                  className="text-sm"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
            <div className="mt-6 flex justify-end gap-2">
              <AlertDialogCancel asChild>
                <Button variant="outline" disabled={isSaving} onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
              </AlertDialogCancel>
              <AlertDialogAction asChild>
                <Button onClick={() => form.handleSubmit(handleSubmit)()} disabled={isSaving}>
                  {isSaving && <Icon name="Loader2" className="mr-2 h-4 w-4 animate-spin" />}
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </Button>
              </AlertDialogAction>
            </div>
          </form>
        </Form>
      </AlertDialogContent>
    </AlertDialog>
  );
}
