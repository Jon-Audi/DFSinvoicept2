"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { PageHeader } from '@/components/page-header';
import { Icon } from '@/components/icons';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Product } from '@/types';
import { useToast } from "@/hooks/use-toast";
import { useFirebase } from '@/components/firebase-provider';
import { collection, onSnapshot, doc, setDoc } from 'firebase/firestore';
import { ProductDialog } from '@/components/products/product-dialog';
import { PriceHistoryDialog } from '@/components/products/price-history-dialog';

type PricingIssue = 'low-markup' | 'zero-price' | 'zero-cost' | 'negative-margin' | 'none';

interface ProductWithIssue extends Product {
  issue: PricingIssue;
  margin: number;
  marginPercent: number;
}

export default function PricingReviewPage() {
  const { db } = useFirebase();
  const [products, setProducts] = useState<Product[]>([]);
  const [productCategories, setProductCategories] = useState<string[]>([]);
  const [productSubcategories, setProductSubcategories] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedIssue, setSelectedIssue] = useState<PricingIssue | 'all'>('all');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const { toast } = useToast();

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
        if (productData.subcategory) {
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

  const productsWithIssues = useMemo((): ProductWithIssue[] => {
    return products.map(product => {
      const cost = product.cost || 0;
      const price = product.price || 0;
      const markup = product.markupPercentage || 0;
      const margin = price - cost;
      const marginPercent = cost > 0 ? (margin / cost) * 100 : 0;

      let issue: PricingIssue = 'none';

      if (price === 0) {
        issue = 'zero-price';
      } else if (cost === 0) {
        issue = 'zero-cost';
      } else if (margin < 0) {
        issue = 'negative-margin';
      } else if (markup < 20) {
        issue = 'low-markup';
      }

      return {
        ...product,
        issue,
        margin,
        marginPercent,
      };
    });
  }, [products]);

  const filteredProducts = useMemo(() => {
    return productsWithIssues.filter(product => {
      const matchesSearch = !searchTerm ||
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.subcategory?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
      const matchesIssue = selectedIssue === 'all' || product.issue === selectedIssue;

      return matchesSearch && matchesCategory && matchesIssue;
    }).sort((a, b) => {
      // Sort by severity: negative margin > zero price > zero cost > low markup > none
      const issuePriority: Record<PricingIssue, number> = {
        'negative-margin': 4,
        'zero-price': 3,
        'zero-cost': 2,
        'low-markup': 1,
        'none': 0,
      };
      return issuePriority[b.issue] - issuePriority[a.issue];
    });
  }, [productsWithIssues, searchTerm, selectedCategory, selectedIssue]);

  const issueStats = useMemo(() => {
    return {
      total: productsWithIssues.length,
      zeroPrice: productsWithIssues.filter(p => p.issue === 'zero-price').length,
      zeroCost: productsWithIssues.filter(p => p.issue === 'zero-cost').length,
      negativeMargin: productsWithIssues.filter(p => p.issue === 'negative-margin').length,
      lowMarkup: productsWithIssues.filter(p => p.issue === 'low-markup').length,
      healthy: productsWithIssues.filter(p => p.issue === 'none').length,
    };
  }, [productsWithIssues]);

  const handleSaveProduct = async (productToSave: Omit<Product, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) => {
    if (!db) return;
    const { id, ...productData } = productToSave;

    // Clean undefined values
    const cleanedData = Object.entries(productData).reduce((acc, [key, value]) => {
      if (value !== undefined) {
        acc[key] = value;
      }
      return acc;
    }, {} as any);

    try {
      if (id) {
        const docRef = doc(db, 'products', id);
        await setDoc(docRef, cleanedData, { merge: true });
        toast({ title: "Product Updated", description: `Updated pricing for ${cleanedData.name}.` });
        setEditingProduct(null);
      }
    } catch (error: any) {
      console.error('Error saving product:', error);
      toast({ title: "Error", description: `Could not save product. ${error?.message || ''}`, variant: "destructive" });
    }
  };

  const handleAddNewCategory = (newCategory: string) => {
    if (!productCategories.some(c => c.toLowerCase() === newCategory.toLowerCase())) {
      setProductCategories([...productCategories, newCategory].sort());
    }
  };

  const handleAddNewSubcategory = (newSubcategory: string) => {
    if (!productSubcategories.some(s => s.toLowerCase() === newSubcategory.toLowerCase())) {
      setProductSubcategories([...productSubcategories, newSubcategory].sort());
    }
  };

  const getIssueBadge = (issue: PricingIssue) => {
    const badges: Record<PricingIssue, { label: string; variant: 'default' | 'destructive' | 'secondary' | 'outline' }> = {
      'negative-margin': { label: 'Negative Margin', variant: 'destructive' },
      'zero-price': { label: 'No Price', variant: 'destructive' },
      'zero-cost': { label: 'No Cost', variant: 'secondary' },
      'low-markup': { label: 'Low Markup', variant: 'outline' },
      'none': { label: 'OK', variant: 'default' },
    };

    const { label, variant } = badges[issue];
    return <Badge variant={variant}>{label}</Badge>;
  };

  if (isLoading) {
    return (
      <PageHeader title="Pricing Review" description="Loading products...">
        <div className="flex items-center justify-center h-32">
          <Icon name="Loader2" className="h-8 w-8 animate-spin" />
        </div>
      </PageHeader>
    );
  }

  return (
    <>
      <PageHeader
        title="Pricing Review"
        description="Review and verify pricing, costs, and markups across your entire product catalog."
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Products</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{issueStats.total}</div>
          </CardContent>
        </Card>

        <Card className="border-destructive/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-destructive">Negative Margin</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{issueStats.negativeMargin}</div>
          </CardContent>
        </Card>

        <Card className="border-destructive/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-destructive">No Price</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{issueStats.zeroPrice}</div>
          </CardContent>
        </Card>

        <Card className="border-yellow-500/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-yellow-600">No Cost</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{issueStats.zeroCost}</div>
          </CardContent>
        </Card>

        <Card className="border-orange-500/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-orange-600">Low Markup</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{issueStats.lowMarkup}</div>
          </CardContent>
        </Card>

        <Card className="border-green-500/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-600">Healthy</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{issueStats.healthy}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Search</label>
              <Input
                placeholder="Search by name or category..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Category</label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger aria-label="Category">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {productCategories.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Issue Type</label>
              <Select value={selectedIssue} onValueChange={(v) => setSelectedIssue(v as PricingIssue | 'all')}>
                <SelectTrigger aria-label="Issue Type">
                  <SelectValue placeholder="All Issues" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Issues</SelectItem>
                  <SelectItem value="negative-margin">Negative Margin</SelectItem>
                  <SelectItem value="zero-price">No Price</SelectItem>
                  <SelectItem value="zero-cost">No Cost</SelectItem>
                  <SelectItem value="low-markup">Low Markup (&lt;20%)</SelectItem>
                  <SelectItem value="none">Healthy</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Products Table */}
      <Card>
        <CardHeader>
          <CardTitle>Product Pricing ({filteredProducts.length} products)</CardTitle>
          <CardDescription>
            Review pricing details and click Edit to fix any issues.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Cost</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-right">Markup %</TableHead>
                  <TableHead className="text-right">Margin</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.length > 0 ? filteredProducts.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell>{getIssueBadge(product.issue)}</TableCell>
                    <TableCell className="font-medium">{product.name}</TableCell>
                    <TableCell>
                      <div>
                        <div className="text-sm">{product.category}</div>
                        {product.subcategory && (
                          <div className="text-xs text-muted-foreground">{product.subcategory}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">${product.cost?.toFixed(2) || '0.00'}</TableCell>
                    <TableCell className="text-right">${product.price?.toFixed(2) || '0.00'}</TableCell>
                    <TableCell className="text-right">
                      {product.markupPercentage?.toFixed(1) || '0.0'}%
                    </TableCell>
                    <TableCell className="text-right">
                      <div className={product.margin < 0 ? 'text-destructive font-semibold' : ''}>
                        ${product.margin.toFixed(2)}
                        <span className="text-xs text-muted-foreground ml-1">
                          ({product.marginPercent.toFixed(1)}%)
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-2 justify-end">
                        <PriceHistoryDialog
                          productId={product.id}
                          productName={product.name}
                          triggerButton={
                            <Button variant="ghost" size="sm">
                              <Icon name="History" className="mr-2 h-4 w-4" />
                              History
                            </Button>
                          }
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEditingProduct(product)}
                        >
                          <Icon name="Edit" className="mr-2 h-4 w-4" />
                          Edit
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )) : (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground p-6">
                      No products match your filters.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {editingProduct && (
        <ProductDialog
          product={editingProduct}
          allProducts={products}
          triggerButton={<div />}
          onSave={handleSaveProduct}
          productCategories={productCategories}
          onAddNewCategory={handleAddNewCategory}
          productSubcategories={productSubcategories}
          onAddNewSubcategory={handleAddNewSubcategory}
        />
      )}
    </>
  );
}
