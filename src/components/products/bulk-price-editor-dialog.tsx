
"use client";

import React, { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import type { Product } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { ScrollArea } from '@/components/ui/scroll-area';
import { Icon } from '@/components/icons';

const priceEditSchema = z.object({
  id: z.string(),
  name: z.string(),
  subcategory: z.string().optional(),
  cost: z.coerce.number().min(0, "Cost must be non-negative"),
  price: z.coerce.number().min(0, "Price must be non-negative"),
  markupPercentage: z.coerce.number().min(0, "Markup must be non-negative"),
});

const bulkPriceFormSchema = z.object({
  products: z.array(priceEditSchema),
});

type BulkPriceFormData = z.infer<typeof bulkPriceFormSchema>;

interface BulkPriceEditorDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  categoryName: string;
  products: Product[];
  onSave: (updatedProducts: Product[]) => Promise<void>;
}

export function BulkPriceEditorDialog({
  isOpen,
  onOpenChange,
  categoryName,
  products,
  onSave,
}: BulkPriceEditorDialogProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [lastEdited, setLastEdited] = useState<{ index: number, field: 'price' | 'markup' } | null>(null);

  const form = useForm<BulkPriceFormData>({
    resolver: zodResolver(bulkPriceFormSchema),
    defaultValues: {
      products: [],
    },
  });
  
  // IMPORTANT: Do NOT include 'products' in dependencies - it causes form resets on Firebase updates
  useEffect(() => {
    if (isOpen) {
        form.reset({
          products: products.map(p => ({
            id: p.id,
            name: p.name,
            subcategory: p.subcategory,
            cost: p.cost,
            price: p.price,
            markupPercentage: p.markupPercentage,
          })),
        });
    }
  }, [isOpen, form]);

  const { control, getValues, setValue, watch, trigger } = form;
  const watchedProducts = watch('products');

  useEffect(() => {
    if (!lastEdited) return;

    const { index, field } = lastEdited;
    const cost = getValues(`products.${index}.cost`);
    
    if (field === 'price') {
      const price = getValues(`products.${index}.price`);
      if (cost > 0) {
        const newMarkup = ((price / cost) - 1) * 100;
        setValue(`products.${index}.markupPercentage`, parseFloat(newMarkup.toFixed(2)), { shouldValidate: true });
      }
    } else if (field === 'markup') {
      const markup = getValues(`products.${index}.markupPercentage`);
      if (cost > 0) {
        const newPrice = cost * (1 + markup / 100);
        setValue(`products.${index}.price`, parseFloat(newPrice.toFixed(2)), { shouldValidate: true });
      }
    }
    setLastEdited(null); // Reset after calculation
  }, [watchedProducts, lastEdited, getValues, setValue]);


  const handleCostChange = (index: number, newCost: number) => {
    setValue(`products.${index}.cost`, newCost, { shouldValidate: true });
    const markup = getValues(`products.${index}.markupPercentage`);
    if (markup >= 0) {
      const price = newCost * (1 + markup / 100);
      setValue(`products.${index}.price`, parseFloat(price.toFixed(2)), { shouldValidate: true });
    }
  };

  const { fields } = useFieldArray({
    control,
    name: "products",
  });
  
  const handleSubmit = async (data: BulkPriceFormData) => {
    setIsSaving(true);
    // Find original products to merge other data
    const updatedProducts = data.products.map(formProduct => {
        const originalProduct = products.find(p => p.id === formProduct.id);
        return {
            ...originalProduct,
            ...formProduct,
        } as Product;
    });
    
    await onSave(updatedProducts);
    setIsSaving(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Bulk Edit Prices for: {categoryName}</DialogTitle>
          <DialogDescription>
            Adjust cost, price, or markup for products in this category. All changes will be saved at once.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)}>
            <ScrollArea className="h-[60vh] mt-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[30%]">Product Name</TableHead>
                    <TableHead className="w-[20%]">Subcategory</TableHead>
                    <TableHead className="text-right">Cost</TableHead>
                    <TableHead className="text-right">Markup (%)</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fields.map((field, index) => (
                    <TableRow key={field.id}>
                      <TableCell className="font-medium">{watchedProducts[index]?.name}</TableCell>
                      <TableCell>{watchedProducts[index]?.subcategory || 'N/A'}</TableCell>
                      <TableCell>
                        <FormField
                          control={control}
                          name={`products.${index}.cost`}
                          render={({ field: costField }) => (
                            <FormItem>
                              <FormControl>
                                <Input
                                  type="number" step="0.01"
                                  className="text-right"
                                  {...costField}
                                  onChange={e => handleCostChange(index, parseFloat(e.target.value) || 0)}
                                />
                              </FormControl><FormMessage />
                            </FormItem>
                          )}
                        />
                      </TableCell>
                      <TableCell>
                         <FormField
                          control={control}
                          name={`products.${index}.markupPercentage`}
                          render={({ field: markupField }) => (
                            <FormItem>
                              <FormControl>
                                <Input
                                  type="number" step="0.01"
                                  className="text-right"
                                  {...markupField}
                                  onChange={(e) => {
                                      markupField.onChange(parseFloat(e.target.value) || 0);
                                      setLastEdited({ index, field: 'markup' });
                                  }}
                                />
                              </FormControl><FormMessage />
                            </FormItem>
                          )}
                        />
                      </TableCell>
                      <TableCell>
                         <FormField
                          control={control}
                          name={`products.${index}.price`}
                          render={({ field: priceField }) => (
                            <FormItem>
                              <FormControl>
                                <Input
                                  type="number" step="0.01"
                                  className="text-right"
                                  {...priceField}
                                   onChange={(e) => {
                                      priceField.onChange(parseFloat(e.target.value) || 0);
                                      setLastEdited({ index, field: 'price' });
                                  }}
                                />
                              </FormControl><FormMessage />
                            </FormItem>
                          )}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
            <DialogFooter className="mt-4">
              <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
              <Button type="submit" disabled={isSaving}>
                {isSaving && <Icon name="Loader2" className="mr-2 h-4 w-4 animate-spin" />}
                Save All Changes
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
