# Feature Integration Guide

This guide shows exactly where to add each new feature to your existing pages.

---

## 1. Global Search

### ✅ Already Integrated!
The global search is already active in the header on every page. Users can:
- Click the search box in the header
- Press `Cmd+K` (Mac) or `Ctrl+K` (Windows) from anywhere

**No additional integration needed!**

---

## 2. PDF Export

### A. Estimates Page

**File**: `/src/app/(app)/estimates/page.tsx`

Add the PDF export button to the EstimateDialog or the estimates table actions.

#### Option 1: Add to Estimate Dialog
```tsx
// At the top of the file, add import
import { PDFExportButton } from '@/components/pdf-export-button';

// Find the EstimateDialog component usage and add PDF button to actions
// Look for where you have Edit/Delete buttons and add:
<PDFExportButton
  document={estimate}
  type="estimate"
  companySettings={companySettings}
  variant="ghost"
  size="sm"
/>
```

#### Option 2: Add to Table Actions
Find the table row actions (usually with Edit/Delete buttons) and add:
```tsx
<PDFExportButton
  document={estimate}
  type="estimate"
  companySettings={companySettings}
  variant="ghost"
  size="sm"
/>
```

**Note**: You'll need to pass `companySettings` from the parent component. Add this to your state:
```tsx
const [companySettings, setCompanySettings] = useState<CompanySettings | null>(null);

// In useEffect, fetch company settings:
useEffect(() => {
  if (!db) return;
  const fetchSettings = async () => {
    const docRef = doc(db, 'companySettings', 'main');
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      setCompanySettings(docSnap.data() as CompanySettings);
    }
  };
  fetchSettings();
}, [db]);
```

### B. Orders Page

**File**: `/src/app/(app)/orders/page.tsx`

Same pattern as estimates:
```tsx
// Add import
import { PDFExportButton } from '@/components/pdf-export-button';

// Add to table actions or dialog
<PDFExportButton
  document={order}
  type="order"
  companySettings={companySettings}
  variant="ghost"
  size="sm"
/>
```

### C. Invoices Page

**File**: `/src/app/(app)/invoices/page.tsx`

```tsx
// Add import
import { PDFExportButton } from '@/components/pdf-export-button';

// Add to table actions or dialog
<PDFExportButton
  document={invoice}
  type="invoice"
  companySettings={companySettings}
  variant="ghost"
  size="sm"
/>
```

---

## 3. Email Integration

