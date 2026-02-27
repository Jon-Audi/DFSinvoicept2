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
import type { ChainlinkFenceHeight, ChainlinkFenceType, ChainlinkFenceColor, ChainlinkRun, ChainlinkEstimationResult, ChainlinkMaterialPricing, ChainlinkProductMapping, Product, LineItem, Customer } from '@/types';
import { calculateChainlinkMaterials, calculateChainlinkCost, getPipeSpecs, calculateGateCuts } from '@/lib/chainlink-calculator';
import type { GateCutInput, GateCutResult } from '@/lib/chainlink-calculator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useRouter } from 'next/navigation';
import { collection, getDocs, onSnapshot, addDoc } from 'firebase/firestore';
import { EstimateDialog } from '@/components/estimates/estimate-dialog';
import { OrderDialog } from '@/components/orders/order-dialog';
import { InvoiceDialog } from '@/components/invoices/invoice-dialog';
import type { EstimateFormData } from '@/components/estimates/estimate-form';
import type { OrderFormData } from '@/components/orders/order-form';
import type { InvoiceFormData } from '@/components/invoices/invoice-form';

const FENCE_HEIGHTS: ChainlinkFenceHeight[] = ['3', '4', '5', '6', '7', '8', '9', '10'];
const FENCE_COLORS: ChainlinkFenceColor[] = ['galvanized', 'green', 'black'];

