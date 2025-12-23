# Ready-to-Use Code Snippets

Copy and paste these snippets directly into your files.

---

## 1. Estimates Page - Add PDF & Email

### Step 1: Add imports at the top of `/src/app/(app)/estimates/page.tsx`

```typescript
import { PDFExportButton } from '@/components/pdf-export-button';
import { EmailDocumentDialog } from '@/components/email-document-dialog';
import type { CompanySettings } from '@/types';
```

### Step 2: Add state for company settings (inside your component)

```typescript
const [companySettings, setCompanySettings] = useState<CompanySettings | null>(null);
```

### Step 3: Add to your existing useEffect (or create new one)

```typescript
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

### Step 4: Add to your table actions (where you have Edit/Delete buttons)

```tsx
{/* PDF Export Button */}
<PDFExportButton
  document={estimate}
  type="estimate"
  companySettings={companySettings}
  variant="ghost"
  size="sm"
/>

{/* Email Button */}
<EmailDocumentDialog
  document={estimate}
  type="estimate"
  customerEmail={customers.find(c => c.id === estimate.customerId)?.email || ''}
  triggerButton={
    <Button variant="ghost" size="sm">
      <Icon name="Mail" className="h-4 w-4" />
    </Button>
  }
/>
```

---

## 2. Orders Page - Add PDF & Email

### Add to `/src/app/(app)/orders/page.tsx`

```typescript
// Imports (at top)
import { PDFExportButton } from '@/components/pdf-export-button';
import { EmailDocumentDialog } from '@/components/email-document-dialog';
import type { CompanySettings } from '@/types';

// State (inside component)
const [companySettings, setCompanySettings] = useState<CompanySettings | null>(null);

// useEffect (add to existing or create new)
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

// Table actions (where Edit/Delete buttons are)
<PDFExportButton
  document={order}
  type="order"
  companySettings={companySettings}
  variant="ghost"
  size="sm"
/>

<EmailDocumentDialog
  document={order}
  type="order"
  customerEmail={customers.find(c => c.id === order.customerId)?.email || ''}
  triggerButton={
    <Button variant="ghost" size="sm">
      <Icon name="Mail" className="h-4 w-4" />
    </Button>
  }
/>
```

---

## 3. Invoices Page - Add PDF & Email

### Add to `/src/app/(app)/invoices/page.tsx`

```typescript
// Imports (at top)
import { PDFExportButton } from '@/components/pdf-export-button';
import { EmailDocumentDialog } from '@/components/email-document-dialog';
import type { CompanySettings } from '@/types';

// State (inside component)
const [companySettings, setCompanySettings] = useState<CompanySettings | null>(null);

// useEffect (add to existing or create new)
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

// Table actions (where Edit/Delete buttons are)
<PDFExportButton
  document={invoice}
  type="invoice"
  companySettings={companySettings}
  variant="ghost"
  size="sm"
/>

<EmailDocumentDialog
  document={invoice}
  type="invoice"
  customerEmail={customers.find(c => c.id === invoice.customerId)?.email || ''}
  triggerButton={
    <Button variant="ghost" size="sm">
      <Icon name="Mail" className="h-4 w-4" />
    </Button>
  }
