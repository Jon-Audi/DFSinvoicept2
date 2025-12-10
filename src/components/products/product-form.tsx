
"use client";

import React, { useEffect, useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import type { Product } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Icon } from '@/components/icons';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from '@/hooks/use-toast';
import { useFirebase } from '@/components/firebase-provider';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const assemblyComponentSchema = z.object({
  productId: z.string().min(1, "Product must be selected"),
  productName: z.string(), // Denormalized
  quantity: z.coerce.number().min(0.01, "Quantity must be greater than 0"),
});

const productSchema = z.object({
  name: z.string().min(1, "Product name is required"),
  category: z.string().min(1, "Category is required"),
  subcategory: z.string().optional(),
  unit: z.string().min(1, "Unit is required"),
  cost: z.coerce.number().min(0, "Cost must be non-negative"),
  price: z.coerce.number().min(0, "Price must be non-negative"),
  markupPercentage: z.coerce.number().min(0, "Markup must be non-negative"),
  description: z.string().optional(),
  isAssembly: z.boolean().default(false),
  components: z.array(assemblyComponentSchema).optional(),
});

export type ProductFormData = z.infer<typeof productSchema>;

interface ProductFormProps {
  product?: Product;
  allProducts?: Product[]; // Pass all products for component selection
  onSubmit: (data: ProductFormData) => void;
  onClose?: () => void;
  productCategories: string[];
  onAddNewCategory: (category: string) => void;
}

