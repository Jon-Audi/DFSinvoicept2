
"use client";

import React from 'react';
import type { Estimate, Customer, Product, LineItem, Payment } from '@/types';
import { EstimateForm, type EstimateFormData } from './estimate-form';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { CustomerDialog } from '@/components/customers/customer-dialog';
import { clearSavedFormData } from '@/hooks/use-form-auto-save';

interface EstimateDialogProps {
  estimate?: Estimate;
  triggerButton?: React.ReactElement;
  onSave: (estimate: Estimate) => void;
  onSaveProduct: (product: Omit<Product, 'id'>) => Promise<string | void>;
  onSaveCustomer: (customer: Omit<Customer, 'id'> & { id?: string; }) => Promise<string | void>;
  customers: Customer[];
  products: Product[];
  productCategories: string[];
  productSubcategories: string[];
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  initialData?: Partial<EstimateFormData> & { lineItems: EstimateFormData['lineItems'] } | null;
  isDataLoading?: boolean;
}

export function EstimateDialog({
  estimate,
  triggerButton,
  onSave,
  onSaveProduct,
  onSaveCustomer,
  customers,
  products,
  productCategories,
  productSubcategories,
  isOpen: controlledIsOpen,
  onOpenChange: controlledOnOpenChange,
  initialData,
  isDataLoading,
}: EstimateDialogProps) {
  const [internalOpen, setInternalOpen] = React.useState(false);
  const [customerToView, setCustomerToView] = React.useState<Customer | null>(null);

  const isControlled = controlledIsOpen !== undefined && controlledOnOpenChange !== undefined;
  const isOpen = isControlled ? controlledIsOpen : internalOpen;
  const setOpen = isControlled ? controlledOnOpenChange : setInternalOpen;
  
  React.useEffect(() => {
    // Only auto-open if initialData has substantial data (e.g., when cloning an estimate)
    // Don't auto-open for just a customerId pre-fill
    if (initialData && !isControlled && (initialData.estimateNumber || (initialData.lineItems && initialData.lineItems.length > 0))) {
      setInternalOpen(true);
    }
  }, [initialData, isControlled]);

  const handleSubmit = async (formDataFromForm: EstimateFormData) => {
    
    const productsToCreate: Omit<Product, 'id'>[] = [];
    for (const item of formDataFromForm.lineItems) {
      if (item.isNonStock && item.addToProductList) {
        productsToCreate.push({
          name: item.productName || 'Unnamed Product',
          category: item.newProductCategory || 'Uncategorized',
          unit: item.unit || 'unit',
          price: item.unitPrice,
          cost: item.cost || 0,
          markupPercentage: item.markupPercentage || 0,
          quantityInStock: 0,
        });
      }
    }

    const createdProductIds = await Promise.all(productsToCreate.map(p => onSaveProduct(p)));
    
    let newProductIndex = 0;
    const lineItems: LineItem[] = formDataFromForm.lineItems.map((item) => {
      const product = !item.isNonStock && item.productId ? products.find(p => p.id === item.productId) : undefined;
      const finalUnitPrice = parseFloat((typeof item.unitPrice === 'number' ? item.unitPrice : 0).toFixed(2));
      const quantity = item.quantity;
      const isReturn = item.isReturn || false;
      const itemBaseTotal = parseFloat((quantity * finalUnitPrice).toFixed(2));

      const itemName = item.isNonStock
                       ? (item.productName || 'Non-Stock Item')
                       : (product?.name || 'Unknown Product');

      const lineItemForDb: Partial<LineItem> & Pick<LineItem, 'id'|'productName'|'quantity'|'unitPrice'|'total'|'isReturn'|'isNonStock'> = {
          id: item.id || crypto.randomUUID(),
          productName: itemName,
          quantity: quantity,
          unitPrice: finalUnitPrice,
          isReturn: isReturn,
          total: isReturn ? -itemBaseTotal : itemBaseTotal,
          isNonStock: item.isNonStock || false,
          cost: item.cost || 0,
          markupPercentage: item.markupPercentage || 0,
      };

      if (item.isNonStock && item.addToProductList) {
        const newId = createdProductIds[newProductIndex];
        if (newId) {
          lineItemForDb.productId = newId;
          lineItemForDb.isNonStock = false;
        }
        newProductIndex++;
      } else if (!item.isNonStock && item.productId) {
          lineItemForDb.productId = item.productId;
      }
      return lineItemForDb as LineItem;
    });

    const selectedCustomer = customers.find(c => c.id === formDataFromForm.customerId);
    const customerName = selectedCustomer ? (selectedCustomer.companyName || `${selectedCustomer.firstName} ${selectedCustomer.lastName}`) : 'Unknown Customer';
    
    const currentSubtotal = parseFloat(lineItems.reduce((acc, item) => acc + item.total, 0).toFixed(2));
    const currentTaxAmount = 0; // Assuming no tax for now
    const currentTotal = parseFloat((currentSubtotal + currentTaxAmount).toFixed(2));

    const estimatePayload: Omit<Estimate, 'id'> & { id?: string } = {
        id: estimate?.id || initialData?.id || formDataFromForm.id,
        estimateNumber: formDataFromForm.estimateNumber,
        customerId: formDataFromForm.customerId,
        customerName: customerName,
        date: formDataFromForm.date.toISOString(),
        status: formDataFromForm.status,
        lineItems: lineItems,
        subtotal: currentSubtotal,
        taxAmount: currentTaxAmount,
        total: currentTotal,
        poNumber: formDataFromForm.poNumber || '',
        notes: formDataFromForm.notes || '',
        validUntil: formDataFromForm.validUntil?.toISOString(),
    };
    
    onSave(estimatePayload as Estimate);

    // Clear auto-saved data after successful save
    if (!estimate && !initialData) {
      clearSavedFormData('estimate-form-draft');
    }

    setOpen(false);
  };
  
  const handleSaveCustomerWrapper = (c: Omit<Customer, "id"> & { id?: string }) => {
    void onSaveCustomer(c).catch((err) => {
    });
  };

  const dialogTitle = estimate ? 'Edit Estimate' : (initialData ? 'Create New Estimate from Clone' : 'New Estimate');
  const dialogDescription = estimate ? 'Update the details of this estimate.' : (initialData ? 'Review and confirm the details for this new estimate.' : 'Fill in the details for the new estimate.');

  return (
    <>
      <Dialog open={isOpen} onOpenChange={setOpen}>
        {triggerButton && <DialogTrigger asChild>{triggerButton}</DialogTrigger>}
        <DialogContent
          className="sm:max-w-2xl max-h-[90vh] overflow-y-auto"
          onInteractOutside={(e) => {
            // Prevent closing on outside click to avoid accidental data loss
            e.preventDefault();
          }}
        >
          <DialogHeader>
            <DialogTitle>{dialogTitle}</DialogTitle>
            <DialogDescription>{dialogDescription}</DialogDescription>
          </DialogHeader>
          <EstimateForm
            estimate={estimate}
            initialData={initialData}
            onSubmit={handleSubmit}
            onClose={() => setOpen(false)}
            customers={customers}
            products={products}
            productCategories={productCategories}
            productSubcategories={productSubcategories}
            isDataLoading={isDataLoading}
            onViewCustomer={(customer) => setCustomerToView(customer)}
            onSaveCustomer={onSaveCustomer}
          />
        </DialogContent>
      </Dialog>

      {customerToView && (
        <CustomerDialog 
            isOpen={!!customerToView}
            onOpenChange={() => setCustomerToView(null)}
            customer={customerToView}
            onSave={handleSaveCustomerWrapper}
        />
      )}
    </>
  );
}
