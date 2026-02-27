"use client";

import React, { useState, useEffect } from 'react';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/icons';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import type { ChainlinkProductMapping, ChainlinkFenceHeight, ChainlinkFenceType, ChainlinkFenceColor, Product } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';

const CHAINLINK_SETTINGS_DOC_ID = "chainlinkProductMapping";
const FENCE_HEIGHTS: ChainlinkFenceHeight[] = ['3', '4', '5', '6', '7', '8', '9', '10'];
const FENCE_COLORS: ChainlinkFenceColor[] = ['galvanized', 'green', 'black'];
const RES_HEIGHTS: ChainlinkFenceHeight[] = ['3', '4', '5', '6'];
const COMM_HEIGHTS: ChainlinkFenceHeight[] = ['6', '7', '8', '9', '10'];
const COMM_SM_HEIGHTS: ChainlinkFenceHeight[] = ['6', '7'];
const COMM_LG_HEIGHTS: ChainlinkFenceHeight[] = ['8', '9', '10'];

// ─── Wizard Types ─────────────────────────────────────────────────────────────

interface WizardSuggestions {
  // Rails
  resTopRail: string;
  commTopRail: string;
  bottomRail: string;
  // Universal hardware
  tieWire: string;
  tensionBar: string;
  nutAndBolt: string;
  // Gate components
  singleGate: string;
  doubleGate: string;
  pedestrianGate: string;
  gateHardwareSet: string;
  gateLatch: string;
  gateHinge: string;
  // Extras
  privacySlats: string;
  barbedWire: string;
  // Dynamic keys:
  //  Posts per height:   post_res_terminal_{h}, post_res_line_{h}
  //                      post_comm_terminal_{h}, post_comm_line_{h}
  //  Fittings per spec:  fitting_res_{field}, fitting_commSm_{field}, fitting_commLg_{field}
  //  Fabric:             fabric_{color}_{height}
  [key: string]: string;
}

// ─── Auto-Match Logic ──────────────────────────────────────────────────────────

function findBestMatch(products: Product[], keywords: string[]): string {
  let bestId = '';
  let bestScore = 0;
  for (const product of products) {
    const name = product.name.toLowerCase();
    let score = 0;
    for (const kw of keywords) {
      if (name.includes(kw.toLowerCase())) score++;
    }
    if (score > bestScore) {
      bestScore = score;
      bestId = product.id;
    }
  }
  return bestId;
}

function buildWizardSuggestions(products: Product[]): WizardSuggestions {
  const match = (keywords: string[]) => findBestMatch(products, keywords);
  const postLen = (h: string) => String(parseInt(h) + 2);

  // Posts per height: product names include the actual post length (height + 2' burial)
  const postSuggestions: Record<string, string> = {};
  for (const h of RES_HEIGHTS) {
    const len = postLen(h);
    postSuggestions[`post_res_terminal_${h}`] = match(['2"', 'terminal', 'post', len + "'"]);
    postSuggestions[`post_res_line_${h}`]     = match(['1 5/8', 'line', 'post', len + "'"]);
  }
  for (const h of COMM_SM_HEIGHTS) {
    const len = postLen(h);
    postSuggestions[`post_comm_terminal_${h}`] = match(['2 1/2', 'terminal', 'post', len + "'"]);
    postSuggestions[`post_comm_line_${h}`]     = match(['2"', 'line', 'post', len + "'"]);
  }
  for (const h of COMM_LG_HEIGHTS) {
    const len = postLen(h);
    postSuggestions[`post_comm_terminal_${h}`] = match(['3"', 'terminal', 'post', len + "'"]);
    postSuggestions[`post_comm_line_${h}`]     = match(['2 1/2', 'line', 'post', len + "'"]);
  }

  // Fittings matched by the pipe diameter they attach to
  const fittingSuggestions: Record<string, string> = {
    // Residential: 2" terminal / 1 5/8" line / 1 3/8" top rail
    fitting_res_tensionBand: match(['2"', 'tension band']),
    fitting_res_braceBand:   match(['2"', 'brace band']),
    fitting_res_postCap:     match(['2"', 'post cap']),
    fitting_res_loopCap:     match(['1 5/8', 'loop cap']),
    fitting_res_railEnds:    match(['1 3/8', 'rail end']),
    // Commercial 6-7': 2 1/2" terminal / 2" line / 1 5/8" top rail
    fitting_commSm_tensionBand: match(['2 1/2', 'tension band']),
    fitting_commSm_braceBand:   match(['2 1/2', 'brace band']),
    fitting_commSm_postCap:     match(['2 1/2', 'post cap']),
    fitting_commSm_loopCap:     match(['2"', 'loop cap']),
    fitting_commSm_railEnds:    match(['1 5/8', 'rail end']),
    // Commercial 8-10': 3" terminal / 2 1/2" line / 1 5/8" top rail
    fitting_commLg_tensionBand: match(['3"', 'tension band']),
    fitting_commLg_braceBand:   match(['3"', 'brace band']),
    fitting_commLg_postCap:     match(['3"', 'post cap']),
    fitting_commLg_loopCap:     match(['2 1/2', 'loop cap']),
    fitting_commLg_railEnds:    match(['1 5/8', 'rail end']),
  };

  const fabricSuggestions: Record<string, string> = {};
  FENCE_COLORS.forEach(color => {
    FENCE_HEIGHTS.forEach(height => {
      fabricSuggestions[`fabric_${color}_${height}`] = match([
        height + "'", 'fabric',
        color === 'galvanized' ? 'galv' : color,
        'chainlink', 'chain link',
      ]);
    });
  });

  return {
    ...postSuggestions,
    ...fittingSuggestions,
    resTopRail: match(['1 3/8', 'top rail', '065']),
    commTopRail: match(['1 5/8', 'top rail', '21']),
    bottomRail: match(['bottom rail']),
    tieWire: match(['tie wire']),
    tensionBar: match(['tension bar']),
    nutAndBolt: match(['nut', 'bolt']),
    singleGate: match(['single gate']),
    doubleGate: match(['double gate']),
    pedestrianGate: match(['pedestrian', 'walk gate', 'man gate']),
    gateHardwareSet: match(['gate hardware', 'hardware set']),
    gateLatch: match(['latch']),
    gateHinge: match(['hinge']),
    privacySlats: match(['privacy', 'slat']),
    barbedWire: match(['barbed', 'barb wire']),
    ...fabricSuggestions,
  };
}