export default function ChainlinkEstimationPage() {
  const { db } = useFirebase();
  const router = useRouter();
  const { toast } = useToast();

  // Form inputs
  const [runs, setRuns] = useState<ChainlinkRun[]>([{ length: 0 }]);
  const [fenceHeight, setFenceHeight] = useState<ChainlinkFenceHeight>('6');
  const [fenceType, setFenceType] = useState<ChainlinkFenceType>('residential');
  const [fenceColor, setFenceColor] = useState<ChainlinkFenceColor>('galvanized');
  const [ends, setEnds] = useState<number>(2);
  const [corners, setCorners] = useState<number>(0);
  
  // Gate options
  const [singleGates, setSingleGates] = useState<number>(0);
  const [doubleGates, setDoubleGates] = useState<number>(0);
  const [pedestrianGates, setPedestrianGates] = useState<number>(0);
  
  // Additional components
  const [includePrivacySlats, setIncludePrivacySlats] = useState<boolean>(false);
  const [includeBarbedWire, setIncludeBarbedWire] = useState<boolean>(false);
  const [includeBottomRail, setIncludeBottomRail] = useState<boolean>(false);

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
  const [initialFormData, setInitialFormData] = useState<{ lineItems: EstimateFormData['lineItems']; notes: string } | null>(null);

  // Gate cut sheet state
  const [gateJobName, setGateJobName] = useState('');
  const [gateType, setGateType] = useState<'single' | 'double'>('single');
  const [calcMode, setCalcMode] = useState<'opening' | 'frame'>('opening');
  const [gateWidthIn, setGateWidthIn] = useState('');
  const [gateHeightIn, setGateHeightIn] = useState('');
  const [frameDiameter, setFrameDiameter] = useState<GateCutInput['frameDiameter']>('1 5/8"');
  const [includeHBrace, setIncludeHBrace] = useState(false);
  const [includeVBrace, setIncludeVBrace] = useState(false);
  const [gateResult, setGateResult] = useState<GateCutResult | null>(null);

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

  // Load pricing when fence type, height, or color changes
  useEffect(() => {
    if (!db) return;

    const loadPricing = async () => {
      setIsLoadingPricing(true);
      try {
        const docRef = doc(db, 'settings', 'chainlinkProductMapping');
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          const typeData = data[fenceType];
          if (typeData && typeData[fenceColor] && typeData[fenceColor][fenceHeight]) {
            const mapping = typeData[fenceColor][fenceHeight];
            
            // Fetch product prices from the product IDs in the mapping
            const productIds = [
              mapping.linePostProductId,
              mapping.fabricProductId,
              mapping.topRailProductId,
              mapping.tieWireProductId,
              mapping.loopCapProductId,
              mapping.postCapProductId,
              mapping.braceBandProductId,
              mapping.tensionBarProductId,
              mapping.tensionBandProductId,
              mapping.nutAndBoltProductId,
            ].filter(Boolean);

            // Fetch all products at once
            const productPrices: Record<string, number> = {};
            for (const productId of productIds) {
              if (productId) {
                const productDoc = await getDoc(doc(db, 'products', productId));
                if (productDoc.exists()) {
                  const product = productDoc.data();
                  productPrices[productId] = product.price || 0;
                }
              }
            }

            // Build pricing object with actual prices
            const pricingData: ChainlinkMaterialPricing = {
              id: mapping.id || `${fenceType}-${fenceColor}-${fenceHeight}`,
              fenceHeight,
              fenceType,
              interiorLinePostPrice: mapping.linePostProductId ? (productPrices[mapping.linePostProductId] || 0) : 0,
              fabricPricePerFoot: mapping.fabricProductId ? (productPrices[mapping.fabricProductId] || 0) : 0,
              topRailPricePerStick: mapping.topRailProductId ? (productPrices[mapping.topRailProductId] || 0) : 0,
              tieWirePrice: mapping.tieWireProductId ? (productPrices[mapping.tieWireProductId] || 0) : 0,
              loopCapPrice: mapping.loopCapProductId ? (productPrices[mapping.loopCapProductId] || 0) : 0,
              postCapPrice: mapping.postCapProductId ? (productPrices[mapping.postCapProductId] || 0) : 0,
              braceBandPrice: mapping.braceBandProductId ? (productPrices[mapping.braceBandProductId] || 0) : 0,
              tensionBarPrice: mapping.tensionBarProductId ? (productPrices[mapping.tensionBarProductId] || 0) : 0,
              tensionBandPrice: mapping.tensionBandProductId ? (productPrices[mapping.tensionBandProductId] || 0) : 0,
              nutAndBoltPrice: mapping.nutAndBoltProductId ? (productPrices[mapping.nutAndBoltProductId] || 0) : 0,
            };

            setPricing(pricingData);
          } else {
            setPricing(null);
            toast({
              title: "Pricing Not Configured",
              description: `No pricing found for ${fenceType} ${fenceColor} ${fenceHeight}' fence. Please configure in Settings > Chainlink.`,
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
  }, [db, fenceType, fenceHeight, fenceColor, toast]);

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

    // Calculate materials with all options
    const calculationResult = calculateChainlinkMaterials({
      runs,
      fenceHeight,
      fenceType,
      fenceColor,
      ends,
      corners,
      singleGates,
      doubleGates,
      pedestrianGates,
      includePrivacySlats,
      includeBarbedWire,
      includeBottomRail,
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
    setFenceColor('galvanized');
    setEnds(2);
    setCorners(0);
    setSingleGates(0);
    setDoubleGates(0);
    setPedestrianGates(0);
    setIncludePrivacySlats(false);
    setIncludeBarbedWire(false);
    setIncludeBottomRail(false);
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
      const mapping: ChainlinkProductMapping | undefined = mappingsData[fenceType]?.[fenceColor]?.[fenceHeight];

      if (!mapping) {
        toast({
          title: "Configuration Missing",
          description: `No product mapping found for ${fenceType} ${fenceColor} ${fenceHeight}' fence. Please configure in Settings > Chainlink.`,
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

      // Gate Components
      if (result.singleGates && result.singleGates > 0 && mapping.singleGateFrameProductId) {
        const product = productsMap.get(mapping.singleGateFrameProductId);
        if (product) {
          lineItems.push(createLineItem(product, result.singleGates));
        }
      }

      if (result.doubleGates && result.doubleGates > 0 && mapping.doubleGateFrameProductId) {
        const product = productsMap.get(mapping.doubleGateFrameProductId);
        if (product) {
          lineItems.push(createLineItem(product, result.doubleGates));
        }
      }

      if (result.pedestrianGates && result.pedestrianGates > 0 && mapping.pedestrianGateFrameProductId) {
        const product = productsMap.get(mapping.pedestrianGateFrameProductId);
        if (product) {
          lineItems.push(createLineItem(product, result.pedestrianGates));
        }
      }

      if (result.gatePosts && result.gatePosts > 0 && mapping.gatePostProductId) {
        const product = productsMap.get(mapping.gatePostProductId);
        if (product) {
          lineItems.push(createLineItem(product, result.gatePosts));
        }
      }

      if (result.gateHardwareSets && result.gateHardwareSets > 0 && mapping.gateHardwareSetProductId) {
        const product = productsMap.get(mapping.gateHardwareSetProductId);
        if (product) {
          lineItems.push(createLineItem(product, result.gateHardwareSets));
        }
      }

      if (result.gateLatches && result.gateLatches > 0 && mapping.gateLatchProductId) {
        const product = productsMap.get(mapping.gateLatchProductId);
        if (product) {
          lineItems.push(createLineItem(product, result.gateLatches));
        }
      }

      if (result.gateHinges && result.gateHinges > 0 && mapping.gateHingeProductId) {
        const product = productsMap.get(mapping.gateHingeProductId);
        if (product) {
          lineItems.push(createLineItem(product, result.gateHinges));
        }
      }

      // Additional Components
      if (result.privacySlats && mapping.privacySlatsProductId) {
        const product = productsMap.get(mapping.privacySlatsProductId);
        if (product) {
          lineItems.push(createLineItem(product, result.privacySlats));
        }
      }

      if (result.barbedWire && mapping.barbedWireProductId) {
        const product = productsMap.get(mapping.barbedWireProductId);
        if (product) {
          lineItems.push(createLineItem(product, result.barbedWire));
        }
      }

      if (result.bottomRailSticks && mapping.bottomRailProductId) {
        const product = productsMap.get(mapping.bottomRailProductId);
        if (product) {
          lineItems.push(createLineItem(product, result.bottomRailSticks));
        }
      }

      if (result.railEnds && mapping.railEndsProductId) {
        const product = productsMap.get(mapping.railEndsProductId);
        if (product) {
          lineItems.push(createLineItem(product, result.railEnds));
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

      // Build notes with full configuration details
      const gateInfo = [];
      if (singleGates > 0) gateInfo.push(`${singleGates} Single Gate(s)`);
      if (doubleGates > 0) gateInfo.push(`${doubleGates} Double Gate(s)`);
      if (pedestrianGates > 0) gateInfo.push(`${pedestrianGates} Pedestrian Gate(s)`);

      const addOns = [];
      if (includePrivacySlats) addOns.push('Privacy Slats');
      if (includeBarbedWire) addOns.push('Barbed Wire');
      if (includeBottomRail) addOns.push('Bottom Rail');

      let notesText = `Chainlink ${fenceType} ${fenceHeight}' ${fenceColor} fence\nTotal linear feet: ${totalLinearFeet}\nRuns: ${runs.length}\nEnds: ${ends}\nCorners: ${corners}`;
      if (gateInfo.length > 0) notesText += `\nGates: ${gateInfo.join(', ')}`;
      if (addOns.length > 0) notesText += `\nAdd-ons: ${addOns.join(', ')}`;

      // Prepare initial form data with line items
      const formData: { lineItems: EstimateFormData['lineItems']; notes: string } = {
        lineItems: lineItems.map(li => ({ ...li, isNonStock: li.isNonStock ?? false, addToProductList: li.addToProductList ?? false, isReturn: li.isReturn ?? false })),
        notes: notesText,
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

  const handleCalculateGate = () => {
    const w = parseFloat(gateWidthIn);
    const h = parseFloat(gateHeightIn);
    if (!w || w <= 0 || !h || h <= 0) {
      toast({ title: "Invalid Input", description: "Please enter valid width and height (in inches).", variant: "destructive" });
      return;
    }
    const res = calculateGateCuts({
      calculationMode: calcMode,
      gateWidthInches: w,
      gateHeightInches: h,
      frameDiameter,
      gateType,
      includeHorizontalBrace: includeHBrace,
      includeVerticalBrace: includeVBrace,
    });
    setGateResult(res);
  };

  const handleClearGate = () => {
    setGateJobName('');
    setGateType('single');
    setCalcMode('opening');
    setGateWidthIn('');
    setGateHeightIn('');
    setFrameDiameter('1 5/8"');
    setIncludeHBrace(false);
    setIncludeVBrace(false);
    setGateResult(null);
  };

  return (
    <>
      <PageHeader
        title="Chainlink Estimation"
        description="Calculate material requirements and costs for chainlink fence installations."
      />

      <Tabs defaultValue="estimator">
        <TabsList className="mb-6">
          <TabsTrigger value="estimator">Fence Estimator</TabsTrigger>
          <TabsTrigger value="gates">Gate Cut Sheet</TabsTrigger>
        </TabsList>

        {/* ── Fence Estimator Tab ── */}
        <TabsContent value="estimator">
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
                <SelectTrigger aria-label="Fence Height">
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
                <SelectTrigger aria-label="Fence Type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="residential">Residential (SS20 WT)</SelectItem>
                  <SelectItem value="commercial">Commercial (SS40 WT)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Fence Color */}
            <div className="space-y-2">
              <Label>Fence Color</Label>
              <Select value={fenceColor} onValueChange={(value) => setFenceColor(value as ChainlinkFenceColor)}>
                <SelectTrigger aria-label="Fence Color">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FENCE_COLORS.map(color => (
                    <SelectItem key={color} value={color} className="capitalize">{color.charAt(0).toUpperCase() + color.slice(1)}</SelectItem>
                  ))}
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
            {/* Gate Options */}
            <div className="space-y-4 pt-4 border-t">
              <Label className="text-sm font-medium">Gate Options</Label>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm">Single Gates</Label>
                  <Input
                    type="number"
                    min="0"
                    value={singleGates}
                    onChange={(e) => setSingleGates(parseInt(e.target.value) || 0)}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">Double Gates</Label>
                  <Input
                    type="number"
                    min="0"
                    value={doubleGates}
                    onChange={(e) => setDoubleGates(parseInt(e.target.value) || 0)}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">Pedestrian Gates</Label>
                  <Input
                    type="number"
                    min="0"
                    value={pedestrianGates}
                    onChange={(e) => setPedestrianGates(parseInt(e.target.value) || 0)}
                  />
                </div>
              </div>
            </div>

            {/* Additional Components */}
            <div className="space-y-4 pt-4 border-t">
              <Label className="text-sm font-medium">Additional Components</Label>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="privacySlats"
                    checked={includePrivacySlats}
                    onChange={(e) => setIncludePrivacySlats(e.target.checked)}
                    className="rounded border-gray-300"
                  />
                  <Label htmlFor="privacySlats" className="text-sm font-normal">Privacy Slats</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="barbedWire"
                    checked={includeBarbedWire}
                    onChange={(e) => setIncludeBarbedWire(e.target.checked)}
                    className="rounded border-gray-300"
                  />
                  <Label htmlFor="barbedWire" className="text-sm font-normal">Barbed Wire</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="bottomRail"
                    checked={includeBottomRail}
                    onChange={(e) => setIncludeBottomRail(e.target.checked)}
                    className="rounded border-gray-300"
                  />
                  <Label htmlFor="bottomRail" className="text-sm font-normal">Bottom Rail</Label>
                </div>
              </div>
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
          {/* Configuration Summary */}
          {result && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Configuration Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Height:</span>
                    <span className="ml-2 font-medium">{fenceHeight} ft</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Type:</span>
                    <span className="ml-2 font-medium capitalize">{fenceType}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Color:</span>
                    <span className="ml-2 font-medium capitalize">{result.fenceColor}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Weight:</span>
                    <span className="ml-2 font-medium">{result.pipeWeight}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Total Length:</span>
                    <span className="ml-2 font-medium">{totalLinearFeet} ft</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Ends:</span>
                    <span className="ml-2 font-medium">{ends}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Corners:</span>
                    <span className="ml-2 font-medium">{corners}</span>
                  </div>
                  {(singleGates > 0 || doubleGates > 0 || pedestrianGates > 0) && (
                    <div>
                      <span className="text-muted-foreground">Gates:</span>
                      <span className="ml-2 font-medium">
                        {[
                          singleGates > 0 && `${singleGates} Single`,
                          doubleGates > 0 && `${doubleGates} Double`,
                          pedestrianGates > 0 && `${pedestrianGates} Pedestrian`
                        ].filter(Boolean).join(', ')}
                      </span>
                    </div>
                  )}
                </div>
                {(includePrivacySlats || includeBarbedWire || includeBottomRail) && (
                  <div className="mt-3 pt-3 border-t">
                    <span className="text-muted-foreground text-sm">Add-ons: </span>
                    <span className="text-sm font-medium">
                      {[
                        includePrivacySlats && 'Privacy Slats',
                        includeBarbedWire && 'Barbed Wire',
                        includeBottomRail && 'Bottom Rail'
                      ].filter(Boolean).join(', ')}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Pipe Specifications */}
          {result && (() => {
            const specs = getPipeSpecs(fenceHeight, fenceType);
            if (!specs) return null;
            return (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Pipe Specifications</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Post Type</TableHead>
                        <TableHead>Pipe Size</TableHead>
                        <TableHead className="text-right">Post Length</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell>Terminal Posts <span className="text-muted-foreground text-xs">(ends, corners, gates)</span></TableCell>
                        <TableCell className="font-medium">{specs.terminal}</TableCell>
                        <TableCell className="text-right">{specs.postLength}&apos;</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Line Posts <span className="text-muted-foreground text-xs">(interior)</span></TableCell>
                        <TableCell className="font-medium">{specs.line}</TableCell>
                        <TableCell className="text-right">{specs.postLength}&apos;</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Top Rail</TableCell>
                        <TableCell className="font-medium">{specs.topRail}</TableCell>
                        <TableCell className="text-right">21&apos; sticks</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            );
          })()}

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
                    {/* Fence Materials Section */}
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
                    {result.bottomRailSticks !== undefined && (
                      <TableRow>
                        <TableCell>Bottom Rail Sticks (21')</TableCell>
                        <TableCell className="text-right">{result.bottomRailSticks}</TableCell>
                        {pricing && <TableCell className="text-right">-</TableCell>}
                      </TableRow>
                    )}
                    {result.railEnds !== undefined && (
                      <TableRow>
                        <TableCell>Rail Ends</TableCell>
                        <TableCell className="text-right">{result.railEnds}</TableCell>
                        {pricing && <TableCell className="text-right">-</TableCell>}
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

                    {/* Gate Components Section */}
                    {(result.singleGates || result.doubleGates || result.pedestrianGates) && (
                      <>
                        <TableRow className="bg-muted/50">
                          <TableCell colSpan={pricing ? 3 : 2} className="font-semibold text-sm">
                            Gate Components
                          </TableCell>
                        </TableRow>
                        {result.singleGates !== undefined && result.singleGates > 0 && (
                          <TableRow>
                            <TableCell>Single Gate Frames</TableCell>
                            <TableCell className="text-right">{result.singleGates}</TableCell>
                            {pricing && <TableCell className="text-right">-</TableCell>}
                          </TableRow>
                        )}
                        {result.doubleGates !== undefined && result.doubleGates > 0 && (
                          <TableRow>
                            <TableCell>Double Gate Frames</TableCell>
                            <TableCell className="text-right">{result.doubleGates}</TableCell>
                            {pricing && <TableCell className="text-right">-</TableCell>}
                          </TableRow>
                        )}
                        {result.pedestrianGates !== undefined && result.pedestrianGates > 0 && (
                          <TableRow>
                            <TableCell>Pedestrian Gate Frames</TableCell>
                            <TableCell className="text-right">{result.pedestrianGates}</TableCell>
                            {pricing && <TableCell className="text-right">-</TableCell>}
                          </TableRow>
                        )}
                        {result.gatePosts !== undefined && result.gatePosts > 0 && (
                          <TableRow>
                            <TableCell>Gate Posts</TableCell>
                            <TableCell className="text-right">{result.gatePosts}</TableCell>
                            {pricing && <TableCell className="text-right">-</TableCell>}
                          </TableRow>
                        )}
                        {result.gateHardwareSets !== undefined && result.gateHardwareSets > 0 && (
                          <TableRow>
                            <TableCell>Gate Hardware Sets</TableCell>
                            <TableCell className="text-right">{result.gateHardwareSets}</TableCell>
                            {pricing && <TableCell className="text-right">-</TableCell>}
                          </TableRow>
                        )}
                        {result.gateLatches !== undefined && result.gateLatches > 0 && (
                          <TableRow>
                            <TableCell>Gate Latches</TableCell>
                            <TableCell className="text-right">{result.gateLatches}</TableCell>
                            {pricing && <TableCell className="text-right">-</TableCell>}
                          </TableRow>
                        )}
                        {result.gateHinges !== undefined && result.gateHinges > 0 && (
                          <TableRow>
                            <TableCell>Gate Hinges</TableCell>
                            <TableCell className="text-right">{result.gateHinges}</TableCell>
                            {pricing && <TableCell className="text-right">-</TableCell>}
                          </TableRow>
                        )}
                      </>
                    )}

                    {/* Additional Components Section */}
                    {(result.privacySlats || result.barbedWire) && (
                      <>
                        <TableRow className="bg-muted/50">
                          <TableCell colSpan={pricing ? 3 : 2} className="font-semibold text-sm">
                            Additional Components
                          </TableCell>
                        </TableRow>
                        {result.privacySlats !== undefined && (
                          <TableRow>
                            <TableCell>Privacy Slats</TableCell>
                            <TableCell className="text-right">{result.privacySlats} ft</TableCell>
                            {pricing && <TableCell className="text-right">-</TableCell>}
                          </TableRow>
                        )}
                        {result.barbedWire !== undefined && (
                          <TableRow>
                            <TableCell>Barbed Wire</TableCell>
                            <TableCell className="text-right">{result.barbedWire} ft</TableCell>
                            {pricing && <TableCell className="text-right">-</TableCell>}
                          </TableRow>
                        )}
                      </>
                    )}

                    {/* Summary Row */}
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
        </TabsContent>

        {/* ── Gate Cut Sheet Tab ── */}
        <TabsContent value="gates">
          <style>{`
            @media print {
              .no-print { display: none !important; }
              .print-only { display: block !important; }
              body { background: white; }
            }
            .print-only { display: none; }
          `}</style>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Gate Configuration Input */}
            <Card className="no-print">
              <CardHeader>
                <CardTitle>Gate Configuration</CardTitle>
                <CardDescription>Calculate pipe cuts for a custom welded gate frame</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* Job Name */}
                <div className="space-y-2">
                  <Label>Job Name <span className="text-muted-foreground text-xs">(optional, for print header)</span></Label>
                  <Input placeholder="e.g., Smith Residence" value={gateJobName} onChange={e => setGateJobName(e.target.value)} />
                </div>

                {/* Gate Type */}
                <div className="space-y-2">
                  <Label>Gate Type</Label>
                  <Select value={gateType} onValueChange={(v) => setGateType(v as 'single' | 'double')}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="single">Single Gate</SelectItem>
                      <SelectItem value="double">Double Gate</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Calculation Mode */}
                <div className="space-y-2">
                  <Label>Measurement Input</Label>
                  <Select value={calcMode} onValueChange={(v) => setCalcMode(v as 'opening' | 'frame')}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="opening">Opening Size (inside post to inside post)</SelectItem>
                      <SelectItem value="frame">Frame / True Size</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Width */}
                <div className="space-y-2">
                  <Label>{calcMode === 'opening' ? 'Opening Width' : 'Frame Width'} (inches)</Label>
                  <Input type="number" min="1" step="0.25" placeholder="e.g., 48" value={gateWidthIn} onChange={e => setGateWidthIn(e.target.value)} />
                </div>

                {/* Height */}
                <div className="space-y-2">
                  <Label>Gate Height (inches)</Label>
                  <Input type="number" min="1" step="0.25" placeholder="e.g., 72" value={gateHeightIn} onChange={e => setGateHeightIn(e.target.value)} />
                </div>

                {/* Frame Diameter */}
                <div className="space-y-2">
                  <Label>Frame Pipe Diameter</Label>
                  <Select value={frameDiameter} onValueChange={(v) => setFrameDiameter(v as GateCutInput['frameDiameter'])}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value='1 3/8"'>1 3/8"</SelectItem>
                      <SelectItem value='1 5/8"'>1 5/8"</SelectItem>
                      <SelectItem value='2"'>2"</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Brace Options */}
                <div className="space-y-3 pt-2 border-t">
                  <Label className="text-sm font-medium">Brace Options</Label>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3 rounded-md border p-3">
                      <input
                        type="checkbox"
                        id="hBrace"
                        checked={includeHBrace}
                        onChange={e => setIncludeHBrace(e.target.checked)}
                        className="mt-0.5 rounded border-gray-300"
                      />
                      <div>
                        <Label htmlFor="hBrace" className="text-sm font-normal cursor-pointer">Include Horizontal Brace</Label>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {parseFloat(gateHeightIn || '0') > 48
                            ? <span className="text-amber-600 font-medium">Recommended — gate is over 48&quot; tall</span>
                            : 'Recommended for gates over 48" tall'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 rounded-md border p-3">
                      <input
                        type="checkbox"
                        id="vBrace"
                        checked={includeVBrace}
                        onChange={e => setIncludeVBrace(e.target.checked)}
                        className="mt-0.5 rounded border-gray-300"
                      />
                      <div>
                        <Label htmlFor="vBrace" className="text-sm font-normal cursor-pointer">Include Vertical Brace</Label>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {(() => {
                            const w = parseFloat(gateWidthIn || '0');
                            const leafW = gateType === 'double' ? (w - (calcMode === 'opening' ? 3.5 : 0) - 1) / 2 : w - (calcMode === 'opening' ? 3.5 : 0);
                            return leafW > 60
                              ? <span className="text-amber-600 font-medium">Recommended — leaf is over 60&quot; wide</span>
                              : 'Recommended for gate leaves over 60" wide';
                          })()}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                  <Button onClick={handleCalculateGate} className="flex-1">
                    <Icon name="Calculator" className="mr-2 h-4 w-4" />
                    Calculate Cuts
                  </Button>
                  <Button variant="outline" onClick={handleClearGate}>Clear</Button>
                </div>
              </CardContent>
            </Card>

            {/* Results */}
            <div className="space-y-6">
              {gateResult ? (
                <>
                  {/* Screen results */}
                  <Card className="no-print">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">Cut Sheet</CardTitle>
                        <Button variant="outline" size="sm" onClick={() => window.print()}>
                          <Icon name="Printer" className="mr-2 h-4 w-4" />
                          Print
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Summary */}
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div><span className="text-muted-foreground">Type:</span> <span className="font-medium capitalize">{gateResult.leafs === 2 ? 'Double' : 'Single'} Gate</span></div>
                        <div><span className="text-muted-foreground">Frame pipe:</span> <span className="font-medium">{frameDiameter} OD</span></div>
                        <div><span className="text-muted-foreground">Post spacing:</span> <span className="font-medium">{gateResult.postSpacingInches}&quot;</span></div>
                        {gateResult.requiredOpeningInches && (
                          <div><span className="text-muted-foreground">Required opening:</span> <span className="font-medium">{gateResult.requiredOpeningInches}&quot;</span></div>
                        )}
                        <div><span className="text-muted-foreground">Frame width:</span> <span className="font-medium">{gateResult.leafWidthInches}&quot; per leaf</span></div>
                        <div><span className="text-muted-foreground">Frame height:</span> <span className="font-medium">{gateResult.frameHeightInches}&quot;</span></div>
                      </div>
                      {/* Cut List */}
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-12">Qty</TableHead>
                            <TableHead>Length</TableHead>
                            <TableHead>Description</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {gateResult.cutList.map((item, i) => (
                            <TableRow key={i}>
                              <TableCell className="font-medium">{item.qty}</TableCell>
                              <TableCell className="font-mono">{item.lengthInches}&quot;</TableCell>
                              <TableCell>{item.description}</TableCell>
                            </TableRow>
                          ))}
                          <TableRow className="border-t-2">
                            <TableCell colSpan={2} className="font-semibold">Total Pipe</TableCell>
                            <TableCell className="font-semibold">{gateResult.totalPipeFeet} ft</TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>

                  {/* Printable Cut Sheet */}
                  <div className="print-only" style={{ fontFamily: 'Arial, sans-serif', fontSize: '12px', padding: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px', borderBottom: '2px solid #000', paddingBottom: '8px' }}>
                      <div>
                        <div style={{ fontSize: '18px', fontWeight: 'bold' }}>GATE CUT SHEET</div>
                        {gateJobName && <div style={{ marginTop: '4px', fontSize: '14px' }}>Job: {gateJobName}</div>}
                        <div style={{ marginTop: '4px', color: '#555' }}>
                          {gateResult.leafs === 2 ? 'Double' : 'Single'} Gate &nbsp;|&nbsp; {frameDiameter} OD frame &nbsp;|&nbsp; {calcMode === 'opening' ? 'Opening size input' : 'Frame size input'}
                        </div>
                        <div style={{ marginTop: '2px', color: '#555' }}>
                          Post Spacing: {gateResult.postSpacingInches}&quot;
                          {gateResult.requiredOpeningInches ? ` | Required Opening: ${gateResult.requiredOpeningInches}"` : ''}
                          &nbsp;|&nbsp; Frame: {gateResult.leafWidthInches}&quot; × {gateResult.frameHeightInches}&quot; per leaf
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', color: '#555' }}>
                        {new Date().toLocaleDateString()}
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start' }}>
                      {/* Gate Diagram */}
                      <div style={{ flexShrink: 0 }}>
                        <div style={{ fontSize: '11px', fontWeight: 'bold', marginBottom: '6px', textAlign: 'center' }}>FRAME DIAGRAM (per leaf)</div>
                        {(() => {
                          const scaleW = Math.min(160, gateResult.leafWidthInches * 0.8);
                          const scaleH = Math.min(220, gateResult.frameHeightInches * 0.8);
                          return (
                            <div style={{ position: 'relative', width: scaleW + 40, height: scaleH + 40, marginLeft: '20px', marginTop: '10px' }}>
                              {/* Width label */}
                              <div style={{ position: 'absolute', top: 0, left: 20, width: scaleW, textAlign: 'center', fontSize: '10px', fontWeight: 'bold' }}>
                                ←&nbsp;{gateResult.leafWidthInches}&quot;&nbsp;→
                              </div>
                              {/* Height label */}
                              <div style={{ position: 'absolute', top: 20, left: 0, height: scaleH, display: 'flex', alignItems: 'center', fontSize: '10px', fontWeight: 'bold', writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
                                ↕&nbsp;{gateResult.frameHeightInches}&quot;
                              </div>
                              {/* Frame rectangle */}
                              <div style={{ position: 'absolute', top: 20, left: 20, width: scaleW, height: scaleH, border: '3px solid #000', boxSizing: 'border-box' }}>
                                {/* H-brace */}
                                {gateResult.horizontalBraceLengthInches !== undefined && (
                                  <div style={{ position: 'absolute', top: '50%', left: '5%', right: '5%', height: '2px', background: '#555', borderTop: '2px dashed #555' }} />
                                )}
                                {/* V-brace (two pieces) */}
                                {gateResult.verticalBracePieces && (
                                  <>
                                    <div style={{ position: 'absolute', left: '50%', top: '5%', bottom: gateResult.horizontalBraceLengthInches !== undefined ? '52%' : '52%', width: '2px', borderLeft: '2px dashed #555', transform: 'translateX(-50%)' }} />
                                    <div style={{ position: 'absolute', left: '50%', top: gateResult.horizontalBraceLengthInches !== undefined ? '52%' : '52%', bottom: '5%', width: '2px', borderLeft: '2px dashed #555', transform: 'translateX(-50%)' }} />
                                  </>
                                )}
                              </div>
                            </div>
                          );
                        })()}
                        <div style={{ fontSize: '10px', color: '#555', marginTop: '4px', textAlign: 'center' }}>Dashed = optional braces</div>
                      </div>

                      {/* Cut List */}
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '11px', fontWeight: 'bold', marginBottom: '6px' }}>CUT LIST</div>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                          <thead>
                            <tr style={{ background: '#eee' }}>
                              <th style={{ border: '1px solid #ccc', padding: '4px 8px', textAlign: 'left', width: '40px' }}>Qty</th>
                              <th style={{ border: '1px solid #ccc', padding: '4px 8px', textAlign: 'left', width: '80px' }}>Length</th>
                              <th style={{ border: '1px solid #ccc', padding: '4px 8px', textAlign: 'left' }}>Description</th>
                            </tr>
                          </thead>
                          <tbody>
                            {gateResult.cutList.map((item, i) => (
                              <tr key={i} style={{ background: i % 2 === 0 ? '#fff' : '#f9f9f9' }}>
                                <td style={{ border: '1px solid #ccc', padding: '4px 8px', fontWeight: 'bold' }}>{item.qty}</td>
                                <td style={{ border: '1px solid #ccc', padding: '4px 8px', fontFamily: 'monospace', fontWeight: 'bold' }}>{item.lengthInches}&quot;</td>
                                <td style={{ border: '1px solid #ccc', padding: '4px 8px' }}>{item.description}</td>
                              </tr>
                            ))}
                            <tr style={{ background: '#eee', fontWeight: 'bold' }}>
                              <td colSpan={2} style={{ border: '1px solid #ccc', padding: '4px 8px' }}>Total Pipe</td>
                              <td style={{ border: '1px solid #ccc', padding: '4px 8px' }}>{gateResult.totalPipeFeet} ft</td>
                            </tr>
                          </tbody>
                        </table>
                        {gateResult.needsHorizontalBrace && !includeHBrace && (
                          <div style={{ marginTop: '8px', padding: '4px 8px', background: '#fff3cd', border: '1px solid #ffc107', fontSize: '11px' }}>
                            Note: Horizontal brace recommended for this gate height
                          </div>
                        )}
                        {gateResult.needsVerticalBrace && !includeVBrace && (
                          <div style={{ marginTop: '4px', padding: '4px 8px', background: '#fff3cd', border: '1px solid #ffc107', fontSize: '11px' }}>
                            Note: Vertical brace recommended for this gate width
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <Card>
                  <CardContent className="py-12 text-center text-muted-foreground">
                    <Icon name="ClipboardList" className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>Enter gate dimensions and click Calculate</p>
                    <p className="text-xs mt-1">Cut lengths will appear here</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

      </Tabs>

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
            vendors={[]}
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
            vendors={[]}
            productCategories={productCategories}
            productSubcategories={productSubcategories}
          />
        </>
      )}
    </>
  );
}
