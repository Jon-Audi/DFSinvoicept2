
"use client";

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/icons';
import { Input } from '@/components/ui/input';
import { ProductTable } from '@/components/products/product-table';
import { ProductDialog } from '@/components/products/product-dialog';
import type { Product, CompanySettings } from '@/types';
import { useToast } from "@/hooks/use-toast";
import { useFirebase } from '@/components/firebase-provider';
import { collection, onSnapshot, doc, setDoc, addDoc, deleteDoc, writeBatch, getDocs, query, where, getDoc } from 'firebase/firestore';
import { customerDisplayName, buildSearchIndex } from '@/lib/utils';
import { BulkAddProductsDialog } from '@/components/products/bulk-add-products-dialog';
import { PrintablePriceSheet } from '@/components/products/printable-price-sheet';
import { SelectCategoriesDialog } from '@/components/products/select-categories-dialog';
import { CustomerPriceSheetDialog } from '@/components/products/customer-price-sheet-dialog';
import { ExcelImportExport } from '@/components/products/excel-import-export';
import type { Customer } from '@/types';
import { useReactToPrint } from 'react-to-print';

const COMPANY_SETTINGS_DOC_ID = "main";

export default function ProductsPage() {
  const { db } = useFirebase();
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [productCategories, setProductCategories] = useState<string[]>([]);
  const [productSubcategories, setProductSubcategories] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  const printRef = useRef<HTMLDivElement>(null);
  const [isPrintSheetOpen, setIsPrintSheetOpen] = useState(false);
  const [groupedProductsForPrinting, setGroupedProductsForPrinting] = useState<Map<string, Product[]> | null>(null);
  const [companySettings, setCompanySettings] = useState<CompanySettings | null>(null);

  const handlePrintSheet = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Price_Sheet_${new Date().toLocaleDateString()}`,
    print: async (printIframe) => {
      // Wait a bit for images to load from URL before printing
      await new Promise((resolve) => setTimeout(resolve, 500));

      const document = printIframe.contentDocument;
      if (document) {
        document.defaultView?.print();
      }
    },
  });


  // Fetch customers
  useEffect(() => {
    if (!db) return;
    const unsubscribe = onSnapshot(collection(db, 'customers'), (snapshot) => {
      const fetchedCustomers: Customer[] = [];
      snapshot.forEach(docSnap => {
        fetchedCustomers.push({ ...docSnap.data() as Omit<Customer, 'id'>, id: docSnap.id });
      });
      setCustomers(fetchedCustomers);
    });
    return () => unsubscribe();
  }, [db]);

  // Fetch company settings
  useEffect(() => {
    if (!db) return;
    const fetchSettings = async () => {
      try {
        const docRef = doc(db, 'companySettings', COMPANY_SETTINGS_DOC_ID);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const settings = docSnap.data() as CompanySettings;
          setCompanySettings(settings);
        }
      } catch (error) {
        console.error('Could not fetch company settings:', error);
      }
    };
    fetchSettings();
  }, [db]);

  useEffect(() => {
    if (!db) return;
    setIsLoading(true);
    const unsubscribe = onSnapshot(collection(db, 'products'), (snapshot) => {
      const fetchedProducts: Product[] = [];
      const categories = new Set<string>();
      const subcategories = new Set<string>();
      snapshot.forEach(docSnap => {
        const productData = { ...docSnap.data() as Omit<Product, 'id'>, id: docSnap.id };
        fetchedProducts.push(productData);
        categories.add(productData.category);
        if(productData.subcategory) {
            subcategories.add(productData.subcategory);
        }
      });
      setProducts(fetchedProducts);
      setProductCategories(Array.from(categories).sort());
      setProductSubcategories(Array.from(subcategories).sort());
      setIsLoading(false);
    }, (error) => {
      toast({ title: "Error", description: "Could not fetch products.", variant: "destructive" });
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [db, toast]);
  
  const handleSaveProduct = async (productToSave: Omit<Product, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) => {
    if (!db) return;
    const { id, ...productData } = productToSave;
    
    try {
      if (id) {
        const docRef = doc(db, 'products', id);
        await setDoc(docRef, productData, { merge: true });
        toast({ title: "Product Updated", description: `Updated details for ${productData.name}.` });
      } else {
        const docRef = await addDoc(collection(db, 'products'), productData);
        toast({ title: "Product Added", description: `${productData.name} has been added.` });
      }
    } catch (error) {
      toast({ title: "Error", description: "Could not save product details.", variant: "destructive" });
    }
  };

  const handleBulkSaveProducts = async (productsToSave: Omit<Product, 'id'>[]) => {
      if (!db) return;
      const batch = writeBatch(db);
      productsToSave.forEach(productData => {
          const docRef = doc(collection(db, 'products'));
          batch.set(docRef, productData);
      });

      try {
          await batch.commit();
          toast({ title: "Products Added", description: `${productsToSave.length} new products have been added.`});
      } catch (error) {
          toast({ title: "Bulk Add Failed", description: "Could not add the new products.", variant: "destructive" });
      }
  };
  
  const handleDeleteProduct = async (productId: string) => {
    if (!db) return;
    try {
      await deleteDoc(doc(db, 'products', productId));
      toast({ title: "Product Deleted", description: "The product has been removed." });
    } catch (error) {
      toast({ title: "Error", description: "Could not delete product.", variant: "destructive" });
    }
  };

  const handleAddNewCategory = (newCategory: string) => {
    if (!productCategories.some(c => c.toLowerCase() === newCategory.toLowerCase())) {
        const updatedCategories = [...productCategories, newCategory].sort();
        setProductCategories(updatedCategories);
    }
  };
  
  const handleAddNewSubcategory = (newSubcategory: string) => {
    if (!productSubcategories.some(s => s.toLowerCase() === newSubcategory.toLowerCase())) {
        const updatedSubcategories = [...productSubcategories, newSubcategory].sort();
        setProductSubcategories(updatedSubcategories);
    }
  };
  
  const handleApplyCategoryMarkup = async (categoryName: string, markupPercentage: number) => {
    if (!db) return;
    const productsToUpdate = products.filter(p => p.category === categoryName);
    if (productsToUpdate.length === 0) {
        toast({ title: "No Products", description: `No products found in category "${categoryName}&quot; to update.`});
        return;
    }

    const batch = writeBatch(db);
    productsToUpdate.forEach(product => {
        if(product.cost > 0) {
            const newPrice = product.cost * (1 + markupPercentage / 100);
            const productRef = doc(db, "products", product.id);
            batch.update(productRef, { 
                price: parseFloat(newPrice.toFixed(2)),
                markupPercentage: markupPercentage 
            });
        }
    });

    try {
        await batch.commit();
        toast({ title: "Markup Applied", description: `Markup of ${markupPercentage}% applied to ${productsToUpdate.length} products in "${categoryName}&quot;.` });
    } catch(error) {
        toast({ title: "Error", description: "Could not apply markup.", variant: "destructive" });
    }
  };

  const handleDeleteCategory = async (categoryName: string) => {
     // This function is primarily for UI state management.
     // It does not delete products, only removes the category from the list if empty.
     const productsInCategory = products.some(p => p.category === categoryName);
     if (productsInCategory) {
         toast({ title: "Cannot Delete", description: "Category is not empty. Re-assign products to delete.", variant: "destructive"});
         return;
     }
     setProductCategories(prev => prev.filter(c => c !== categoryName));
     toast({ title: "Category Removed", description: `"${categoryName}&quot; has been removed from the category list.`});
  };

  const handleUpdateStock = async (product: Product) => {
    // This is a placeholder. Actual stock update logic is in the inventory page.
    // For now, it will just show a toast.
    toast({ title: "Update Stock", description: `Stock for ${product.name} can be updated on the Inventory page.`});
  };
  
  const handleBulkUpdate = async (updatedProducts: Product[]) => {
    if (!db) return;
    const batch = writeBatch(db);
    updatedProducts.forEach(product => {
      const { id, ...data } = product;
      const docRef = doc(db, "products", id);
      batch.update(docRef, data);
    });

    try {
      await batch.commit();
      toast({ title: "Bulk Update Successful", description: `Updated ${updatedProducts.length} products.` });
    } catch (error) {
      toast({ title: "Bulk Update Failed", description: "Could not update products.", variant: "destructive" });
    }
  };

  const handleBulkStockUpdate = async (productsToUpdate: {id: string; quantityInStock: number}[]) => {
      if (!db) return;
      const batch = writeBatch(db);
      productsToUpdate.forEach(p => {
          const docRef = doc(db, 'products', p.id);
          batch.update(docRef, { quantityInStock: p.quantityInStock });
      });
      try {
          await batch.commit();
          toast({ title: 'Stock Updated', description: `${productsToUpdate.length} products have had their stock levels updated.` });
      } catch (e) {
          toast({ title: 'Error', description: 'Could not update stock levels.', variant: 'destructive' });
      }
  };
  
  const handleBulkSubcategoryUpdate = async (updatedProducts: Pick<Product, 'id' | 'subcategory'>[]) => {
    if (!db) return;
    const batch = writeBatch(db);
    updatedProducts.forEach(p => {
        const docRef = doc(db, 'products', p.id);
        batch.update(docRef, { subcategory: p.subcategory || null });
    });
    try {
        await batch.commit();
        toast({ title: 'Subcategories Updated', description: 'Product subcategories have been saved.'});
    } catch(e) {
        toast({ title: 'Error', description: 'Could not save subcategory changes.', variant: 'destructive'});
    }
  };

  const handlePrintRequest = async (selectedCategories: string[]) => {
    setIsPrintSheetOpen(false); // Close the category selection dialog
    if (selectedCategories.length === 0) {
      toast({ title: "No Categories Selected", description: "Please select at least one category to print.", variant: "default" });
      return;
    }

    if (!companySettings) {
        toast({ title: "Error", description: "Company settings are required for printing.", variant: "destructive" });
        return;
    }

    const productsToPrint = products.filter(p => selectedCategories.includes(p.category));

    const grouped = productsToPrint.reduce((acc, product) => {
        const category = product.category || 'Uncategorized';
        if (!acc.has(category)) {
            acc.set(category, []);
        }
        acc.get(category)!.push(product);
        return acc;
    }, new Map<string, Product[]>());

    setGroupedProductsForPrinting(grouped);

    // Use react-to-print which properly waits for images to load
    // Small delay to ensure state update is reflected in DOM
    setTimeout(() => {
        handlePrintSheet();
    }, 50);
  };


  const filteredProducts = useMemo(() => {
    if (!searchTerm) {
      return products;
    }
    const lowercasedFilter = searchTerm.toLowerCase();
    return products.filter(product =>
      product.name.toLowerCase().includes(lowercasedFilter) ||
      product.category.toLowerCase().includes(lowercasedFilter) ||
      product.subcategory?.toLowerCase().includes(lowercasedFilter)
    );
  }, [products, searchTerm]);
  
  const groupedProducts = useMemo(() => {
    const grouped = new Map<string, Product[]>();
    filteredProducts.forEach(product => {
      const category = product.category || 'Uncategorized';
      if (!grouped.has(category)) {
        grouped.set(category, []);
      }
      grouped.get(category)!.push(product);
    });
    // Sort products within each category
    grouped.forEach((productsInCategory) => {
      productsInCategory.sort((a, b) => a.name.localeCompare(b.name));
    });
    return new Map([...grouped.entries()].sort());
  }, [filteredProducts]);

  return (
    <>
      <PageHeader title="Products" description="Manage your product catalog, pricing, and assemblies.">
        <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setIsPrintSheetOpen(true)}>
                <Icon name="Printer" className="mr-2 h-4 w-4" /> Print Price Sheet
            </Button>
            <CustomerPriceSheetDialog
              customers={customers}
              products={products}
              companySettings={companySettings}
            />
            <ExcelImportExport
              products={products}
              onImport={handleBulkSaveProducts}
            />
            <BulkAddProductsDialog
              triggerButton={
                <Button variant="outline">
                  <Icon name="Upload" className="mr-2 h-4 w-4" />
                  Bulk Add
                </Button>
              }
              onSave={handleBulkSaveProducts}
              productCategories={productCategories}
            />
            <ProductDialog
              triggerButton={
                <Button>
                  <Icon name="PlusCircle" className="mr-2 h-4 w-4" />
                  New Product
                </Button>
              }
              allProducts={products}
              onSave={handleSaveProduct}
              productCategories={productCategories}
              productSubcategories={productSubcategories}
              onAddNewCategory={handleAddNewCategory}
              onAddNewSubcategory={handleAddNewSubcategory}
            />
        </div>
      </PageHeader>
      <div className="mb-4">
        <Input
          placeholder="Search by name, category, or subcategory..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
      </div>
      <ProductTable
        groupedProducts={groupedProducts}
        allProducts={products}
        onSave={handleSaveProduct}
        onDelete={handleDeleteProduct}
        productCategories={productCategories}
        onAddNewCategory={handleAddNewCategory}
        productSubcategories={productSubcategories}
        onAddNewSubcategory={handleAddNewSubcategory}
        isLoading={isLoading}
        onApplyCategoryMarkup={handleApplyCategoryMarkup}
        onDeleteCategory={handleDeleteCategory}
        onUpdateStock={handleUpdateStock}
        onBulkUpdate={handleBulkUpdate}
        onBulkStockUpdate={handleBulkStockUpdate}
        onBulkSubcategoryUpdate={handleBulkSubcategoryUpdate}
      />
      {/* Hidden print component */}
      <div style={{ display: 'none' }}>
        <PrintablePriceSheet
          ref={printRef}
          groupedProducts={groupedProductsForPrinting || new Map()}
          companySettings={companySettings}
        />
      </div>
      <SelectCategoriesDialog
        isOpen={isPrintSheetOpen}
        onOpenChange={setIsPrintSheetOpen}
        allCategories={productCategories}
        onSubmit={handlePrintRequest}
      />
    </>
  );
}

    