/>
```

---

## 4. Products Page - Add Price History Tracking

### Update `/src/app/(app)/products/page.tsx`

### Step 1: Add imports at the top

```typescript
import { recordPriceChange } from '@/lib/price-history';
import { useAuth } from '@/contexts/auth-context';
```

### Step 2: Get current user (inside component)

```typescript
const { user } = useAuth();
```

### Step 3: Replace your existing `handleSaveProduct` function

```typescript
const handleSaveProduct = async (productToSave: Omit<Product, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) => {
  if (!db) return;
  const { id, ...productData } = productToSave;

  // Clean undefined values - Firestore doesn't accept undefined
  const cleanedData = Object.entries(productData).reduce((acc, [key, value]) => {
    if (value !== undefined) {
      acc[key] = value;
    }
    return acc;
  }, {} as any);

  try {
    if (id) {
      // Get old product BEFORE updating
      const oldProduct = products.find(p => p.id === id) || null;

      const docRef = doc(db, 'products', id);
      await setDoc(docRef, cleanedData, { merge: true });

      // Track price change
      await recordPriceChange(
        db,
        oldProduct,
        { ...cleanedData, id } as Product,
        user?.email,
        undefined
      );

      toast({ title: "Product Updated", description: `Updated details for ${cleanedData.name}.` });
    } else {
      const docRef = await addDoc(collection(db, 'products'), cleanedData);

      // Track initial price
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

---

## 5. Product Table - Add Price History Button

### Update `/src/components/products/product-table.tsx`

### Add import at top

```typescript
import { PriceHistoryDialog } from '@/components/products/price-history-dialog';
```

### Add to your product actions (where Edit/Delete buttons are)

```tsx
<PriceHistoryDialog
  productId={product.id}
  productName={product.name}
  triggerButton={
    <Button variant="ghost" size="icon">
      <Icon name="History" className="h-4 w-4" />
    </Button>
  }
/>
```

---

## 6. Pricing Review Page - Add Price History

### Already created at `/src/app/(app)/pricing-review/page.tsx`

### Add import at top

```typescript
import { PriceHistoryDialog } from '@/components/products/price-history-dialog';
```

### Find the Actions column in your table and add

```tsx
<TableCell className="text-right">
  <div className="flex gap-2 justify-end">
    {/* Price History */}
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

    {/* Existing Edit button */}
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
```

---

## 7. Email Configuration

### Update `.env` file

```env
# Email Configuration (Resend.com)
# Get your API key from: https://resend.com/api-keys
RESEND_API_KEY=re_your_actual_key_here
FROM_EMAIL=noreply@yourdomain.com
```

### Steps to get Resend API key:
1. Go to https://resend.com
2. Sign up (free tier includes 3,000 emails/month)
3. Go to API Keys section
4. Create a new API key
5. Copy it to your `.env` file
6. Restart your dev server

---

## 8. Mobile Build Commands

### Build for iOS (requires Mac + Xcode)

```bash
npm run mobile:ios
```

This will:
1. Build your Next.js app
2. Export static files
3. Sync with Capacitor
4. Open Xcode

### Build for Android (requires Android Studio)

```bash
npm run mobile:android
```

This will:
1. Build your Next.js app
2. Export static files
3. Sync with Capacitor
4. Open Android Studio

---

## Quick Test Checklist

### Test PDF Export:
1. Go to Estimates/Orders/Invoices page
2. Click the PDF button on any document
3. Check that PDF downloads with correct data

### Test Email:
1. Make sure `.env` has valid Resend API key
2. Restart dev server: `npm run dev`
3. Go to Estimates/Orders/Invoices page
4. Click Email button
5. Enter recipient email
6. Click Send
7. Check recipient inbox

### Test Price History:
1. Go to Products page
2. Edit a product and change price/cost
3. Save the product
4. Click the History button
5. Verify the change is recorded

### Test Global Search:
1. Press `Cmd+K` or `Ctrl+K`
2. Type a customer name, product name, or order number
3. Click a result to navigate

---

## Common Issues & Solutions

### PDF Export not working:
- Make sure `companySettings` is loaded
- Check console for errors
- Verify `jspdf` is installed: `npm list jspdf`

### Email not sending:
- Check `.env` has `RESEND_API_KEY` set
- Restart dev server after updating `.env`
- Check console for API errors
- Verify Resend account is active

### Price history not tracking:
- Make sure you're using the updated `handleSaveProduct` function
- Check Firebase console for `priceHistory` collection
- Verify user is authenticated (needs `user.email`)

### Mobile build fails:
- iOS: Make sure Xcode is installed (Mac only)
- Android: Make sure Android Studio is installed
- Run `npm run build` first to check for build errors
- Check `capacitor.config.ts` is correct

---

## Next Steps

1. **Start with Estimates page** - Add PDF & Email buttons
2. **Test the features** - Make sure they work
3. **Copy to Orders & Invoices** - Same code, different type
4. **Add Price History** - Update products page
5. **Set up Email** - Get Resend API key
6. **Try Mobile** - If you want iOS/Android apps

Each feature is independent, so you can add them one at a time!
