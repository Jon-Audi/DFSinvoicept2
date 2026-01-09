
"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { PageHeader } from '@/components/page-header';
import { Icon } from '@/components/icons';
import type { Product } from '@/types';
import { useToast } from "@/hooks/use-toast";
import { useFirebase } from '@/components/firebase-provider';
import { collection, onSnapshot, doc, setDoc } from 'firebase/firestore';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PrintableInventorySheet } from '@/components/inventory/printable-inventory-sheet';
import { PrintableStockValuationSheet } from '@/components/inventory/printable-stock-valuation-sheet';
import { PrintableValuationSummary } from '@/components/inventory/printable-valuation-summary';
import { SelectCategoriesDialog } from '@/components/products/select-categories-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

type PrintType = 'count-sheet' | 'valuation-summary' | 'valuation-detailed';

// Inline editable stock cell component - no dialog needed!
function StockCell({ product, onUpdate }: { product: Product; onUpdate: (id: string, qty: number) => Promise<void> }) {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(String(product.quantityInStock || 0));
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Update local value when product changes from external source
  useEffect(() => {
    if (!isEditing) {
      setValue(String(product.quantityInStock || 0));
    }
  }, [product.quantityInStock, isEditing]);

  const handleClick = () => {
    setIsEditing(true);
    // Focus and select all text when editing starts
    setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 0);
  };

  const handleSave = async () => {
    const newQty = parseInt(value, 10);
    if (isNaN(newQty) || newQty < 0) {
      setValue(String(product.quantityInStock || 0));
      setIsEditing(false);
      return;
    }

    if (newQty === (product.quantityInStock || 0)) {
      setIsEditing(false);
      return;
    }

    setIsSaving(true);
    try {
      await onUpdate(product.id, newQty);
    } finally {
      setIsSaving(false);
      setIsEditing(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      setValue(String(product.quantityInStock || 0));
      setIsEditing(false);
    }
  };

  const qty = product.quantityInStock || 0;
  const bgColor = qty === 0 ? 'bg-red-100' : qty <= 5 ? 'bg-yellow-100' : 'bg-green-50';

  if (isEditing) {
    return (
      <div className="flex items-center gap-2">
        <Input
          ref={inputRef}
          type="number"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          className="h-12 w-24 text-lg text-center font-semibold touch-manipulation"
          min="0"
          disabled={isSaving}
        />
        {isSaving && <Icon name="Loader2" className="h-5 w-5 animate-spin text-muted-foreground" />}
      </div>
    );
  }

  return (
    <button
      onClick={handleClick}
      className={cn(
        "h-12 min-w-[80px] px-4 rounded-md font-semibold text-lg flex items-center justify-center gap-2",
        "hover:ring-2 hover:ring-primary hover:ring-offset-2 transition-all",
        "touch-manipulation cursor-pointer",
        bgColor
      )}
    >
      {qty}
      <Icon name="Edit" className="h-4 w-4 text-muted-foreground" />
    </button>
  );
}

