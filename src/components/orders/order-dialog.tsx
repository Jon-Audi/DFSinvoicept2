
"use client";

import React from 'react';
import type { Order, Customer, Product, Payment, Vendor } from '@/types';
import { OrderForm, type OrderFormData } from './order-form';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { CustomerDialog } from '@/components/customers/customer-dialog';

interface OrderDialogProps {
  order?: Order;
  triggerButton?: React.ReactElement;
  onSave: (order: Order) => void;
  onSaveProduct: (product: Omit<Product, 'id'>) => Promise<string | void>;
  onSaveCustomer: (customer: Customer) => Promise<string | void>;
  customers: Customer[];
  products: Product[];
  vendors: Vendor[];
  productCategories: string[];
  productSubcategories: string[];
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  initialData?: OrderFormData | null;
}

export function OrderDialog({
  order,
  triggerButton,
  onSave,
  onSaveProduct,
  onSaveCustomer,
  customers,
  products,
  vendors,
  productCategories,
  productSubcategories,
  isOpen: controlledIsOpen,
  onOpenChange: controlledOnOpenChange,
  initialData,
}: OrderDialogProps) {
  const [internalOpen, setInternalOpen] = React.useState(false);
  const [customerToView, setCustomerToView] = React.useState<Customer | null>(null);

  const isControlled = controlledIsOpen !== undefined && controlledOnOpenChange !== undefined;
  const isOpen = isControlled ? controlledIsOpen : internalOpen;
  const setOpen = isControlled ? controlledOnOpenChange : setInternalOpen;
  
  React.useEffect(() => {
    if (initialData && !isControlled) {
      setInternalOpen(true);
    }
  }, [initialData, isControlled]);

  const handleSubmit = async (formDataFromForm: OrderFormData) => {
    
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
    const lineItems = formDataFromForm.lineItems.map((item) => {
      const product = !item.isNonStock && item.productId ? products.find(p => p.id === item.productId) : undefined;
      const finalUnitPrice = parseFloat((typeof item.unitPrice === 'number' ? item.unitPrice : 0).toFixed(2));
      const quantity = item.quantity;
      const isReturn = item.isReturn || false;
      const itemBaseTotal = parseFloat((quantity * finalUnitPrice).toFixed(2));

      const itemName = item.isNonStock
                       ? (item.productName || 'Non-Stock Item')
                       : (product?.name || 'Unknown Product');

      const lineItemForDb: any = {
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
      return lineItemForDb;
    });

    const selectedCustomer = customers.find(c => c.id === formDataFromForm.customerId);
    const customerName = selectedCustomer ? (selectedCustomer.companyName || `${selectedCustomer.firstName} ${selectedCustomer.lastName}`) : 'Unknown Customer';
    
    const currentSubtotal = parseFloat(lineItems.reduce((acc, item) => acc + item.total, 0).toFixed(2));
    const currentTaxAmount = 0; 
    const currentTotal = parseFloat((currentSubtotal + currentTaxAmount).toFixed(2));

    const finalPayments: Payment[] = formDataFromForm.payments || [];
    const roundedTotalAmountPaid = parseFloat(finalPayments.reduce((acc, p) => acc + p.amount, 0).toFixed(2));
    const roundedBalanceDue = parseFloat((currentTotal - roundedTotalAmountPaid).toFixed(2));

    const orderPayload: Omit<Order, 'id'> & { id?: string } = {
        id: order?.id || initialData?.id || formDataFromForm.id,
        orderNumber: formDataFromForm.orderNumber,
        customerId: formDataFromForm.customerId,
        customerName: customerName,
        date: formDataFromForm.date.toISOString(),
        status: formDataFromForm.status,
        orderState: formDataFromForm.orderState,
        lineItems: lineItems,
        subtotal: currentSubtotal,
        taxAmount: currentTaxAmount,
        total: currentTotal,
        payments: finalPayments,
        amountPaid: roundedTotalAmountPaid,
        balanceDue: roundedBalanceDue,
        poNumber: formDataFromForm.poNumber || '',
        distributor: formDataFromForm.distributor,
        notes: formDataFromForm.notes || '',
        expectedDeliveryDate: formDataFromForm.expectedDeliveryDate?.toISOString(),
        readyForPickUpDate: formDataFromForm.readyForPickUpDate?.toISOString(),
        pickedUpDate: formDataFromForm.pickedUpDate?.toISOString(),
    };
    
    onSave(orderPayload as Order);
    setOpen(false);
  };
  
  const handleSaveCustomerWrapper = (c: Omit<Customer, "id"> & { id?: string }) => {
    void onSaveCustomer(c as Customer).catch((err) => {
    });
  };

  const dialogTitle = order ? 'Edit Order' : (initialData ? 'Create New Order from Estimate' : 'New Order');
  const dialogDescription = order ? 'Update the details of this order.' : (initialData ? 'Review and confirm the details for this new order.' : 'Fill in the details for the new order.');

  return (
    <>
      <Dialog open={isOpen} onOpenChange={setOpen}>
        {triggerButton && <DialogTrigger asChild>{triggerButton}</DialogTrigger>}
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{dialogTitle}</DialogTitle>
            <DialogDescription>{dialogDescription}</DialogDescription>
          </DialogHeader>
          <OrderForm
            order={order}
            initialData={initialData}
            onSubmit={handleSubmit}
            onClose={() => setOpen(false)}
            customers={customers}
            products={products}
            vendors={vendors}
            productCategories={productCategories}
            productSubcategories={productSubcategories}
            onViewCustomer={(customer) => setCustomerToView(customer)}
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
