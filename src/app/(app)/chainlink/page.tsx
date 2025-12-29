"use client";

import React, { useState, useEffect } from 'react';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/icons';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from "@/hooks/use-toast";
import { useFirebase } from '@/components/firebase-provider';
import { doc, getDoc } from 'firebase/firestore';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import type { ChainlinkFenceHeight, ChainlinkFenceType, ChainlinkRun, ChainlinkEstimationResult, ChainlinkMaterialPricing, ChainlinkProductMapping, Product, LineItem, Customer } from '@/types';
import { calculateChainlinkMaterials, calculateChainlinkCost } from '@/lib/chainlink-calculator';
import { useRouter } from 'next/navigation';
import { collection, getDocs, onSnapshot, addDoc } from 'firebase/firestore';
import { EstimateDialog } from '@/components/estimates/estimate-dialog';
import { OrderDialog } from '@/components/orders/order-dialog';
import { InvoiceDialog } from '@/components/invoices/invoice-dialog';
import type { EstimateFormData } from '@/components/estimates/estimate-form';
import type { OrderFormData } from '@/components/orders/order-form';
import type { InvoiceFormData } from '@/components/invoices/invoice-form';

const FENCE_HEIGHTS: ChainlinkFenceHeight[] = ['3', '4', '5', '6', '7', '8', '9', '10'];

