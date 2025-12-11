
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { useFirebase } from '@/components/firebase-provider';
import { doc, getDoc } from 'firebase/firestore';
import { useToast } from "@/hooks/use-toast";

const subcategoryEditSchema = z.object({
  id: z.string(),
  name: z.string(),
  subcategory: z.string().optional(),
});

const bulkSubcategoryFormSchema = z.object({
  products: z.array(subcategoryEditSchema),
});

type BulkSubcategoryFormData = z.infer<typeof bulkSubcategoryFormSchema>;

interface BulkSubcategoryEditorDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  categoryName: string;
  products: Product[];
  allSubcategories: string[];
  onAddNewSubcategory: (subcategory: string) => void;
  onSave: (updatedProducts: Pick<Product, 'id' | 'subcategory'>[]) => Promise<void>;
}

export function BulkSubcategoryEditorDialog({
  isOpen,
  onOpenChange,
  categoryName,
  products,
  onSave,
}: BulkSubcategoryEditorDialogProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [subcategories, setSubcategories] = useState<string[]>([]);
  const [isLoadingSubcategories, setIsLoadingSubcategories] = useState(true);
  const { db } = useFirebase();
  const { toast } = useToast();

  const form = useForm<BulkSubcategoryFormData>({
    resolver: zodResolver(bulkSubcategoryFormSchema),
  });

  // Load subcategories from settings
  useEffect(() => {
    if (!db) return;

    const fetchSubcategories = async () => {
      setIsLoadingSubcategories(true);
      try {
        const docRef = doc(db, 'settings', 'subcategories');
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          setSubcategories(data.list || []);
        }
      } catch (error) {
        console.error('Error loading subcategories:', error);
        toast({
          title: "Error",
          description: "Could not load subcategories.",
          variant: "destructive"
        });
      } finally {
        setIsLoadingSubcategories(false);
      }
    };

    fetchSubcategories();
  }, [db, toast]);

  useEffect(() => {
    if (isOpen) {
      form.reset({
        products: products.map(p => ({
          id: p.id,
          name: p.name,
          subcategory: p.subcategory || '',
        })),
      });
    }
  }, [isOpen, products, form]);

  const { control, watch } = form;

  const { fields } = useFieldArray({
    control,
    name: "products",
  });
  
  const watchedProducts = watch('products');

  const handleSubmit = async (data: BulkSubcategoryFormData) => {
    setIsSaving(true);
    await onSave(data.products);
    setIsSaving(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Bulk Edit Subcategories for: {categoryName}</DialogTitle>
          <DialogDescription>
            Assign or update the subcategory for products in this category. Select from your configured subcategories.
          </DialogDescription>
        </DialogHeader>
        {!isLoadingSubcategories && subcategories.length === 0 && (
          <div className="rounded-lg border border-yellow-200 bg-yellow-50 dark:bg-yellow-900/10 dark:border-yellow-900 p-4 text-sm">
            <div className="flex items-start gap-2">
              <Icon name="AlertTriangle" className="h-5 w-5 text-yellow-600 dark:text-yellow-500 mt-0.5" />
              <div>
                <p className="font-medium text-yellow-900 dark:text-yellow-200">No subcategories configured</p>
                <p className="text-yellow-700 dark:text-yellow-300 mt-1">
                  Go to Settings &gt; Subcategories to add subcategories before using bulk edit.
                </p>
              </div>
            </div>
          </div>
        )}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)}>
            <ScrollArea className="h-[60vh] mt-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50%]">Product Name</TableHead>
                    <TableHead>Subcategory</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fields.map((field, index) => (
                    <TableRow key={field.id}>
                      <TableCell className="font-medium">{watchedProducts[index]?.name}</TableCell>
                      <TableCell>
                        <FormField
                          control={control}
                          name={`products.${index}.subcategory`}
                          render={({ field: subcategoryField }) => (
                            <FormItem>
                              <FormControl>
                                {isLoadingSubcategories ? (
                                  <div className="flex items-center gap-2">
                                    <Icon name="Loader2" className="h-4 w-4 animate-spin" />
                                    <span className="text-sm text-muted-foreground">Loading...</span>
                                  </div>
                                ) : (
                                  <Select
                                    value={subcategoryField.value || '__NONE__'}
                                    onValueChange={(value) => {
                                      subcategoryField.onChange(value === '__NONE__' ? '' : value);
                                    }}
                                  >
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select subcategory" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="__NONE__">
                                        <span className="text-muted-foreground">None</span>
                                      </SelectItem>
                                      {subcategories.map((subcategory) => (
                                        <SelectItem key={subcategory} value={subcategory}>
                                          {subcategory}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                )}
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