### Setup First!
1. Go to [resend.com](https://resend.com) and sign up
2. Get your API key
3. Update `.env`:
```env
RESEND_API_KEY=re_your_actual_api_key_here
FROM_EMAIL=noreply@yourdomain.com
```

### A. Estimates Page

**File**: `/src/app/(app)/estimates/page.tsx`

```tsx
// Add import
import { EmailDocumentDialog } from '@/components/email-document-dialog';

// In your component, you'll need customer email. If you have customers loaded:
const customer = customers.find(c => c.id === estimate.customerId);

// Add email button alongside PDF export:
<EmailDocumentDialog
  document={estimate}
  type="estimate"
  customerEmail={customer?.email || ''}
  triggerButton={
    <Button variant="ghost" size="sm">
      <Icon name="Mail" className="mr-2 h-4 w-4" />
      Email
    </Button>
  }
/>
```

### B. Orders Page

**File**: `/src/app/(app)/orders/page.tsx`

```tsx
// Add import
import { EmailDocumentDialog } from '@/components/email-document-dialog';

// Add email dialog
const customer = customers.find(c => c.id === order.customerId);

<EmailDocumentDialog
  document={order}
  type="order"
  customerEmail={customer?.email || ''}
  triggerButton={
    <Button variant="ghost" size="sm">
      <Icon name="Mail" className="mr-2 h-4 w-4" />
      Email
    </Button>
  }
/>
```

### C. Invoices Page

**File**: `/src/app/(app)/invoices/page.tsx`

```tsx
// Add import
import { EmailDocumentDialog } from '@/components/email-document-dialog';

// Add email dialog
const customer = customers.find(c => c.id === invoice.customerId);

<EmailDocumentDialog
  document={invoice}
  type="invoice"
  customerEmail={customer?.email || ''}
  triggerButton={
    <Button variant="ghost" size="sm">
      <Icon name="Mail" className="mr-2 h-4 w-4" />
      Email
    </Button>
  }
/>
```

---

## 4. Price History Tracking

### A. Add Tracking to Product Save

**File**: `/src/app/(app)/products/page.tsx`

Update the `handleSaveProduct` function:

```tsx
// Add import at top
import { recordPriceChange } from '@/lib/price-history';
import { useAuth } from '@/contexts/auth-context';

// In your component
const { user } = useAuth();

// Update handleSaveProduct function
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
      // Get old product data BEFORE updating
      const oldProduct = products.find(p => p.id === id) || null;

      const docRef = doc(db, 'products', id);
      await setDoc(docRef, cleanedData, { merge: true });

      // Record price history AFTER update
      await recordPriceChange(
        db,
        oldProduct,
        { ...cleanedData, id } as Product,
        user?.email,
        undefined // Optional: add a reason field to your product form
      );

      toast({ title: "Product Updated", description: `Updated details for ${cleanedData.name}.` });
    } else {
      const docRef = await addDoc(collection(db, 'products'), cleanedData);

      // Record initial price for new products
      await recordPriceChange(
        db,
        null,
        { ...cleanedData, id: docRef.id } as Product,
        user?.email,
        "Initial product creation"
      );

      toast({ title: "Product Added", description: `${cleanedData.name} has been added.` });
    }
  } catch (error: any) {
    console.error('Error saving product:', error);
    toast({ title: "Error", description: `Could not save product details. ${error?.message || ''}`, variant: "destructive" });
  }
};
```

### B. Add View History Button to Product Table

**File**: `/src/components/products/product-table.tsx`

```tsx
// Add import
import { PriceHistoryDialog } from '@/components/products/price-history-dialog';

// In the actions column of your table, add:
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
```

### C. Add to Pricing Review Page

**File**: `/src/app/(app)/pricing-review/page.tsx`

In the actions column of the pricing review table, add:

```tsx
// Add import
import { PriceHistoryDialog } from '@/components/products/price-history-dialog';

// In the TableCell with actions:
<TableCell className="text-right space-x-2">
  <PriceHistoryDialog
    productId={product.id}
    productName={product.name}
    triggerButton={
      <Button variant="ghost" size="sm">
        <Icon name="History" className="h-4 w-4" />
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
</TableCell>
```

---

## Complete Integration Example

Here's a complete example for the **Estimates Page** with all features:

```tsx
"use client";

import React, { useState, useEffect } from 'react';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/icons';
import { useToast } from "@/hooks/use-toast";
import { useFirebase } from '@/components/firebase-provider';
import { collection, onSnapshot, doc, getDoc } from 'firebase/firestore';
import type { Estimate, Customer, CompanySettings } from '@/types';

// NEW IMPORTS
import { PDFExportButton } from '@/components/pdf-export-button';
import { EmailDocumentDialog } from '@/components/email-document-dialog';

export default function EstimatesPage() {
  const { db } = useFirebase();
  const { toast } = useToast();

  const [estimates, setEstimates] = useState<Estimate[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [companySettings, setCompanySettings] = useState<CompanySettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch estimates, customers, and company settings
  useEffect(() => {
    if (!db) return;

    const unsubscribes: (() => void)[] = [];

    // Fetch estimates
    unsubscribes.push(
      onSnapshot(collection(db, 'estimates'), (snapshot) => {
        const items = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Estimate));
        setEstimates(items);
        setIsLoading(false);
      })
    );

    // Fetch customers
    unsubscribes.push(
      onSnapshot(collection(db, 'customers'), (snapshot) => {
        const items = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Customer));
        setCustomers(items);
      })
    );

    // Fetch company settings
    const fetchSettings = async () => {
      const docRef = doc(db, 'companySettings', 'main');
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setCompanySettings(docSnap.data() as CompanySettings);
      }
    };
    fetchSettings();

    return () => unsubscribes.forEach(unsub => unsub());
  }, [db]);

  return (
    <>
      <PageHeader title="Estimates" description="Manage your estimates">
        {/* Your existing buttons */}
      </PageHeader>

      {/* Your estimates table */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Estimate #</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Total</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {estimates.map((estimate) => {
            const customer = customers.find(c => c.id === estimate.customerId);

            return (
              <TableRow key={estimate.id}>
                <TableCell>{estimate.estimateNumber}</TableCell>
                <TableCell>{estimate.customerName}</TableCell>
                <TableCell>{new Date(estimate.date).toLocaleDateString()}</TableCell>
                <TableCell>${estimate.total.toFixed(2)}</TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    {/* Existing buttons (Edit, Delete, etc.) */}

                    {/* NEW: PDF Export */}
                    <PDFExportButton
                      document={estimate}
                      type="estimate"
                      companySettings={companySettings}
                      variant="ghost"
                      size="sm"
                    />

                    {/* NEW: Email */}
                    <EmailDocumentDialog
                      document={estimate}
                      type="estimate"
                      customerEmail={customer?.email || ''}
                      triggerButton={
                        <Button variant="ghost" size="sm">
                          <Icon name="Mail" className="h-4 w-4" />
                        </Button>
                      }
                    />
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </>
  );
}
```

---

## Quick Checklist

### For Each Document Type (Estimates, Orders, Invoices):

- [ ] Import `PDFExportButton` component
- [ ] Import `EmailDocumentDialog` component
- [ ] Fetch `companySettings` in useEffect
- [ ] Fetch `customers` array (if not already loaded)
- [ ] Add PDF button to table actions
- [ ] Add Email dialog to table actions

### For Products:

- [ ] Import `recordPriceChange` from `@/lib/price-history`
- [ ] Import `useAuth` to get current user
- [ ] Update `handleSaveProduct` to track changes
- [ ] Import `PriceHistoryDialog` component
- [ ] Add history button to product table/pricing review

### For Mobile:

- [ ] Install Xcode (Mac) or Android Studio
- [ ] Run `npm run mobile:ios` or `npm run mobile:android`
- [ ] Configure signing certificates in Xcode/Android Studio

---

## Need Help?

If you run into any issues integrating these features, let me know which page you're working on and I can provide more specific code!
