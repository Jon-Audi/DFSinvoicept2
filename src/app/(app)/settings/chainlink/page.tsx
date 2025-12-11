"use client";

import React, { useState, useEffect } from 'react';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/icons';
import { Label } from '@/components/ui/label';
import { useToast } from "@/hooks/use-toast";
import { useFirebase } from '@/components/firebase-provider';
import { doc, getDoc, setDoc, collection, getDocs } from 'firebase/firestore';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { ChainlinkProductMapping, ChainlinkFenceHeight, ChainlinkFenceType, Product } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';

const CHAINLINK_SETTINGS_DOC_ID = "chainlinkProductMapping";
const FENCE_HEIGHTS: ChainlinkFenceHeight[] = ['3', '4', '5', '6', '7', '8', '9', '10'];

// Product selector component
interface ProductSelectorProps {
  products: Product[];
  currentValue: string;
  onSelect: (value: string) => void;
}

function ProductSelector({ products, currentValue, onSelect }: ProductSelectorProps) {
  const [open, setOpen] = React.useState(false);
  const selectedProduct = products.find(p => p.id === currentValue);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          {selectedProduct ? (
            <span className="truncate">{selectedProduct.name} - ${selectedProduct.price.toFixed(2)}</span>
          ) : (
            <span className="text-muted-foreground">Select product...</span>
          )}
          <Icon name="ChevronsUpDown" className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search products..." />
          <CommandList>
            <CommandEmpty>No product found.</CommandEmpty>
            <CommandGroup>
              <CommandItem
                value="none"
                onSelect={() => {
                  onSelect('');
                  setOpen(false);
                }}
              >
                <Icon
                  name="Check"
                  className={`mr-2 h-4 w-4 ${!currentValue ? 'opacity-100' : 'opacity-0'}`}
                />
                <span className="text-muted-foreground">None</span>
              </CommandItem>
              {products.map((product) => (
                <CommandItem
                  key={product.id}
                  value={`${product.name} ${product.id}`}
                  onSelect={() => {
                    onSelect(product.id);
                    setOpen(false);
                  }}
                >
                  <Icon
                    name="Check"
                    className={`mr-2 h-4 w-4 ${currentValue === product.id ? 'opacity-100' : 'opacity-0'}`}
                  />
                  <div className="flex-1 flex justify-between items-center">
                    <span className="truncate">{product.name}</span>
                    <span className="text-sm text-muted-foreground ml-2">${product.price.toFixed(2)}</span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export default function ChainlinkSettingsPage() {
  const { db } = useFirebase();
  const [residentialMapping, setResidentialMapping] = useState<Record<string, ChainlinkProductMapping>>({});
  const [commercialMapping, setCommercialMapping] = useState<Record<string, ChainlinkProductMapping>>({});
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!db) return;

    const fetchData = async () => {
      setIsLoading(true);
      try {
        console.log('Loading products...');
        // Load products
        const productsSnapshot = await getDocs(collection(db, 'products'));
        const allProducts: Product[] = [];
        productsSnapshot.forEach(docSnap => {
          allProducts.push({ ...docSnap.data() as Omit<Product, 'id'>, id: docSnap.id });
        });
        console.log(`Loaded ${allProducts.length} products`);
        setProducts(allProducts.sort((a, b) => a.name.localeCompare(b.name)));

        console.log('Loading product mappings...');
        // Load product mappings
        const docRef = doc(db, 'settings', CHAINLINK_SETTINGS_DOC_ID);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          console.log('Loaded existing mappings:', data);
          setResidentialMapping(data.residential || {});
          setCommercialMapping(data.commercial || {});
        } else {
          console.log('No existing mappings, initializing defaults');
          // Initialize with default empty mappings
          initializeDefaultMappings();
        }
      } catch (error) {
        console.error('Error loading chainlink settings:', error);
        toast({ title: "Error", description: "Could not fetch chainlink product mappings.", variant: "destructive" });
      } finally {
        console.log('Finished loading');
        setIsLoading(false);
      }
    };

    fetchData();
  }, [db, toast]);

  const initializeDefaultMappings = () => {
    const defaultResidential: Record<string, ChainlinkProductMapping> = {};
    const defaultCommercial: Record<string, ChainlinkProductMapping> = {};

    FENCE_HEIGHTS.forEach(height => {
      defaultResidential[height] = {
        id: `residential-${height}`,
        fenceHeight: height,
        fenceType: 'residential',
      };

      defaultCommercial[height] = {
        id: `commercial-${height}`,
        fenceHeight: height,
        fenceType: 'commercial',
      };
    });

    setResidentialMapping(defaultResidential);
    setCommercialMapping(defaultCommercial);
  };

  const handleSave = async () => {
    if (!db) return;

    setIsSaving(true);
    try {
      const docRef = doc(db, 'settings', CHAINLINK_SETTINGS_DOC_ID);
      await setDoc(docRef, {
        residential: residentialMapping,
        commercial: commercialMapping,
      });

      toast({ title: "Success", description: "Chainlink product mappings have been saved." });
    } catch (error) {
      toast({ title: "Error", description: "Could not save chainlink product mappings.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const updateMapping = (
    type: ChainlinkFenceType,
    height: ChainlinkFenceHeight,
    field: keyof Omit<ChainlinkProductMapping, 'id' | 'fenceHeight' | 'fenceType'>,
    value: string
  ) => {
    if (type === 'residential') {
      setResidentialMapping(prev => {
        const existing = prev[height] || {
          id: `residential-${height}`,
          fenceHeight: height,
          fenceType: 'residential' as ChainlinkFenceType,
        };
        return {
          ...prev,
          [height]: {
            ...existing,
            [field]: value || undefined,
          },
        };
      });
    } else {
      setCommercialMapping(prev => {
        const existing = prev[height] || {
          id: `commercial-${height}`,
          fenceHeight: height,
          fenceType: 'commercial' as ChainlinkFenceType,
        };
        return {
          ...prev,
          [height]: {
            ...existing,
            [field]: value || undefined,
          },
        };
      });
    }
  };

  const renderProductSelect = (
    type: ChainlinkFenceType,
    height: ChainlinkFenceHeight,
    field: keyof Omit<ChainlinkProductMapping, 'id' | 'fenceHeight' | 'fenceType'>
  ) => {
    const mapping = type === 'residential' ? residentialMapping : commercialMapping;
    const currentValue = mapping[height]?.[field] || '';

    return (
      <ProductSelector
        products={products}
        currentValue={currentValue}
        onSelect={(value) => updateMapping(type, height, field, value)}
      />
    );
  };

  const [selectedHeight, setSelectedHeight] = useState<ChainlinkFenceHeight>('6');

  const renderMappingTable = (type: ChainlinkFenceType) => {
    return (
      <div className="space-y-6">
        {/* Height Selector */}
        <div className="flex items-center gap-4">
          <Label className="font-semibold">Select Height:</Label>
          <Select value={selectedHeight} onValueChange={(value) => setSelectedHeight(value as ChainlinkFenceHeight)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FENCE_HEIGHTS.map(height => (
                <SelectItem key={height} value={height}>{height} feet</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-8">
          <div>
            <h3 className="text-lg font-semibold mb-4">Posts for {selectedHeight}' Fence</h3>
            <div className="grid gap-4">
              <div className="grid grid-cols-[200px,1fr] items-center gap-4">
                <Label>Terminal Post (Ends)</Label>
                {renderProductSelect(type, selectedHeight, 'terminalPostProductId')}
              </div>
              <div className="grid grid-cols-[200px,1fr] items-center gap-4">
                <Label>Corner Post</Label>
                {renderProductSelect(type, selectedHeight, 'cornerPostProductId')}
              </div>
              <div className="grid grid-cols-[200px,1fr] items-center gap-4">
                <Label>Gate Post</Label>
                {renderProductSelect(type, selectedHeight, 'gatePostProductId')}
              </div>
              <div className="grid grid-cols-[200px,1fr] items-center gap-4">
                <Label>Line Post (Interior)</Label>
                {renderProductSelect(type, selectedHeight, 'linePostProductId')}
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-4">Fabric & Rails for {selectedHeight}' Fence</h3>
            <div className="grid gap-4">
              <div className="grid grid-cols-[200px,1fr] items-center gap-4">
                <Label>Fabric (per ft)</Label>
                {renderProductSelect(type, selectedHeight, 'fabricProductId')}
              </div>
              <div className="grid grid-cols-[200px,1fr] items-center gap-4">
                <Label>Top Rail</Label>
                {renderProductSelect(type, selectedHeight, 'topRailProductId')}
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-4">Hardware & Fittings for {selectedHeight}' Fence</h3>
            <div className="grid gap-4">
              <div className="grid grid-cols-[200px,1fr] items-center gap-4">
                <Label>Tie Wire</Label>
                {renderProductSelect(type, selectedHeight, 'tieWireProductId')}
              </div>
              <div className="grid grid-cols-[200px,1fr] items-center gap-4">
                <Label>Loop Cap</Label>
                {renderProductSelect(type, selectedHeight, 'loopCapProductId')}
              </div>
              <div className="grid grid-cols-[200px,1fr] items-center gap-4">
                <Label>Post Cap</Label>
                {renderProductSelect(type, selectedHeight, 'postCapProductId')}
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-4">Terminal Hardware for {selectedHeight}' Fence</h3>
            <div className="grid gap-4">
              <div className="grid grid-cols-[200px,1fr] items-center gap-4">
                <Label>Brace Band</Label>
                {renderProductSelect(type, selectedHeight, 'braceBandProductId')}
              </div>
              <div className="grid grid-cols-[200px,1fr] items-center gap-4">
                <Label>Tension Bar</Label>
                {renderProductSelect(type, selectedHeight, 'tensionBarProductId')}
              </div>
              <div className="grid grid-cols-[200px,1fr] items-center gap-4">
                <Label>Tension Band</Label>
                {renderProductSelect(type, selectedHeight, 'tensionBandProductId')}
              </div>
              <div className="grid grid-cols-[200px,1fr] items-center gap-4">
                <Label>Nut & Bolt</Label>
                {renderProductSelect(type, selectedHeight, 'nutAndBoltProductId')}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <>
        <PageHeader title="Chainlink Product Mapping" description="Loading..." />
        <div className="space-y-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Chainlink Product Mapping"
        description="Map your products to chainlink fence components for automatic estimation."
      >
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving && <Icon name="Loader2" className="mr-2 h-4 w-4 animate-spin" />}
          Save Mappings
        </Button>
      </PageHeader>

      <Card>
        <CardHeader>
          <CardTitle>Product Assignments by Fence Type</CardTitle>
          <CardDescription>
            Select products from your inventory for each chainlink component. Prices will be pulled from your product database.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="residential" className="w-full">
            <TabsList className="grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="residential">Residential (SS20 WT)</TabsTrigger>
              <TabsTrigger value="commercial">Commercial (SS40 WT)</TabsTrigger>
            </TabsList>
            <TabsContent value="residential" className="mt-6">
              {renderMappingTable('residential')}
            </TabsContent>
            <TabsContent value="commercial" className="mt-6">
              {renderMappingTable('commercial')}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </>
  );
}