export default function ChainlinkEstimationPage() {
  const { db } = useFirebase();
  const router = useRouter();
  const { toast } = useToast();

  // Form inputs
  const [runs, setRuns] = useState<ChainlinkRun[]>([{ length: 0 }]);
  const [fenceHeight, setFenceHeight] = useState<ChainlinkFenceHeight>('6');
  const [fenceType, setFenceType] = useState<ChainlinkFenceType>('residential');
  const [ends, setEnds] = useState<number>(2);
  const [corners, setCorners] = useState<number>(0);

  // Results
  const [result, setResult] = useState<ChainlinkEstimationResult | null>(null);
  const [estimatedCost, setEstimatedCost] = useState<number>(0);

  // Pricing data
  const [pricing, setPricing] = useState<ChainlinkMaterialPricing | null>(null);
  const [isLoadingPricing, setIsLoadingPricing] = useState(false);

  // Document conversion state
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [productCategories, setProductCategories] = useState<string[]>([]);
  const [productSubcategories, setProductSubcategories] = useState<string[]>([]);
  const [isEstimateDialogOpen, setIsEstimateDialogOpen] = useState(false);
  const [isOrderDialogOpen, setIsOrderDialogOpen] = useState(false);
  const [isInvoiceDialogOpen, setIsInvoiceDialogOpen] = useState(false);
  const [initialFormData, setInitialFormData] = useState<Partial<EstimateFormData> & { lineItems: LineItem[] } | null>(null);

  // Load customers
  useEffect(() => {
    if (!db) return;
    const unsubscribe = onSnapshot(collection(db, 'customers'), (snapshot) => {
      const fetchedCustomers: Customer[] = [];
      snapshot.forEach((docSnap) => {
        fetchedCustomers.push({ ...docSnap.data() as Omit<Customer, 'id'>, id: docSnap.id });
      });
      setCustomers(fetchedCustomers);
    });
    return () => unsubscribe();
  }, [db]);

  // Load products and categories
  useEffect(() => {
    if (!db) return;
    const unsubscribe = onSnapshot(collection(db, 'products'), (snapshot) => {
      const fetchedProducts: Product[] = [];
      const categories = new Set<string>();
      const subcategories = new Set<string>();
      snapshot.forEach((docSnap) => {
        const product = { ...docSnap.data() as Omit<Product, 'id'>, id: docSnap.id };
        fetchedProducts.push(product);
        if (product.category) categories.add(product.category);
        if (product.subcategory) subcategories.add(product.subcategory);
      });
      setProducts(fetchedProducts);
      setProductCategories(Array.from(categories).sort());
      setProductSubcategories(Array.from(subcategories).sort());
    });
    return () => unsubscribe();
  }, [db]);

  // Load pricing when fence type or height changes
  useEffect(() => {
    if (!db) return;

    const loadPricing = async () => {
      setIsLoadingPricing(true);
      try {
        const docRef = doc(db, 'settings', 'chainlinkPricing');
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          const typeData = data[fenceType];
          if (typeData && typeData[fenceHeight]) {
            setPricing(typeData[fenceHeight]);
          } else {
            setPricing(null);
            toast({
              title: "Pricing Not Configured",
              description: `No pricing found for ${fenceType} ${fenceHeight}'. Please configure in Settings > Chainlink Pricing.`,
              variant: "destructive",
            });
          }
        } else {
          setPricing(null);
        }
      } catch (error) {
        console.error('Error loading pricing:', error);
        setPricing(null);
      } finally {
        setIsLoadingPricing(false);
      }
    };

    loadPricing();
  }, [db, fenceType, fenceHeight, toast]);

  const addRun = () => {
    setRuns([...runs, { length: 0 }]);
  };

  const removeRun = (index: number) => {
    if (runs.length > 1) {
      setRuns(runs.filter((_, i) => i !== index));
    }
  };

  const updateRun = (index: number, length: number) => {
    const newRuns = [...runs];
    newRuns[index] = { length };
    setRuns(newRuns);
  };

  const calculateEstimate = () => {
    // Validate inputs
    const totalLength = runs.reduce((sum, run) => sum + run.length, 0);
    if (totalLength <= 0) {
      toast({
        title: "Invalid Input",
        description: "Please enter at least one fence run with a length greater than 0.",
        variant: "destructive",
      });
      return;
    }

    // Calculate materials
    const calculationResult = calculateChainlinkMaterials({
      runs,
      fenceHeight,
      fenceType,
      ends,
      corners,
    });

    setResult(calculationResult);

    // Calculate cost if pricing is available
    if (pricing) {
      const cost = calculateChainlinkCost(calculationResult, pricing);
      setEstimatedCost(cost);
    } else {
      setEstimatedCost(0);
    }
  };

  const clearForm = () => {
    setRuns([{ length: 0 }]);
    setFenceHeight('6');
    setFenceType('residential');
    setEnds(2);
    setCorners(0);
    setResult(null);
    setEstimatedCost(0);
  };

  const totalLinearFeet = runs.reduce((sum, run) => sum + run.length, 0);

  const convertToDocument = async (documentType: 'estimate' | 'order' | 'invoice') => {
    if (!db || !result) return;

    try {
      // Load product mappings for current height and type
      const settingsDocRef = doc(db, 'settings', 'chainlinkProductMapping');
      const settingsSnap = await getDoc(settingsDocRef);

      if (!settingsSnap.exists()) {
        toast({
          title: "Configuration Missing",
          description: "Please configure product mappings in Settings > Chainlink first.",
          variant: "destructive",
        });
        return;
      }

      const mappingsData = settingsSnap.data();
      const mapping: ChainlinkProductMapping | undefined = mappingsData[fenceType]?.[fenceHeight];

      if (!mapping) {
        toast({
          title: "Configuration Missing",
          description: `No product mapping found for ${fenceType} ${fenceHeight}' fence. Please configure in Settings > Chainlink.`,
          variant: "destructive",
        });
        return;
      }

      // Load all products to get details
      const productsSnapshot = await getDocs(collection(db, 'products'));
      const productsMap = new Map<string, Product>();
      productsSnapshot.forEach(docSnap => {
        const product = { ...docSnap.data() as Omit<Product, 'id'>, id: docSnap.id };
        productsMap.set(docSnap.id, product);
      });

      // Build line items from calculation results
      const lineItems: LineItem[] = [];

      // Helper function to create a line item from a product
      const createLineItem = (product: Product, quantity: number): LineItem => ({
        id: crypto.randomUUID(),
        productId: product.id,
        productName: product.name,
        quantity: quantity,
        unit: product.unit,
        unitPrice: product.price,
        total: product.price * quantity,
        isNonStock: false,
        isReturn: false,
        cost: product.cost || 0,
        markupPercentage: product.markupPercentage || 0,
      });

      // Terminal Posts (Ends)
      if (ends > 0 && mapping.terminalPostProductId) {
        const product = productsMap.get(mapping.terminalPostProductId);
        if (product) {
          lineItems.push(createLineItem(product, ends));
        }
      }

      // Corner Posts
      if (corners > 0 && mapping.cornerPostProductId) {
        const product = productsMap.get(mapping.cornerPostProductId);
        if (product) {
          lineItems.push(createLineItem(product, corners));
        }
      }

      // Interior Line Posts
      if (result.interiorLinePosts && result.interiorLinePosts > 0 && mapping.linePostProductId) {
        const product = productsMap.get(mapping.linePostProductId);
        if (product) {
          lineItems.push(createLineItem(product, result.interiorLinePosts));
        }
      }

      // Fabric
      if (result.fabricFootage && mapping.fabricProductId) {
        const product = productsMap.get(mapping.fabricProductId);
        if (product) {
          lineItems.push(createLineItem(product, result.fabricFootage));
        }
      }

      // Top Rail
      if (result.topRailSticks && mapping.topRailProductId) {
        const product = productsMap.get(mapping.topRailProductId);
        if (product) {
          lineItems.push(createLineItem(product, result.topRailSticks));
        }
      }

      // Tie Wires
      if (result.tieWires && mapping.tieWireProductId) {
        const product = productsMap.get(mapping.tieWireProductId);
        if (product) {
          lineItems.push(createLineItem(product, result.tieWires));
        }
      }

      // Loop Caps
      if (result.loopCaps && mapping.loopCapProductId) {
        const product = productsMap.get(mapping.loopCapProductId);
        if (product) {
          lineItems.push(createLineItem(product, result.loopCaps));
        }
      }

      // Post Caps
      if (result.postCaps && mapping.postCapProductId) {
        const product = productsMap.get(mapping.postCapProductId);
        if (product) {
          lineItems.push(createLineItem(product, result.postCaps));
        }
      }

      // Brace Bands
      if (result.braceBands && mapping.braceBandProductId) {
        const product = productsMap.get(mapping.braceBandProductId);
        if (product) {
          lineItems.push(createLineItem(product, result.braceBands));
        }
      }

      // Tension Bars
      if (result.tensionBars && mapping.tensionBarProductId) {
        const product = productsMap.get(mapping.tensionBarProductId);
        if (product) {
          lineItems.push(createLineItem(product, result.tensionBars));
        }
      }

      // Tension Bands
      if (result.tensionBands && mapping.tensionBandProductId) {
        const product = productsMap.get(mapping.tensionBandProductId);
        if (product) {
          lineItems.push(createLineItem(product, result.tensionBands));
        }
      }

      // Nuts & Bolts
      if (result.nutsAndBolts && mapping.nutAndBoltProductId) {
        const product = productsMap.get(mapping.nutAndBoltProductId);
        if (product) {
          lineItems.push(createLineItem(product, result.nutsAndBolts));
        }
      }

      if (lineItems.length === 0) {
        toast({
          title: "No Products Mapped",
          description: "No products could be found for the calculated materials. Please check your product mappings.",
          variant: "destructive",
        });
        return;
      }

      // Prepare initial form data with line items
      const formData: Partial<EstimateFormData> & { lineItems: LineItem[] } = {
        lineItems: lineItems,
        notes: `Chainlink ${fenceType} ${fenceHeight}' fence\nTotal linear feet: ${totalLinearFeet}\nRuns: ${runs.length}\nEnds: ${ends}\nCorners: ${corners}`,
      };

      setInitialFormData(formData);

      // Open the appropriate dialog
      if (documentType === 'estimate') {
        setIsEstimateDialogOpen(true);
      } else if (documentType === 'order') {
        setIsOrderDialogOpen(true);
      } else if (documentType === 'invoice') {
        setIsInvoiceDialogOpen(true);
      }

      toast({
        title: "Materials Loaded",
        description: `${lineItems.length} items loaded from chainlink estimation.`,
      });
    } catch (error) {
      console.error('Error converting to document:', error);
      toast({
        title: "Error",
        description: "Failed to convert estimation to document. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleSaveEstimate = async (estimate: any) => {
    if (!db) return;
    try {
      // Remove id field before adding to Firestore (Firestore auto-generates IDs)
      const { id, ...estimateData } = estimate;
      await addDoc(collection(db, 'estimates'), estimateData);
      toast({ title: "Success", description: "Estimate created successfully." });
      setIsEstimateDialogOpen(false);
      setInitialFormData(null);
    } catch (error) {
      console.error('Error creating estimate:', error);
      toast({ title: "Error", description: `Failed to create estimate: ${error instanceof Error ? error.message : 'Unknown error'}`, variant: "destructive" });
    }
  };

  const handleSaveOrder = async (order: any) => {
    if (!db) return;
    try {
      // Remove id field before adding to Firestore (Firestore auto-generates IDs)
      const { id, ...orderData } = order;
      await addDoc(collection(db, 'orders'), orderData);
      toast({ title: "Success", description: "Order created successfully." });
      setIsOrderDialogOpen(false);
      setInitialFormData(null);
    } catch (error) {
      console.error('Error creating order:', error);
      toast({ title: "Error", description: `Failed to create order: ${error instanceof Error ? error.message : 'Unknown error'}`, variant: "destructive" });
    }
  };

  const handleSaveInvoice = async (invoice: any) => {
    if (!db) return;
    try {
      // Remove id field before adding to Firestore (Firestore auto-generates IDs)
      const { id, ...invoiceData } = invoice;
      await addDoc(collection(db, 'invoices'), invoiceData);
      toast({ title: "Success", description: "Invoice created successfully." });
      setIsInvoiceDialogOpen(false);
      setInitialFormData(null);
    } catch (error) {
      console.error('Error creating invoice:', error);
      toast({ title: "Error", description: `Failed to create invoice: ${error instanceof Error ? error.message : 'Unknown error'}`, variant: "destructive" });
    }
  };

  const handleSaveProduct = async (product: Omit<Product, 'id'>) => {
    if (!db) return;
    try {
      const docRef = await addDoc(collection(db, 'products'), product);
      return docRef.id;
    } catch (error) {
      toast({ title: "Error", description: "Failed to save product.", variant: "destructive" });
    }
  };

  const handleSaveCustomer = async (customer: Omit<Customer, 'id'> & { id?: string }) => {
    if (!db) return;
    try {
      const docRef = await addDoc(collection(db, 'customers'), customer);
      return docRef.id;
    } catch (error) {
      toast({ title: "Error", description: "Failed to save customer.", variant: "destructive" });
    }
  };

  return (
    <>
      <PageHeader
        title="Chainlink Estimation"
        description="Calculate material requirements and costs for chainlink fence installations."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Input Form */}
        <Card>
          <CardHeader>
            <CardTitle>Project Details</CardTitle>
            <CardDescription>Enter fence run measurements and configuration</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Fence Runs */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Fence Runs (Linear Feet)</Label>
                <Button variant="outline" size="sm" onClick={addRun}>
                  <Icon name="Plus" className="h-4 w-4 mr-1" />
                  Add Run
                </Button>
              </div>
              {runs.map((run, index) => (
                <div key={index} className="flex gap-2 items-center">
                  <Label className="w-16">Run {index + 1}:</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.1"
                    value={run.length || ''}
                    onChange={(e) => updateRun(index, parseFloat(e.target.value) || 0)}
                    placeholder="0"
                    className="flex-1"
                  />
                  <span className="text-sm text-muted-foreground w-8">ft</span>
                  {runs.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeRun(index)}
                    >
                      <Icon name="X" className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              <div className="text-sm font-medium">
                Total: {totalLinearFeet.toFixed(1)} ft
              </div>
            </div>

            {/* Fence Height */}
            <div className="space-y-2">
              <Label>Fence Height</Label>
              <Select value={fenceHeight} onValueChange={(value) => setFenceHeight(value as ChainlinkFenceHeight)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FENCE_HEIGHTS.map(height => (
                    <SelectItem key={height} value={height}>{height} feet</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Fence Type */}
            <div className="space-y-2">
              <Label>Fence Type</Label>
              <Select value={fenceType} onValueChange={(value) => setFenceType(value as ChainlinkFenceType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="residential">Residential (SS20 WT)</SelectItem>
                  <SelectItem value="commercial">Commercial (SS40 WT)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Ends */}
            <div className="space-y-2">
              <Label>Number of Ends</Label>
              <Input
                type="number"
                min="0"
                value={ends}
                onChange={(e) => setEnds(parseInt(e.target.value) || 0)}
              />
              <p className="text-xs text-muted-foreground">Terminal posts at open ends of fence</p>
            </div>

            {/* Corners */}
            <div className="space-y-2">
              <Label>Number of Corners</Label>
              <Input
                type="number"
                min="0"
                value={corners}
                onChange={(e) => setCorners(parseInt(e.target.value) || 0)}
              />
              <p className="text-xs text-muted-foreground">Corner posts that change direction</p>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-4">
              <Button onClick={calculateEstimate} className="flex-1">
                <Icon name="Calculator" className="mr-2 h-4 w-4" />
                Calculate
              </Button>
              <Button variant="outline" onClick={clearForm}>
                Clear
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        <div className="space-y-6">
          {/* Material List */}
          <Card>
            <CardHeader>
              <CardTitle>Material Requirements</CardTitle>
              <CardDescription>
                {result ? 'Based on 10-foot post spacing' : 'Enter project details and click Calculate'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {result ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Material</TableHead>
                      <TableHead className="text-right">Quantity</TableHead>
                      {pricing && <TableHead className="text-right">Cost</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {result.interiorLinePosts !== undefined && (
                      <TableRow>
                        <TableCell>Interior Line Posts</TableCell>
                        <TableCell className="text-right">{result.interiorLinePosts}</TableCell>
                        {pricing && (
                          <TableCell className="text-right">
                            ${(result.interiorLinePosts * pricing.interiorLinePostPrice).toFixed(2)}
                          </TableCell>
                        )}
                      </TableRow>
                    )}
                    <TableRow>
                      <TableCell>Fabric ({result.fabricType})</TableCell>
                      <TableCell className="text-right">{result.fabricFootage} ft</TableCell>
                      {pricing && (
                        <TableCell className="text-right">
                          ${(result.fabricFootage * pricing.fabricPricePerFoot).toFixed(2)}
                        </TableCell>
                      )}
                    </TableRow>
                    {result.topRailSticks !== undefined && (
                      <TableRow>
                        <TableCell>Top Rail Sticks (21')</TableCell>
                        <TableCell className="text-right">{result.topRailSticks}</TableCell>
                        {pricing && (
                          <TableCell className="text-right">
                            ${(result.topRailSticks * pricing.topRailPricePerStick).toFixed(2)}
                          </TableCell>
                        )}
                      </TableRow>
                    )}
                    {result.tieWires !== undefined && (
                      <TableRow>
                        <TableCell>Tie Wires</TableCell>
                        <TableCell className="text-right">{result.tieWires}</TableCell>
                        {pricing && (
                          <TableCell className="text-right">
                            ${(result.tieWires * pricing.tieWirePrice).toFixed(2)}
                          </TableCell>
                        )}
                      </TableRow>
                    )}
                    {result.loopCaps !== undefined && (
                      <TableRow>
                        <TableCell>Loop Caps</TableCell>
                        <TableCell className="text-right">{result.loopCaps}</TableCell>
                        {pricing && (
                          <TableCell className="text-right">
                            ${(result.loopCaps * pricing.loopCapPrice).toFixed(2)}
                          </TableCell>
                        )}
                      </TableRow>
                    )}
                    {result.postCaps !== undefined && (
                      <TableRow>
                        <TableCell>Post Caps</TableCell>
                        <TableCell className="text-right">{result.postCaps}</TableCell>
                        {pricing && (
                          <TableCell className="text-right">
                            ${(result.postCaps * pricing.postCapPrice).toFixed(2)}
                          </TableCell>
                        )}
                      </TableRow>
                    )}
                    {result.braceBands !== undefined && (
                      <TableRow>
                        <TableCell>Brace Bands</TableCell>
                        <TableCell className="text-right">{result.braceBands}</TableCell>
                        {pricing && (
                          <TableCell className="text-right">
                            ${(result.braceBands * pricing.braceBandPrice).toFixed(2)}
                          </TableCell>
                        )}
                      </TableRow>
                    )}
                    {result.tensionBars !== undefined && (
                      <TableRow>
                        <TableCell>Tension Bars</TableCell>
                        <TableCell className="text-right">{result.tensionBars}</TableCell>
                        {pricing && (
                          <TableCell className="text-right">
                            ${(result.tensionBars * pricing.tensionBarPrice).toFixed(2)}
                          </TableCell>
                        )}
                      </TableRow>
                    )}
                    {result.tensionBands !== undefined && (
                      <TableRow>
                        <TableCell>Tension Bands</TableCell>
                        <TableCell className="text-right">{result.tensionBands}</TableCell>
                        {pricing && (
                          <TableCell className="text-right">
                            ${(result.tensionBands * pricing.tensionBandPrice).toFixed(2)}
                          </TableCell>
                        )}
                      </TableRow>
                    )}
                    {result.nutsAndBolts !== undefined && (
                      <TableRow>
                        <TableCell>Nuts & Bolts</TableCell>
                        <TableCell className="text-right">{result.nutsAndBolts}</TableCell>
                        {pricing && (
                          <TableCell className="text-right">
                            ${(result.nutsAndBolts * pricing.nutAndBoltPrice).toFixed(2)}
                          </TableCell>
                        )}
                      </TableRow>
                    )}
                    <TableRow>
                      <TableCell className="font-medium">Pipe Weight</TableCell>
                      <TableCell className="text-right font-medium" colSpan={pricing ? 2 : 1}>
                        {result.pipeWeight}
                      </TableCell>
                    </TableRow>
                    {pricing && (
                      <TableRow className="border-t-2">
                        <TableCell className="font-bold">Total Estimated Cost</TableCell>
                        <TableCell></TableCell>
                        <TableCell className="text-right font-bold">
                          ${estimatedCost.toFixed(2)}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Icon name="Calculator" className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No calculation yet</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Convert Actions */}
          {result && (
            <Card>
              <CardHeader>
                <CardTitle>Convert to Document</CardTitle>
                <CardDescription>Create a quote, order, or invoice from this estimate</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button className="w-full" variant="outline" onClick={() => convertToDocument('estimate')}>
                  <Icon name="FileText" className="mr-2 h-4 w-4" />
                  Convert to Estimate
                </Button>
                <Button className="w-full" variant="outline" onClick={() => convertToDocument('order')}>
                  <Icon name="ShoppingCart" className="mr-2 h-4 w-4" />
                  Convert to Order
                </Button>
                <Button className="w-full" variant="outline" onClick={() => convertToDocument('invoice')}>
                  <Icon name="Receipt" className="mr-2 h-4 w-4" />
                  Convert to Invoice
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Hidden dialogs for converting to estimate/order/invoice */}
      {initialFormData && (
        <>
          <EstimateDialog
            isOpen={isEstimateDialogOpen}
            onOpenChange={setIsEstimateDialogOpen}
            initialData={initialFormData}
            onSave={handleSaveEstimate}
            onSaveProduct={handleSaveProduct}
            onSaveCustomer={handleSaveCustomer}
            customers={customers}
            products={products}
            productCategories={productCategories}
            productSubcategories={productSubcategories}
          />
          <OrderDialog
            isOpen={isOrderDialogOpen}
            onOpenChange={setIsOrderDialogOpen}
            initialData={initialFormData}
            onSave={handleSaveOrder}
            onSaveProduct={handleSaveProduct}
            onSaveCustomer={handleSaveCustomer}
            customers={customers}
            products={products}
            productCategories={productCategories}
            productSubcategories={productSubcategories}
          />
          <InvoiceDialog
            isOpen={isInvoiceDialogOpen}
            onOpenChange={setIsInvoiceDialogOpen}
            initialData={initialFormData}
            onSave={handleSaveInvoice}
            onSaveProduct={handleSaveProduct}
            onSaveCustomer={handleSaveCustomer}
            customers={customers}
            products={products}
            productCategories={productCategories}
            productSubcategories={productSubcategories}
          />
        </>
      )}
    </>
  );
}