export function ProductForm({ product, allProducts = [], onSubmit, onClose, productCategories, onAddNewCategory }: ProductFormProps) {
  const { db } = useFirebase();
  const [subcategories, setSubcategories] = useState<string[]>([]);
  const [subcategoryComboboxOpen, setSubcategoryComboboxOpen] = useState(false);
  const [subcategoryInputValue, setSubcategoryInputValue] = useState('');

  const form = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: product ? {
      ...product,
      cost: product.cost || 0,
      price: product.price || 0,
      markupPercentage: product.markupPercentage || 0,
      isAssembly: product.isAssembly || false,
      components: product.components || [],
    } : {
      name: '',
      category: productCategories.length > 0 ? productCategories[0] : '',
      subcategory: '',
      unit: '',
      cost: 0,
      price: 0,
      markupPercentage: 0,
      description: '',
      isAssembly: false,
      components: [],
    },
  });

  const { watch, setValue, control, handleSubmit: formHandleSubmit, trigger, formState: { errors }, getValues } = form;
  const cost = watch('cost');
  const price = watch('price');
  const markupPercentage = watch('markupPercentage');
  const formCategoryValue = watch('category');
  const isAssembly = watch('isAssembly');
  const components = watch('components');


  const { fields, append, remove } = useFieldArray({
    control,
    name: 'components',
  });

  const [lastEditedField, setLastEditedField] = React.useState<'price' | 'markup' | null>(null);
  const [comboboxOpen, setComboboxOpen] = useState(false);
  const [inputValue, setInputValue] = useState(formCategoryValue || "");


  // Fetch subcategories from Firebase
  useEffect(() => {
    if (!db) return;

    const fetchSubcategories = async () => {
      try {
        const docRef = doc(db, 'settings', 'subcategories');
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          setSubcategories(data.list || []);
        }
      } catch (error) {
        console.error('Error fetching subcategories:', error);
      }
    };

    fetchSubcategories();
  }, [db]);

  useEffect(() => {
    const initialCategory = product?.category || (productCategories.length > 0 ? productCategories[0] : '');
    if (getValues('category') !== initialCategory) {
        setValue('category', initialCategory, { shouldValidate: true });
    }
    setInputValue(initialCategory);

    // Initialize subcategory input value
    if (product?.subcategory) {
      setSubcategoryInputValue(product.subcategory);
    }
  }, [product, productCategories, setValue, getValues]);

  useEffect(() => {
    if (formCategoryValue !== inputValue) {
      setInputValue(formCategoryValue);
    }
  }, [formCategoryValue, inputValue]);

  useEffect(() => {
    // This effect runs when cost, price, or markupPercentage change.
    // It recalculates the other two fields based on which one was last edited.
    if (lastEditedField === 'markup') {
      if (cost > 0 && markupPercentage >= 0) {
        const newPrice = cost * (1 + markupPercentage / 100);
        if (Math.abs(newPrice - price) > 0.001) {
          setValue('price', parseFloat(newPrice.toFixed(2)), { shouldValidate: true });
        }
      }
    } else if (lastEditedField === 'price') {
      if (cost > 0 && price >= 0) {
        const newMarkup = ((price / cost) - 1) * 100;
        if (Math.abs(newMarkup - markupPercentage) > 0.001) {
          setValue('markupPercentage', parseFloat(newMarkup.toFixed(2)), { shouldValidate: true });
        }
      } else if (cost === 0) {
        setValue('markupPercentage', 0, { shouldValidate: true });
      }
    }
  }, [cost, price, markupPercentage, lastEditedField, setValue]);
  
  // Auto-calculate assembly cost
  useEffect(() => {
    if (isAssembly) {
      const totalCost = (components || []).reduce((acc, comp) => {
        const componentProduct = allProducts.find(p => p.id === comp.productId);
        const componentCost = componentProduct?.cost || 0;
        return acc + (componentCost * comp.quantity);
      }, 0);
      setValue('cost', parseFloat(totalCost.toFixed(2)), { shouldValidate: true });
    }
  }, [isAssembly, components, allProducts, setValue]);

  const processAndSubmit = (data: ProductFormData) => {
    const finalCategory = data.category.trim(); 
    
    if (!finalCategory) {
      form.setError("category", { type: "manual", message: "Category cannot be empty." });
      return;
    }
    
    const existingCategory = productCategories.find(pc => pc.toLowerCase() === finalCategory.toLowerCase());
    const categoryToSave = existingCategory || finalCategory;

    if (!existingCategory && !productCategories.some(pc => pc === finalCategory)) {
      onAddNewCategory(finalCategory); 
    }
    const dataToSubmit = { ...data, category: categoryToSave };
    onSubmit(dataToSubmit);
  };
  
  const handleCategorySelect = (selectedCategoryValue: string) => {
    setValue("category", selectedCategoryValue, { shouldValidate: true });
    setInputValue(selectedCategoryValue);
    setComboboxOpen(false);
    trigger("category"); 
  };

  const handleComboboxOpenChange = (open: boolean) => {
    if (!open) {
      const currentFormCategory = getValues("category");
      const trimmedInputValue = inputValue.trim();
      if (trimmedInputValue && trimmedInputValue !== currentFormCategory) {
        const existingCat = productCategories.find(pc => pc.toLowerCase() === trimmedInputValue.toLowerCase());
        if (existingCat) {
          setValue("category", existingCat, { shouldValidate: true });
          setInputValue(existingCat);
        } else {
          setValue("category", trimmedInputValue, { shouldValidate: true });
        }
      } else if (!trimmedInputValue && currentFormCategory) {
        setInputValue(currentFormCategory);
      }
       trigger("category");
    }
    setComboboxOpen(open);
  };

  const handleSubcategorySelect = async (selectedSubcategory: string) => {
    setValue("subcategory", selectedSubcategory, { shouldValidate: true });
    setSubcategoryInputValue(selectedSubcategory);
    setSubcategoryComboboxOpen(false);
  };

  const handleSubcategoryOpenChange = async (open: boolean) => {
    if (!open) {
      const trimmedValue = subcategoryInputValue.trim();
      if (trimmedValue) {
        // Check if it's a new subcategory
        const existingSub = subcategories.find(s => s.toLowerCase() === trimmedValue.toLowerCase());
        if (existingSub) {
          setValue("subcategory", existingSub, { shouldValidate: true });
          setSubcategoryInputValue(existingSub);
        } else {
          // Save new subcategory to Firebase
          if (db) {
            try {
              const updatedList = [...subcategories, trimmedValue].sort();
              const docRef = doc(db, 'settings', 'subcategories');
              await setDoc(docRef, { list: updatedList });
              setSubcategories(updatedList);
              setValue("subcategory", trimmedValue, { shouldValidate: true });
            } catch (error) {
              console.error('Error saving new subcategory:', error);
            }
          }
        }
      } else {
        setValue("subcategory", '', { shouldValidate: true });
      }
    }
    setSubcategoryComboboxOpen(open);
  };

  const handleAddComponent = () => {
    append({ productId: '', productName: '', quantity: 1 });
  };
  
  const handleSelectComponentProduct = (index: number, selectedProductId: string) => {
    const selectedProduct = allProducts.find(p => p.id === selectedProductId);
    if(selectedProduct) {
        setValue(`components.${index}.productId`, selectedProduct.id, { shouldValidate: true });
        setValue(`components.${index}.productName`, selectedProduct.name);
    }
  };


  return (
    <Form {...form}>
      <form onSubmit={formHandleSubmit(processAndSubmit)} className="space-y-6">
        <FormField
          control={control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Product Name</FormLabel>
              <FormControl><Input placeholder="e.g., 6ft Cedar Picket" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={control}
            name="category"
            render={({ field }) => ( 
              <FormItem className="flex flex-col">
                <FormLabel>Category</FormLabel>
                <Popover open={comboboxOpen} onOpenChange={handleComboboxOpenChange}>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={comboboxOpen}
                        className={cn("w-full justify-between", !field.value && "text-muted-foreground", errors.category && "border-destructive")}
                      >
                        {field.value || "Select or type category..."}
                        <Icon name="ChevronsUpDown" className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                    <Command shouldFilter={false}>
                      <CommandInput
                        placeholder="Search or add category..."
                        value={inputValue}
                        onValueChange={(search) => setInputValue(search)}
                      />
                       <CommandList className="max-h-[300px]">
                        <CommandEmpty
                          onMouseDown={(e) => { 
                            e.preventDefault(); 
                            const newCat = inputValue.trim();
                            if (newCat) handleCategorySelect(newCat); 
                            else setComboboxOpen(false); 
                          }}
                          className="cursor-pointer p-2 text-sm hover:bg-accent"
                        >
                          {inputValue.trim() ? `Add "${inputValue.trim()}&quot;` : "Type to search or add"}
                        </CommandEmpty>
                        <CommandGroup>
                          {productCategories
                            .filter(cat => cat.toLowerCase().includes(inputValue.toLowerCase()))
                            .map((cat) => (
                            <CommandItem
                              value={cat} 
                              key={cat}
                              onSelect={() => handleCategorySelect(cat)}
                            >
                              <Icon
                                name="Check"
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  cat.toLowerCase() === field.value?.toLowerCase() ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {cat}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />
           <FormField
            control={control}
            name="subcategory"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Subcategory (Optional)</FormLabel>
                <Popover open={subcategoryComboboxOpen} onOpenChange={handleSubcategoryOpenChange}>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={subcategoryComboboxOpen}
                        className={cn("w-full justify-between", !field.value && "text-muted-foreground")}
                      >
                        {field.value || "Select or type subcategory..."}
                        <Icon name="ChevronsUpDown" className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                    <Command shouldFilter={false}>
                      <CommandInput
                        placeholder="Search or add subcategory..."
                        value={subcategoryInputValue}
                        onValueChange={(search) => setSubcategoryInputValue(search)}
                      />
                      <CommandList className="max-h-[300px]">
                        <CommandEmpty
                          onMouseDown={(e) => {
                            e.preventDefault();
                            const newSub = subcategoryInputValue.trim();
                            if (newSub) handleSubcategorySelect(newSub);
                            else setSubcategoryComboboxOpen(false);
                          }}
                          className="cursor-pointer p-2 text-sm hover:bg-accent"
                        >
                          {subcategoryInputValue.trim() ? `Add "${subcategoryInputValue.trim()}"` : "Type to search or add"}
                        </CommandEmpty>
                        <CommandGroup>
                          {field.value && (
                            <CommandItem
                              value=""
                              onSelect={() => handleSubcategorySelect('')}
                              className="text-muted-foreground"
                            >
                              <Icon name="X" className="mr-2 h-4 w-4" />
                              Clear subcategory
                            </CommandItem>
                          )}
                          {subcategories
                            .filter(sub => sub.toLowerCase().includes(subcategoryInputValue.toLowerCase()))
                            .map((sub) => (
                            <CommandItem
                              value={sub}
                              key={sub}
                              onSelect={() => handleSubcategorySelect(sub)}
                            >
                              <Icon
                                name="Check"
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  sub.toLowerCase() === field.value?.toLowerCase() ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {sub}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={control}
          name="unit"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Unit</FormLabel>
              <FormControl><Input placeholder="e.g., piece, ft, kit" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="isAssembly"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center space-x-2 pt-2">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <FormLabel className="font-normal">This product is an assembly (Bill of Materials)</FormLabel>
            </FormItem>
          )}
        />

        {isAssembly && (
          <div className="space-y-4 rounded-md border p-4">
            <h3 className="text-md font-semibold">Assembly Components</h3>
            {fields.map((field, index) => (
              <div key={field.id} className="grid grid-cols-[1fr_auto_auto] items-end gap-2 relative">
                <FormField
                  control={control}
                  name={`components.${index}.productId`}
                  render={({ field: componentField }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Component</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button variant="outline" role="combobox" className={cn("w-full justify-between", !componentField.value && "text-muted-foreground")}>
                              {componentField.value ? allProducts.find(p => p.id === componentField.value)?.name : "Select component"}
                              <Icon name="ChevronsUpDown" className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                          <Command>
                            <CommandInput placeholder="Search product..." />
                            <CommandList className="max-h-[300px]"><CommandEmpty>No product found.</CommandEmpty>
                              <CommandGroup>
                                {allProducts.filter(p => !p.isAssembly).map(p => (
                                  <CommandItem key={p.id} value={p.name} onSelect={() => handleSelectComponentProduct(index, p.id)}>
                                    <Icon name="Check" className={cn("mr-2 h-4 w-4", p.id === componentField.value ? "opacity-100" : "opacity-0")} />
                                    {p.name}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={control}
                  name={`components.${index}.quantity`}
                  render={({ field: qtyField }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Quantity</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" className="w-24" {...qtyField} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <Button type="button" variant="ghost" size="icon" className="h-9 w-9 self-end" onClick={() => remove(index)}>
                  <Icon name="Trash2" className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={handleAddComponent}>
              <Icon name="PlusCircle" className="mr-2 h-4 w-4" /> Add Component
            </Button>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormField
            control={control}
            name="cost"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Cost</FormLabel>
                <FormControl><Input type="number" step="0.01" {...field} 
                  disabled={isAssembly} // Disable cost field for assemblies
                  onChange={(e) => { 
                    field.onChange(parseFloat(e.target.value) || 0); 
                    setLastEditedField('price'); // Assume price is fixed, re-calc markup
                  }} 
                /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={control}
            name="markupPercentage"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Markup (%)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    {...field}
                    onChange={(e) => {
                      field.onChange(parseFloat(e.target.value) || 0);
                      setLastEditedField('markup');
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={control}
            name="price"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Selling Price</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    {...field}
                    onChange={(e) => {
                      field.onChange(parseFloat(e.target.value) || 0);
                      setLastEditedField('price');
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description (Optional)</FormLabel>
              <FormControl><Textarea placeholder="Optional product description" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end gap-2">
          {onClose && <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>}
          <Button type="submit">{product ? 'Save Changes' : 'Create Product'}</Button>
        </div>
      </form>
    </Form>
  );
}
