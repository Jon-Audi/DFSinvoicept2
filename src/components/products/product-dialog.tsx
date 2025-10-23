
"use client";

import React from 'react';
import type { Product } from '@/types';
import { ProductForm, type ProductFormData } from './product-form';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface ProductDialogProps {
  product?: Product;
  allProducts: Product[];
  triggerButton: React.ReactElement;
  onSave: (product: any) => void; // Using any to avoid circular dependency issues with form data types
  productCategories: string[];
  onAddNewCategory: (category: string) => void;
  productSubcategories: string[];
  onAddNewSubcategory: (subcategory: string) => void;
}

export function ProductDialog({
  product,
  allProducts,
  triggerButton,
  onSave,
  productCategories,
  onAddNewCategory,
  productSubcategories,
  onAddNewSubcategory
}: ProductDialogProps) {
  const [open, setOpen] = React.useState(false);

  const handleSubmit = (data: ProductFormData) => {
    // Combine existing product data with form data
    const productToSave = { ...product, ...data };
    onSave(productToSave);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {triggerButton}
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{product ? 'Edit Product' : 'Add New Product'}</DialogTitle>
          <DialogDescription>
            {product ? 'Update the details for this product.' : 'Fill in the details for the new product.'}
          </DialogDescription>
        </DialogHeader>
        <ProductForm
          product={product}
          allProducts={allProducts}
          onSubmit={handleSubmit}
          onClose={() => setOpen(false)}
          productCategories={productCategories}
          onAddNewCategory={onAddNewCategory}
        />
      </DialogContent>
    </Dialog>
  );
}