// Collapsible category section
function CategorySection({
  category,
  products,
  isExpanded,
  onToggle,
  onUpdateStock,
}: {
  category: string;
  products: Product[];
  isExpanded: boolean;
  onToggle: () => void;
  onUpdateStock: (id: string, qty: number) => Promise<void>;
}) {
  const outOfStock = products.filter(p => (p.quantityInStock || 0) === 0).length;
  const lowStock = products.filter(p => {
    const qty = p.quantityInStock || 0;
    return qty > 0 && qty <= 5;
  }).length;

  return (
    <div className="rounded-lg border shadow-sm mb-4 overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 bg-muted/50 hover:bg-muted transition-colors touch-manipulation"
      >
        <div className="flex items-center gap-3">
          <Icon
            name={isExpanded ? "ChevronDown" : "ChevronRight"}
            className="h-5 w-5 text-muted-foreground"
          />
          <span className="font-semibold text-lg">{category}</span>
          <span className="text-sm text-muted-foreground">({products.length} items)</span>
        </div>
        <div className="flex items-center gap-3">
          {outOfStock > 0 && (
            <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
              {outOfStock} out of stock
            </span>
          )}
          {lowStock > 0 && (
            <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
              {lowStock} low stock
            </span>
          )}
        </div>
      </button>

      {isExpanded && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-base">Product Name</TableHead>
              <TableHead className="text-right text-base w-[150px]">Current Stock</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((product) => (
              <TableRow key={product.id} className="h-16">
                <TableCell className="font-medium text-base">{product.name}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end">
                    <StockCell product={product} onUpdate={onUpdateStock} />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

export default function InventoryPage() {
  const { db } = useFirebase();
  const [products, setProducts] = useState<Product[]>([]);
  const [productCategories, setProductCategories] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  const [isSelectCategoriesDialogOpen, setIsSelectCategoriesDialogOpen] = useState(false);
  const [printType, setPrintType] = useState<PrintType>('count-sheet');
  const [productsForPrinting, setProductsForPrinting] = useState<Product[] | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!db) return;
    setIsLoading(true);
    const unsubscribe = onSnapshot(collection(db, 'products'), (snapshot) => {
      const fetchedProducts: Product[] = [];
      const categoriesFromDb = new Set<string>();
      snapshot.forEach((docSnap) => {
        const productData = docSnap.data() as Omit<Product, 'id'>;
        fetchedProducts.push({ ...productData, id: docSnap.id });
        if (productData.category) {
            categoriesFromDb.add(productData.category);
        }
      });
      setProducts(fetchedProducts.sort((a,b) => a.name.localeCompare(b.name)));
      const sortedCategories = Array.from(categoriesFromDb).sort();
      setProductCategories(sortedCategories);
      // Expand all categories by default on first load
      if (expandedCategories.size === 0 && sortedCategories.length > 0) {
        setExpandedCategories(new Set(sortedCategories));
      }
      setIsLoading(false);
    }, (error) => {
      toast({
        title: "Error",
        description: "Could not fetch products from database.",
        variant: "destructive",
      });
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [db, toast]);

  const filteredProducts = useMemo(() => {
    let result = products;

    // Apply search filter
    if (searchTerm) {
      const lowercasedFilter = searchTerm.toLowerCase();
      result = result.filter(product => {
        const name = product.name.toLowerCase();
        const category = product.category?.toLowerCase() || '';
        return name.includes(lowercasedFilter) || category.includes(lowercasedFilter);
      });
    }

    // Apply category filter
    if (categoryFilter !== 'all') {
      result = result.filter(product => product.category === categoryFilter);
    }

    return result;
  }, [products, searchTerm, categoryFilter]);

  // Group products by category
  const groupedProducts = useMemo(() => {
    const groups = new Map<string, Product[]>();
    filteredProducts.forEach(product => {
      const category = product.category || 'Uncategorized';
      if (!groups.has(category)) {
        groups.set(category, []);
      }
      groups.get(category)!.push(product);
    });
    // Sort categories alphabetically
    return new Map([...groups.entries()].sort((a, b) => a[0].localeCompare(b[0])));
  }, [filteredProducts]);

  // Stats calculations
  const stats = useMemo(() => {
    const outOfStock = products.filter(p => (p.quantityInStock || 0) === 0).length;
    const lowStock = products.filter(p => {
      const qty = p.quantityInStock || 0;
      return qty > 0 && qty <= 5;
    }).length;
    const inStock = products.filter(p => (p.quantityInStock || 0) > 5).length;
    return { outOfStock, lowStock, inStock };
  }, [products]);

  // Inline stock update - no dialog, no page refresh!
  const handleUpdateStock = useCallback(async (productId: string, newQuantity: number) => {
    if (!db) return;

    const product = products.find(p => p.id === productId);
    if (!product) return;

    try {
      const productRef = doc(db, 'products', productId);
      await setDoc(productRef, { quantityInStock: newQuantity }, { merge: true });
      toast({
        title: "Stock Updated",
        description: `${product.name}: ${newQuantity}`,
      });
    } catch (error) {
      toast({ title: "Error", description: "Could not update stock quantity.", variant: "destructive" });
      throw error; // Re-throw so StockCell can handle it
    }
  }, [db, products, toast]);

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  const expandAll = () => {
    setExpandedCategories(new Set(productCategories));
  };

  const collapseAll = () => {
    setExpandedCategories(new Set());
  };

  const handleOpenPrintDialog = (type: PrintType) => {
    setPrintType(type);
    setIsSelectCategoriesDialogOpen(true);
  };

  const handlePrintRequest = (selectedCategories: string[]) => {
     if (selectedCategories.length === 0) {
      toast({ title: "No Categories Selected", description: "Please select at least one category to print.", variant: "default" });
      setIsSelectCategoriesDialogOpen(false);
      return;
    }

    const productsToPrint = products.filter(p => selectedCategories.includes(p.category));

    if (productsToPrint.length === 0) {
      toast({ title: "No Products Found", description: "No products in the selected categories to print.", variant: "default" });
      setIsSelectCategoriesDialogOpen(false);
      return;
    }

    setProductsForPrinting(productsToPrint);

    setTimeout(() => {
      if (printRef.current) {
        const printContents = printRef.current.innerHTML;
        const win = window.open('', '_blank');
        if (win) {
          win.document.write(`
            <html>
              <head>
                <title>Inventory Report</title>
                <style>
                  body { font-family: sans-serif; margin: 2rem; }
                  table { width: 100%; border-collapse: collapse; page-break-inside: auto; }
                  th, td { border: 1px solid #ddd; padding: 8px; text-align: left; page-break-inside: avoid; }
                  th { background-color: #f2f2f2; }
                  h1, h2 { text-align: center; }
                  section { page-break-after: always; }
                  section:last-child { page-break-after: avoid; }
                </style>
              </head>
              <body>
                ${printContents}
              </body>
            </html>
          `);
          win.document.close();
          win.focus();
          setTimeout(() => {
            win.print();
            win.close();
          }, 250);
        } else {
          toast({ title: "Print Error", description: "Could not open print window. Please check your browser's popup blocker.", variant: "destructive" });
        }
      }
      setProductsForPrinting(null);
    }, 100);

    setIsSelectCategoriesDialogOpen(false);
  };


  if (isLoading && products.length === 0) {
    return (
      <PageHeader title="Inventory Management" description="Loading product inventory...">
        <div className="flex items-center justify-center h-32">
          <Icon name="Loader2" className="h-8 w-8 animate-spin" />
        </div>
      </PageHeader>
    );
  }

  return (
    <>
      <PageHeader title="Inventory Management" description="View and update product stock levels. Tap any quantity to edit.">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" disabled={isLoading || products.length === 0} className="h-12 touch-manipulation">
              <Icon name="Printer" className="mr-2 h-4 w-4" />
              Print Reports
              <Icon name="ChevronDown" className="ml-2 h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => handleOpenPrintDialog('count-sheet')} className="h-12 touch-manipulation">
              <Icon name="ClipboardList" className="mr-2 h-4 w-4" />
              Inventory Count Sheet
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => handleOpenPrintDialog('valuation-summary')} className="h-12 touch-manipulation">
              <Icon name="TrendingUp" className="mr-2 h-4 w-4" />
              Stock Valuation (Summary)
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => handleOpenPrintDialog('valuation-detailed')} className="h-12 touch-manipulation">
              <Icon name="FileText" className="mr-2 h-4 w-4" />
              Stock Valuation (Detailed)
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </PageHeader>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card className={stats.outOfStock > 0 ? "border-red-200 bg-red-50" : ""}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Out of Stock</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={cn("text-3xl font-bold", stats.outOfStock > 0 ? "text-red-600" : "")}>
              {stats.outOfStock}
            </div>
          </CardContent>
        </Card>
        <Card className={stats.lowStock > 0 ? "border-yellow-200 bg-yellow-50" : ""}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Low Stock (1-5)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={cn("text-3xl font-bold", stats.lowStock > 0 ? "text-yellow-600" : "")}>
              {stats.lowStock}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">In Stock (6+)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{stats.inStock}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-4">
        <Input
          placeholder="Search by product name or category..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 h-12 text-base touch-manipulation"
        />
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-full sm:w-[200px] h-12 text-base touch-manipulation">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="h-12 touch-manipulation">All Categories</SelectItem>
            {productCategories.map(cat => (
              <SelectItem key={cat} value={cat} className="h-12 touch-manipulation">{cat}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex gap-2">
          <Button variant="outline" onClick={expandAll} className="h-12 touch-manipulation">
            <Icon name="ChevronsDown" className="mr-2 h-4 w-4" />
            Expand All
          </Button>
          <Button variant="outline" onClick={collapseAll} className="h-12 touch-manipulation">
            <Icon name="ChevronsUp" className="mr-2 h-4 w-4" />
            Collapse All
          </Button>
        </div>
      </div>

      {/* Category Sections */}
      {Array.from(groupedProducts.entries()).map(([category, categoryProducts]) => (
        <CategorySection
          key={category}
          category={category}
          products={categoryProducts}
          isExpanded={expandedCategories.has(category)}
          onToggle={() => toggleCategory(category)}
          onUpdateStock={handleUpdateStock}
        />
      ))}

      {filteredProducts.length === 0 && !isLoading && (
        <div className="rounded-lg border shadow-sm p-8 text-center">
          <Icon name="Package" className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground text-lg">
            {searchTerm || categoryFilter !== 'all' ? "No products match your search." : "No products found."}
          </p>
        </div>
      )}

      {isSelectCategoriesDialogOpen && (
        <SelectCategoriesDialog
          isOpen={isSelectCategoriesDialogOpen}
          onOpenChange={setIsSelectCategoriesDialogOpen}
          allCategories={productCategories}
          onSubmit={handlePrintRequest}
        />
      )}

      <div style={{ display: 'none' }}>
        {productsForPrinting && printType === 'count-sheet' && <PrintableInventorySheet ref={printRef} products={productsForPrinting} />}
        {productsForPrinting && printType === 'valuation-detailed' && <PrintableStockValuationSheet ref={printRef} products={productsForPrinting} />}
        {productsForPrinting && printType === 'valuation-summary' && <PrintableValuationSummary ref={printRef} products={productsForPrinting} />}
      </div>
    </>
  );
}