// ─── Product Selector Component ───────────────────────────────────────────────

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

// ─── Main Page Component ──────────────────────────────────────────────────────

export default function ChainlinkSettingsPage() {
  const { db } = useFirebase();
  const [residentialMapping, setResidentialMapping] = useState<Record<string, Record<string, ChainlinkProductMapping>>>({});
  const [commercialMapping, setCommercialMapping] = useState<Record<string, Record<string, ChainlinkProductMapping>>>({});
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  // Wizard state
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [wizardSuggestions, setWizardSuggestions] = useState<WizardSuggestions | null>(null);

  useEffect(() => {
    if (!db) return;

    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Load products
        const productsSnapshot = await getDocs(collection(db, 'products'));
        const allProducts: Product[] = [];
        productsSnapshot.forEach(docSnap => {
          allProducts.push({ ...docSnap.data() as Omit<Product, 'id'>, id: docSnap.id });
        });
        setProducts(allProducts.sort((a, b) => a.name.localeCompare(b.name)));

        // Load product mappings
        const docRef = doc(db, 'settings', CHAINLINK_SETTINGS_DOC_ID);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          const residentialData = data.residential || {};
          const commercialData = data.commercial || {};

          const convertToColorBased = (mappings: Record<string, unknown>, fenceType: ChainlinkFenceType) => {
            const converted: Record<string, Record<string, ChainlinkProductMapping>> = {};
            FENCE_COLORS.forEach(color => {
              converted[color] = {};
              FENCE_HEIGHTS.forEach(height => {
                const key = `${height}-${color}`;
                converted[color][height] = (mappings[key] as ChainlinkProductMapping) || (mappings[height] as ChainlinkProductMapping) || {
                  id: `${fenceType}-${height}-${color}`,
                  fenceHeight: height,
                  fenceType,
                  color,
                };
              });
            });
            return converted;
          };

          setResidentialMapping(convertToColorBased(residentialData, 'residential'));
          setCommercialMapping(convertToColorBased(commercialData, 'commercial'));
        } else {
          initializeDefaultMappings();
        }
      } catch (error) {
        console.error('Error loading chainlink settings:', error);
        toast({ title: "Error", description: "Could not fetch chainlink product mappings.", variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [db, toast]);

  const initializeDefaultMappings = () => {
    const defaultResidential: Record<string, Record<string, ChainlinkProductMapping>> = {};
    const defaultCommercial: Record<string, Record<string, ChainlinkProductMapping>> = {};

    FENCE_COLORS.forEach(color => {
      defaultResidential[color] = {};
      defaultCommercial[color] = {};

      FENCE_HEIGHTS.forEach(height => {
        defaultResidential[color][height] = {
          id: `residential-${height}-${color}`,
          fenceHeight: height,
          fenceType: 'residential',
          color: color,
        };

        defaultCommercial[color][height] = {
          id: `commercial-${height}-${color}`,
          fenceHeight: height,
          fenceType: 'commercial',
          color: color,
        };
      });
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

  const [selectedHeight, setSelectedHeight] = useState<ChainlinkFenceHeight>('6');
  const [selectedColor, setSelectedColor] = useState<ChainlinkFenceColor>('galvanized');

  const updateMapping = (
    type: ChainlinkFenceType,
    height: ChainlinkFenceHeight,
    color: ChainlinkFenceColor,
    field: keyof Omit<ChainlinkProductMapping, 'id' | 'fenceHeight' | 'fenceType' | 'color'>,
    value: string
  ) => {
    if (type === 'residential') {
      setResidentialMapping(prev => {
        const colorMappings = prev[color] || {};
        const existing = colorMappings[height] || {
          id: `residential-${height}-${color}`,
          fenceHeight: height,
          fenceType: 'residential' as ChainlinkFenceType,
          color: color,
        };
        return {
          ...prev,
          [color]: {
            ...colorMappings,
            [height]: {
              ...existing,
              ...(value !== undefined && { [field]: value }),
            },
          },
        };
      });
    } else {
      setCommercialMapping(prev => {
        const colorMappings = prev[color] || {};
        const existing = colorMappings[height] || {
          id: `commercial-${height}-${color}`,
          fenceHeight: height,
          fenceType: 'commercial' as ChainlinkFenceType,
          color: color,
        };
        return {
          ...prev,
          [color]: {
            ...colorMappings,
            [height]: {
              ...existing,
              ...(value !== undefined && { [field]: value }),
            },
          },
        };
      });
    }
  };

  // ─── Wizard Handlers ──────────────────────────────────────────────────────

  const handleOpenWizard = () => {
    const suggestions = buildWizardSuggestions(products);
    setWizardSuggestions(suggestions);
    setIsWizardOpen(true);
  };

  const handleApplyWizard = () => {
    if (!wizardSuggestions) return;

    const s = wizardSuggestions;

    // Build complete new mappings from current state
    const newRes: Record<string, Record<string, ChainlinkProductMapping>> = JSON.parse(JSON.stringify(residentialMapping));
    const newComm: Record<string, Record<string, ChainlinkProductMapping>> = JSON.parse(JSON.stringify(commercialMapping));

    const applyField = (
      target: Record<string, Record<string, ChainlinkProductMapping>>,
      type: ChainlinkFenceType,
      heights: ChainlinkFenceHeight[],
      colors: ChainlinkFenceColor[],
      fields: string[],
      productId: string
    ) => {
      if (!productId) return;
      colors.forEach(color => {
        if (!target[color]) target[color] = {};
        heights.forEach(height => {
          if (!target[color][height]) {
            target[color][height] = { id: `${type}-${height}-${color}`, fenceHeight: height, fenceType: type, color };
          }
          fields.forEach(f => {
            (target[color][height] as unknown as Record<string, unknown>)[f] = productId;
          });
        });
      });
    };

    const ALL_COLORS = FENCE_COLORS;

    // Posts per height (products have specific lengths: fence height + 2' burial)
    RES_HEIGHTS.forEach(h => {
      applyField(newRes, 'residential', [h], ALL_COLORS, ['terminalPostProductId', 'cornerPostProductId', 'gatePostProductId'], s[`post_res_terminal_${h}`] ?? '');
      applyField(newRes, 'residential', [h], ALL_COLORS, ['linePostProductId'], s[`post_res_line_${h}`] ?? '');
    });
    COMM_SM_HEIGHTS.forEach(h => {
      applyField(newComm, 'commercial', [h], ALL_COLORS, ['terminalPostProductId', 'cornerPostProductId', 'gatePostProductId'], s[`post_comm_terminal_${h}`] ?? '');
      applyField(newComm, 'commercial', [h], ALL_COLORS, ['linePostProductId'], s[`post_comm_line_${h}`] ?? '');
    });
    COMM_LG_HEIGHTS.forEach(h => {
      applyField(newComm, 'commercial', [h], ALL_COLORS, ['terminalPostProductId', 'cornerPostProductId', 'gatePostProductId'], s[`post_comm_terminal_${h}`] ?? '');
      applyField(newComm, 'commercial', [h], ALL_COLORS, ['linePostProductId'], s[`post_comm_line_${h}`] ?? '');
    });

    // Rails
    applyField(newRes, 'residential', RES_HEIGHTS, ALL_COLORS, ['topRailProductId'], s.resTopRail);
    applyField(newComm, 'commercial', COMM_HEIGHTS, ALL_COLORS, ['topRailProductId'], s.commTopRail);
    applyField(newRes, 'residential', RES_HEIGHTS, ALL_COLORS, ['bottomRailProductId'], s.bottomRail);
    applyField(newComm, 'commercial', COMM_HEIGHTS, ALL_COLORS, ['bottomRailProductId'], s.bottomRail);

    // Fittings by pipe spec group (matched to diameter of pipe they attach to)
    applyField(newRes, 'residential', RES_HEIGHTS, ALL_COLORS, ['tensionBandProductId'], s.fitting_res_tensionBand ?? '');
    applyField(newRes, 'residential', RES_HEIGHTS, ALL_COLORS, ['braceBandProductId'],   s.fitting_res_braceBand   ?? '');
    applyField(newRes, 'residential', RES_HEIGHTS, ALL_COLORS, ['postCapProductId'],     s.fitting_res_postCap     ?? '');
    applyField(newRes, 'residential', RES_HEIGHTS, ALL_COLORS, ['loopCapProductId'],     s.fitting_res_loopCap     ?? '');
    applyField(newRes, 'residential', RES_HEIGHTS, ALL_COLORS, ['railEndsProductId'],    s.fitting_res_railEnds    ?? '');

    applyField(newComm, 'commercial', COMM_SM_HEIGHTS, ALL_COLORS, ['tensionBandProductId'], s.fitting_commSm_tensionBand ?? '');
    applyField(newComm, 'commercial', COMM_SM_HEIGHTS, ALL_COLORS, ['braceBandProductId'],   s.fitting_commSm_braceBand   ?? '');
    applyField(newComm, 'commercial', COMM_SM_HEIGHTS, ALL_COLORS, ['postCapProductId'],     s.fitting_commSm_postCap     ?? '');
    applyField(newComm, 'commercial', COMM_SM_HEIGHTS, ALL_COLORS, ['loopCapProductId'],     s.fitting_commSm_loopCap     ?? '');
    applyField(newComm, 'commercial', COMM_SM_HEIGHTS, ALL_COLORS, ['railEndsProductId'],    s.fitting_commSm_railEnds    ?? '');

    applyField(newComm, 'commercial', COMM_LG_HEIGHTS, ALL_COLORS, ['tensionBandProductId'], s.fitting_commLg_tensionBand ?? '');
    applyField(newComm, 'commercial', COMM_LG_HEIGHTS, ALL_COLORS, ['braceBandProductId'],   s.fitting_commLg_braceBand   ?? '');
    applyField(newComm, 'commercial', COMM_LG_HEIGHTS, ALL_COLORS, ['postCapProductId'],     s.fitting_commLg_postCap     ?? '');
    applyField(newComm, 'commercial', COMM_LG_HEIGHTS, ALL_COLORS, ['loopCapProductId'],     s.fitting_commLg_loopCap     ?? '');
    applyField(newComm, 'commercial', COMM_LG_HEIGHTS, ALL_COLORS, ['railEndsProductId'],    s.fitting_commLg_railEnds    ?? '');

    // Universal hardware (same product for all types/heights/colors)
    const universalFields: [string, string][] = [
      ['tieWire', 'tieWireProductId'],
      ['tensionBar', 'tensionBarProductId'],
      ['nutAndBolt', 'nutAndBoltProductId'],
      ['singleGate', 'singleGateFrameProductId'],
      ['doubleGate', 'doubleGateFrameProductId'],
      ['pedestrianGate', 'pedestrianGateFrameProductId'],
      ['gateHardwareSet', 'gateHardwareSetProductId'],
      ['gateLatch', 'gateLatchProductId'],
      ['gateHinge', 'gateHingeProductId'],
      ['privacySlats', 'privacySlatsProductId'],
      ['barbedWire', 'barbedWireProductId'],
    ];

    universalFields.forEach(([key, field]) => {
      const val = s[key] ?? '';
      applyField(newRes, 'residential', RES_HEIGHTS, ALL_COLORS, [field], val);
      applyField(newComm, 'commercial', COMM_HEIGHTS, ALL_COLORS, [field], val);
    });

    // Fabric per color × height
    FENCE_COLORS.forEach(color => {
      FENCE_HEIGHTS.forEach(height => {
        const val = s[`fabric_${color}_${height}`] ?? '';
        if (!val) return;
        const isRes = (RES_HEIGHTS as string[]).includes(height);
        const isComm = (COMM_HEIGHTS as string[]).includes(height);
        if (isRes) applyField(newRes, 'residential', [height], [color], ['fabricProductId'], val);
        if (isComm) applyField(newComm, 'commercial', [height], [color], ['fabricProductId'], val);
      });
    });

    setResidentialMapping(newRes);
    setCommercialMapping(newComm);
    setIsWizardOpen(false);
    toast({ title: "Suggestions Applied", description: "All matches applied. Click Save Mappings to persist to the database." });
  };

  // ─── Render Helpers ───────────────────────────────────────────────────────

  const renderProductSelect = (
    type: ChainlinkFenceType,
    height: ChainlinkFenceHeight,
    color: ChainlinkFenceColor,
    field: keyof Omit<ChainlinkProductMapping, 'id' | 'fenceHeight' | 'fenceType' | 'color'>
  ) => {
    const mapping = type === 'residential' ? residentialMapping : commercialMapping;
    const colorMapping = mapping[color] || {};
    const currentValue = colorMapping[height]?.[field] || '';

    return (
      <ProductSelector
        products={products}
        currentValue={currentValue}
        onSelect={(value) => updateMapping(type, height, color, field, value)}
      />
    );
  };

  const renderMappingTable = (type: ChainlinkFenceType) => {
    return (
      <div className="space-y-6">
        {/* Height and Color Selectors */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <Label className="font-semibold">Height:</Label>
            <Select value={selectedHeight} onValueChange={(value) => setSelectedHeight(value as ChainlinkFenceHeight)}>
              <SelectTrigger className="w-32" aria-label="Select Height">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FENCE_HEIGHTS.map(height => (
                  <SelectItem key={height} value={height}>{height} ft</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <Label className="font-semibold">Color:</Label>
            <Select value={selectedColor} onValueChange={(value) => setSelectedColor(value as ChainlinkFenceColor)}>
              <SelectTrigger className="w-36" aria-label="Select Color">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="galvanized">Galvanized</SelectItem>
                <SelectItem value="green">Green</SelectItem>
                <SelectItem value="black">Black</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">Posts for {selectedHeight}' {selectedColor.charAt(0).toUpperCase() + selectedColor.slice(1)} Fence</h3>
              <div className="grid gap-3">
                <div className="grid grid-cols-[150px,1fr] items-center gap-4">
                  <Label>Terminal Post</Label>
                  {renderProductSelect(type, selectedHeight, selectedColor, 'terminalPostProductId')}
                </div>
                <div className="grid grid-cols-[150px,1fr] items-center gap-4">
                  <Label>Corner Post</Label>
                  {renderProductSelect(type, selectedHeight, selectedColor, 'cornerPostProductId')}
                </div>
                <div className="grid grid-cols-[150px,1fr] items-center gap-4">
                  <Label>Gate Post</Label>
                  {renderProductSelect(type, selectedHeight, selectedColor, 'gatePostProductId')}
                </div>
                <div className="grid grid-cols-[150px,1fr] items-center gap-4">
                  <Label>Line Post</Label>
                  {renderProductSelect(type, selectedHeight, selectedColor, 'linePostProductId')}
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-4">Fabric & Rails</h3>
              <div className="grid gap-3">
                <div className="grid grid-cols-[150px,1fr] items-center gap-4">
                  <Label>Fabric</Label>
                  {renderProductSelect(type, selectedHeight, selectedColor, 'fabricProductId')}
                </div>
                <div className="grid grid-cols-[150px,1fr] items-center gap-4">
                  <Label>Top Rail</Label>
                  {renderProductSelect(type, selectedHeight, selectedColor, 'topRailProductId')}
                </div>
                <div className="grid grid-cols-[150px,1fr] items-center gap-4">
                  <Label>Bottom Rail</Label>
                  {renderProductSelect(type, selectedHeight, selectedColor, 'bottomRailProductId')}
                </div>
                <div className="grid grid-cols-[150px,1fr] items-center gap-4">
                  <Label>Rail Ends</Label>
                  {renderProductSelect(type, selectedHeight, selectedColor, 'railEndsProductId')}
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-4">Hardware & Accessories</h3>
              <div className="grid gap-3">
                <div className="grid grid-cols-[150px,1fr] items-center gap-4">
                  <Label>Tie Wire</Label>
                  {renderProductSelect(type, selectedHeight, selectedColor, 'tieWireProductId')}
                </div>
                <div className="grid grid-cols-[150px,1fr] items-center gap-4">
                  <Label>Loop Cap</Label>
                  {renderProductSelect(type, selectedHeight, selectedColor, 'loopCapProductId')}
                </div>
                <div className="grid grid-cols-[150px,1fr] items-center gap-4">
                  <Label>Post Cap</Label>
                  {renderProductSelect(type, selectedHeight, selectedColor, 'postCapProductId')}
                </div>
                <div className="grid grid-cols-[150px,1fr] items-center gap-4">
                  <Label>Privacy Slats</Label>
                  {renderProductSelect(type, selectedHeight, selectedColor, 'privacySlatsProductId')}
                </div>
                <div className="grid grid-cols-[150px,1fr] items-center gap-4">
                  <Label>Barbed Wire</Label>
                  {renderProductSelect(type, selectedHeight, selectedColor, 'barbedWireProductId')}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">Gate Components</h3>
              <div className="grid gap-3">
                <div className="grid grid-cols-[150px,1fr] items-center gap-4">
                  <Label>Single Gate</Label>
                  {renderProductSelect(type, selectedHeight, selectedColor, 'singleGateFrameProductId')}
                </div>
                <div className="grid grid-cols-[150px,1fr] items-center gap-4">
                  <Label>Double Gate</Label>
                  {renderProductSelect(type, selectedHeight, selectedColor, 'doubleGateFrameProductId')}
                </div>
                <div className="grid grid-cols-[150px,1fr] items-center gap-4">
                  <Label>Pedestrian Gate</Label>
                  {renderProductSelect(type, selectedHeight, selectedColor, 'pedestrianGateFrameProductId')}
                </div>
                <div className="grid grid-cols-[150px,1fr] items-center gap-4">
                  <Label>Gate Hardware</Label>
                  {renderProductSelect(type, selectedHeight, selectedColor, 'gateHardwareSetProductId')}
                </div>
                <div className="grid grid-cols-[150px,1fr] items-center gap-4">
                  <Label>Gate Latch</Label>
                  {renderProductSelect(type, selectedHeight, selectedColor, 'gateLatchProductId')}
                </div>
                <div className="grid grid-cols-[150px,1fr] items-center gap-4">
                  <Label>Gate Hinge</Label>
                  {renderProductSelect(type, selectedHeight, selectedColor, 'gateHingeProductId')}
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-4">Terminal Hardware</h3>
              <div className="grid gap-3">
                <div className="grid grid-cols-[150px,1fr] items-center gap-4">
                  <Label>Brace Band</Label>
                  {renderProductSelect(type, selectedHeight, selectedColor, 'braceBandProductId')}
                </div>
                <div className="grid grid-cols-[150px,1fr] items-center gap-4">
                  <Label>Tension Bar</Label>
                  {renderProductSelect(type, selectedHeight, selectedColor, 'tensionBarProductId')}
                </div>
                <div className="grid grid-cols-[150px,1fr] items-center gap-4">
                  <Label>Tension Band</Label>
                  {renderProductSelect(type, selectedHeight, selectedColor, 'tensionBandProductId')}
                </div>
                <div className="grid grid-cols-[150px,1fr] items-center gap-4">
                  <Label>Nut & Bolt</Label>
                  {renderProductSelect(type, selectedHeight, selectedColor, 'nutAndBoltProductId')}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ─── Loading State ─────────────────────────────────────────────────────────

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

  // ─── Wizard Row Component (inline helper) ─────────────────────────────────

  const WizardRow = ({ label, specNote, appliesTo, wizKey }: {
    label: string;
    specNote?: string;
    appliesTo: string;
    wizKey: string;
  }) => {
    if (!wizardSuggestions) return null;
    const matched = !!wizardSuggestions[wizKey];
    return (
      <div className="flex flex-col sm:grid sm:grid-cols-[1fr,260px] items-start gap-2 sm:gap-4 py-3 border-b last:border-0">
        <div>
          <div className="font-medium text-sm flex items-center gap-2">
            {label}
            {matched && <Badge variant="secondary" className="text-xs">matched</Badge>}
          </div>
          {specNote && <div className="text-xs text-muted-foreground mt-0.5">{specNote}</div>}
          <div className="text-xs text-muted-foreground mt-0.5 italic">{appliesTo}</div>
        </div>
        <ProductSelector
          products={products}
          currentValue={wizardSuggestions[wizKey] ?? ''}
          onSelect={(val) => setWizardSuggestions(prev => prev ? { ...prev, [wizKey]: val } : prev)}
        />
      </div>
    );
  };

  // ─── Main Render ───────────────────────────────────────────────────────────

  return (
    <>
      <PageHeader
        title="Chainlink Product Mapping"
        description="Map your products to chainlink fence components for automatic estimation."
      >
        <Button variant="outline" onClick={handleOpenWizard} disabled={products.length === 0}>
          <Icon name="Wand2" className="mr-2 h-4 w-4" />
          Auto-Match Wizard
        </Button>
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving && <Icon name="Loader2" className="mr-2 h-4 w-4 animate-spin" />}
          Save Mappings
        </Button>
      </PageHeader>

      {/* Auto-Match Wizard Dialog */}
      <Dialog open={isWizardOpen} onOpenChange={setIsWizardOpen}>
        <DialogContent className="max-w-4xl flex flex-col" style={{ maxHeight: '90vh' }}>
          <DialogHeader>
            <DialogTitle>Auto-Match Products Wizard</DialogTitle>
            <DialogDescription>
              Your product catalog has been scanned and suggestions matched by keyword. Review and adjust before applying to all fence configurations.
            </DialogDescription>
          </DialogHeader>

          {wizardSuggestions && (
            <ScrollArea className="flex-1 overflow-y-auto pr-4" style={{ maxHeight: 'calc(90vh - 180px)' }}>
              <div className="space-y-8 py-2">

                {/* Posts */}
                <div>
                  <h3 className="text-base font-semibold mb-1">Fence Posts</h3>
                  <p className="text-xs text-muted-foreground mb-3">Matched per height — post length = fence height + 2&apos; (burial). Terminal fills terminal, corner &amp; gate post slots.</p>
                  <div className="space-y-4">

                    {/* Residential */}
                    <div>
                      <div className="text-sm font-medium text-muted-foreground mb-2">Residential — 2&quot; terminal / 1 5/8&quot; SS20 line</div>
                      <div className="rounded-md border px-4">
                        {RES_HEIGHTS.map(h => {
                          const len = parseInt(h) + 2;
                          return (
                            <React.Fragment key={h}>
                              <WizardRow
                                label={`${h}' Terminal / Corner / Gate Post`}
                                specNote={`2" × ${len}'`}
                                appliesTo="Fills terminal, corner & gate post slots"
                                wizKey={`post_res_terminal_${h}`}
                              />
                              <WizardRow
                                label={`${h}' Line Post`}
                                specNote={`1 5/8" SS20 × ${len}'`}
                                appliesTo="Fills line post slot"
                                wizKey={`post_res_line_${h}`}
                              />
                            </React.Fragment>
                          );
                        })}
                      </div>
                    </div>

                    {/* Commercial 6-7' */}
                    <div>
                      <div className="text-sm font-medium text-muted-foreground mb-2">Commercial 6–7&apos; — 2 1/2&quot; SS40 terminal / 2&quot; SS20 line</div>
                      <div className="rounded-md border px-4">
                        {COMM_SM_HEIGHTS.map(h => {
                          const len = parseInt(h) + 2;
                          return (
                            <React.Fragment key={h}>
                              <WizardRow
                                label={`${h}' Terminal / Corner / Gate Post`}
                                specNote={`2 1/2" SS40 × ${len}'`}
                                appliesTo="Fills terminal, corner & gate post slots"
                                wizKey={`post_comm_terminal_${h}`}
                              />
                              <WizardRow
                                label={`${h}' Line Post`}
                                specNote={`2" SS20 × ${len}'`}
                                appliesTo="Fills line post slot"
                                wizKey={`post_comm_line_${h}`}
                              />
                            </React.Fragment>
                          );
                        })}
                      </div>
                    </div>

                    {/* Commercial 8-10' */}
                    <div>
                      <div className="text-sm font-medium text-muted-foreground mb-2">Commercial 8–10&apos; — 3&quot; SS40 terminal / 2 1/2&quot; line</div>
                      <div className="rounded-md border px-4">
                        {COMM_LG_HEIGHTS.map(h => {
                          const len = parseInt(h) + 2;
                          return (
                            <React.Fragment key={h}>
                              <WizardRow
                                label={`${h}' Terminal / Corner / Gate Post`}
                                specNote={`3" SS40 × ${len}'`}
                                appliesTo="Fills terminal, corner & gate post slots"
                                wizKey={`post_comm_terminal_${h}`}
                              />
                              <WizardRow
                                label={`${h}' Line Post`}
                                specNote={`2 1/2" × ${len}'`}
                                appliesTo="Fills line post slot"
                                wizKey={`post_comm_line_${h}`}
                              />
                            </React.Fragment>
                          );
                        })}
                      </div>
                    </div>

                  </div>
                </div>

                {/* Rails */}
                <div>
                  <h3 className="text-base font-semibold mb-3">Rails & Connectivity</h3>
                  <div className="rounded-md border px-4">
                    <WizardRow
                      label="Top Rail (Residential)"
                      specNote={`1 3/8" × 21' (065 wall)`}
                      appliesTo="Residential 3–6', all colors"
                      wizKey="resTopRail"
                    />
                    <WizardRow
                      label="Top Rail (Commercial)"
                      specNote={`1 5/8" × 21'`}
                      appliesTo="Commercial 6–10', all colors"
                      wizKey="commTopRail"
                    />
                    <WizardRow
                      label="Bottom Rail"
                      appliesTo="All heights & colors, both types"
                      wizKey="bottomRail"
                    />
                    <WizardRow
                      label="Rail Ends"
                      appliesTo="All heights & colors, both types"
                      wizKey="railEnds"
                    />
                  </div>
                </div>

                {/* Fittings by pipe spec */}
                <div>
                  <h3 className="text-base font-semibold mb-1">Fittings by Pipe Size</h3>
                  <p className="text-xs text-muted-foreground mb-3">Each fitting is matched to the pipe diameter it attaches to.</p>
                  <Tabs defaultValue="fitting_res">
                    <TabsList className="mb-3">
                      <TabsTrigger value="fitting_res">Residential (2&quot;)</TabsTrigger>
                      <TabsTrigger value="fitting_commSm">Comm 6–7&apos; (2 1/2&quot;)</TabsTrigger>
                      <TabsTrigger value="fitting_commLg">Comm 8–10&apos; (3&quot;)</TabsTrigger>
                    </TabsList>
                    <TabsContent value="fitting_res">
                      <div className="rounded-md border px-4">
                        <WizardRow label="Tension Band" specNote='2" (terminal post)' appliesTo="Residential 3–6'" wizKey="fitting_res_tensionBand" />
                        <WizardRow label="Brace Band"   specNote='2" (terminal post)' appliesTo="Residential 3–6'" wizKey="fitting_res_braceBand" />
                        <WizardRow label="Post Cap"     specNote='2" (terminal post)' appliesTo="Residential 3–6'" wizKey="fitting_res_postCap" />
                        <WizardRow label="Loop Cap"     specNote='1 5/8" (line post)' appliesTo="Residential 3–6'" wizKey="fitting_res_loopCap" />
                        <WizardRow label="Rail Ends"    specNote='1 3/8" (top rail)'  appliesTo="Residential 3–6'" wizKey="fitting_res_railEnds" />
                      </div>
                    </TabsContent>
                    <TabsContent value="fitting_commSm">
                      <div className="rounded-md border px-4">
                        <WizardRow label="Tension Band" specNote='2 1/2" (terminal post)' appliesTo="Commercial 6–7'" wizKey="fitting_commSm_tensionBand" />
                        <WizardRow label="Brace Band"   specNote='2 1/2" (terminal post)' appliesTo="Commercial 6–7'" wizKey="fitting_commSm_braceBand" />
                        <WizardRow label="Post Cap"     specNote='2 1/2" (terminal post)' appliesTo="Commercial 6–7'" wizKey="fitting_commSm_postCap" />
                        <WizardRow label="Loop Cap"     specNote='2" (line post)'          appliesTo="Commercial 6–7'" wizKey="fitting_commSm_loopCap" />
                        <WizardRow label="Rail Ends"    specNote='1 5/8" (top rail)'       appliesTo="Commercial 6–7'" wizKey="fitting_commSm_railEnds" />
                      </div>
                    </TabsContent>
                    <TabsContent value="fitting_commLg">
                      <div className="rounded-md border px-4">
                        <WizardRow label="Tension Band" specNote='3" (terminal post)'   appliesTo="Commercial 8–10'" wizKey="fitting_commLg_tensionBand" />
                        <WizardRow label="Brace Band"   specNote='3" (terminal post)'   appliesTo="Commercial 8–10'" wizKey="fitting_commLg_braceBand" />
                        <WizardRow label="Post Cap"     specNote='3" (terminal post)'   appliesTo="Commercial 8–10'" wizKey="fitting_commLg_postCap" />
                        <WizardRow label="Loop Cap"     specNote='2 1/2" (line post)'   appliesTo="Commercial 8–10'" wizKey="fitting_commLg_loopCap" />
                        <WizardRow label="Rail Ends"    specNote='1 5/8" (top rail)'    appliesTo="Commercial 8–10'" wizKey="fitting_commLg_railEnds" />
                      </div>
                    </TabsContent>
                  </Tabs>
                </div>

                {/* Universal Hardware */}
                <div>
                  <h3 className="text-base font-semibold mb-1">Universal Hardware</h3>
                  <p className="text-xs text-muted-foreground mb-3">Same product for all fence types and heights.</p>
                  <div className="rounded-md border px-4">
                    <WizardRow label="Tie Wire"    appliesTo="All configurations" wizKey="tieWire" />
                    <WizardRow label="Tension Bar" appliesTo="All configurations" wizKey="tensionBar" />
                    <WizardRow label="Nut & Bolt"  appliesTo="All configurations" wizKey="nutAndBolt" />
                  </div>
                </div>

                {/* Gate Components */}
                <div>
                  <h3 className="text-base font-semibold mb-1">Gate Components</h3>
                  <p className="text-xs text-muted-foreground mb-3">Applied to all heights, colors, and fence types.</p>
                  <div className="rounded-md border px-4">
                    <WizardRow label="Single Gate Frame" appliesTo="All configurations" wizKey="singleGate" />
                    <WizardRow label="Double Gate Frame" appliesTo="All configurations" wizKey="doubleGate" />
                    <WizardRow label="Pedestrian Gate Frame" appliesTo="All configurations" wizKey="pedestrianGate" />
                    <WizardRow label="Gate Hardware Set" appliesTo="All configurations" wizKey="gateHardwareSet" />
                    <WizardRow label="Gate Latch" appliesTo="All configurations" wizKey="gateLatch" />
                    <WizardRow label="Gate Hinge" appliesTo="All configurations" wizKey="gateHinge" />
                  </div>
                </div>

                {/* Extras */}
                <div>
                  <h3 className="text-base font-semibold mb-3">Extras</h3>
                  <div className="rounded-md border px-4">
                    <WizardRow label="Privacy Slats" appliesTo="All configurations" wizKey="privacySlats" />
                    <WizardRow label="Barbed Wire" appliesTo="All configurations" wizKey="barbedWire" />
                  </div>
                </div>

                {/* Fabric */}
                <div>
                  <h3 className="text-base font-semibold mb-1">Fabric</h3>
                  <p className="text-xs text-muted-foreground mb-3">Select fabric product per height and color combination.</p>
                  <Tabs defaultValue="galvanized">
                    <TabsList className="mb-3">
                      <TabsTrigger value="galvanized">Galvanized</TabsTrigger>
                      <TabsTrigger value="green">Green</TabsTrigger>
                      <TabsTrigger value="black">Black</TabsTrigger>
                    </TabsList>
                    {FENCE_COLORS.map(color => (
                      <TabsContent key={color} value={color}>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-20">Height</TableHead>
                              <TableHead>Product</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {FENCE_HEIGHTS.map(height => (
                              <TableRow key={height}>
                                <TableCell className="font-medium">{height}&apos;</TableCell>
                                <TableCell className="p-2">
                                  <ProductSelector
                                    products={products}
                                    currentValue={wizardSuggestions[`fabric_${color}_${height}`] ?? ''}
                                    onSelect={(val) => setWizardSuggestions(prev => prev ? { ...prev, [`fabric_${color}_${height}`]: val } : prev)}
                                  />
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TabsContent>
                    ))}
                  </Tabs>
                </div>

              </div>
            </ScrollArea>
          )}

          <DialogFooter className="border-t pt-4 mt-2 flex-shrink-0">
            <Button variant="outline" onClick={() => setIsWizardOpen(false)}>Cancel</Button>
            <Button onClick={handleApplyWizard} disabled={!wizardSuggestions}>
              Apply All Suggestions
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <CardTitle>Product Assignments by Fence Type</CardTitle>
          <CardDescription>
            Select products from your inventory for each chainlink component. Use the <strong>Auto-Match Wizard</strong> to scan your catalog and fill all slots at once.
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
