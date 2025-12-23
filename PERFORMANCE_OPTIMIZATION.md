# Performance Optimization Guide

Based on your Vercel analytics, here's how to improve from RES 85 to 90+

## Current Issues:

- **Largest Contentful Paint (LCP)**: 2.48s (should be <2.5s) ⚠️
- **Interaction to Next Paint (INP)**: 456ms (should be <200ms) ❌
- **Problem Pages**: /login (44), /estimates (39), /invoices (85)

---

## 🎯 Priority Fixes

### 1. Reduce JavaScript Bundle Size (INP: 456ms → <200ms)

#### A. Enable Code Splitting

**File**: `next.config.js` or `next.config.mjs`

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable SWC minification
  swcMinify: true,

  // Optimize bundle
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },

  // Optimize images
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    minimumCacheTTL: 60,
  },

  // Enable experimental features
  experimental: {
    optimizeCss: true,
  },
}

module.exports = nextConfig
```

#### B. Lazy Load Heavy Components

**For Charts (Recharts)**:

```tsx
// Instead of:
import { LineChart, BarChart } from 'recharts';

// Use dynamic import:
import dynamic from 'next/dynamic';

const LineChart = dynamic(() => import('recharts').then(mod => mod.LineChart), {
  ssr: false,
  loading: () => <div className="h-64 bg-muted animate-pulse rounded" />
});

const BarChart = dynamic(() => import('recharts').then(mod => mod.BarChart), {
  ssr: false,
  loading: () => <div className="h-64 bg-muted animate-pulse rounded" />
});
```

**For PDF Export**:

```tsx
// In your components that use PDF export
import dynamic from 'next/dynamic';

const PDFExportButton = dynamic(() =>
  import('@/components/pdf-export-button').then(mod => mod.PDFExportButton),
  { ssr: false }
);
```

**For Excel Import/Export**:

```tsx
const ExcelImportExport = dynamic(() =>
  import('@/components/products/excel-import-export').then(mod => mod.ExcelImportExport),
  { ssr: false }
);
```

---

### 2. Optimize Firebase Queries (Reduce Loading Time)

#### A. Add Indexes

Create composite indexes in Firebase Console for common queries:

```
Collection: invoices
Fields: customerId (Ascending), date (Descending)

Collection: orders
Fields: status (Ascending), date (Descending)

Collection: products
Fields: category (Ascending), name (Ascending)
```

#### B. Limit Initial Data Load

**File**: `/src/app/(app)/invoices/page.tsx` (and similar pages)

```tsx
// Instead of loading ALL invoices:
const unsubscribe = onSnapshot(collection(db, 'invoices'), ...);

// Load recent invoices first:
const recentInvoicesQuery = query(
  collection(db, 'invoices'),
  orderBy('date', 'desc'),
  limit(50) // Load only 50 most recent
);

const unsubscribe = onSnapshot(recentInvoicesQuery, ...);

// Add "Load More" button for older invoices
```

#### C. Use Pagination

```tsx
const [lastVisible, setLastVisible] = useState(null);
const [invoices, setInvoices] = useState([]);

const loadMore = async () => {
  const q = query(
    collection(db, 'invoices'),
    orderBy('date', 'desc'),
    startAfter(lastVisible),
    limit(25)
  );

  const snapshot = await getDocs(q);
  setLastVisible(snapshot.docs[snapshot.docs.length - 1]);
  setInvoices([...invoices, ...snapshot.docs.map(doc => ({...doc.data(), id: doc.id}))]);
};
```

---

### 3. Optimize Login Page (RES: 44 → 90+)

**File**: `/src/app/login/page.tsx`

#### Issues & Fixes:

```tsx
"use client";

import dynamic from 'next/dynamic';
import { Suspense } from 'react';

// Lazy load Firebase auth UI (heavy component)
const FirebaseAuthUI = dynamic(() => import('@/components/auth/firebase-ui'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
    </div>
  )
});

export default function LoginPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <div className="min-h-screen flex items-center justify-center">
        <FirebaseAuthUI />
      </div>
    </Suspense>
  );
}
```

---

### 4. Optimize Estimates Page (RES: 39 → 90+)

**File**: `/src/app/(app)/estimates/page.tsx`

#### A. Defer Heavy Operations

```tsx
import { useState, useEffect, useTransition } from 'react';

export default function EstimatesPage() {
  const [isPending, startTransition] = useTransition();
  const [estimates, setEstimates] = useState([]);

  useEffect(() => {
    if (!db) return;

    // Use startTransition for non-urgent updates
    const unsubscribe = onSnapshot(
      collection(db, 'estimates'),
      (snapshot) => {
        startTransition(() => {
          const items = snapshot.docs.map(doc => ({...doc.data(), id: doc.id}));
          setEstimates(items);
        });
      }
    );

    return () => unsubscribe();
  }, [db]);

  // Show loading state while transitioning
  if (isPending) {
    return <TableSkeleton />;
  }

  return (
    // Your existing JSX
  );
}
```

#### B. Virtualize Long Lists

For pages with 100+ items, use react-window:

```bash
npm install react-window
```

```tsx
import { FixedSizeList } from 'react-window';

function EstimatesList({ estimates }) {
  const Row = ({ index, style }) => (
    <div style={style}>
      {/* Your estimate row JSX */}
      {estimates[index].estimateNumber}
    </div>
  );

  return (
    <FixedSizeList
      height={600}
      itemCount={estimates.length}
      itemSize={50}
      width="100%"
    >
      {Row}
    </FixedSizeList>
  );
}
```

---

### 5. Optimize Images & Assets

#### A. Compress Images

Use Next.js Image with optimization:

```tsx
import Image from 'next/image';

// Company logo in header
<Image
  src={companySettings?.logoUrl || '/logo.png'}
  alt="Company Logo"
  width={150}
  height={50}
  priority // For above-the-fold images
  quality={85} // Reduce from default 100
/>

// Product images
<Image
  src={product.imageUrl}
  alt={product.name}
  width={100}
  height={100}
  loading="lazy" // Lazy load below-the-fold images
  placeholder="blur"
  blurDataURL="data:image/png;base64,..." // Add blur placeholder
/>
```

#### B. Add Font Optimization

**File**: `/src/app/layout.tsx`

```tsx
import { Inter } from 'next/font/google';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap', // Prevents layout shift
  preload: true,
});

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={inter.className}>
      {children}
    </html>
  );
}
```

---

### 6. Reduce Cumulative Layout Shift (CLS: 0.01)

#### A. Reserve Space for Dynamic Content

```tsx
// For loading states
{isLoading ? (
  <div className="h-96 w-full" /> // Reserve exact height
) : (
  <YourContent />
)}

// For images
<div className="relative w-full h-64"> {/* Fixed container */}
  <Image
    src={src}
    alt={alt}
    fill
    className="object-cover"
  />
</div>
```

#### B. Avoid Layout Shifts in Dialogs

```tsx
// Pre-render dialog structure
<Dialog>
  <DialogContent className="min-h-[400px]"> {/* Fixed min height */}
    {/* Content */}
  </DialogContent>
</Dialog>
```

---

### 7. Enable Caching

#### A. Add Cache Headers

**File**: `next.config.js`

```javascript
const nextConfig = {
  async headers() {
    return [
      {
        source: '/:all*(svg|jpg|png|webp|avif)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
};
```

#### B. Use React Query for Data Caching

```bash
npm install @tanstack/react-query
```

```tsx
import { useQuery } from '@tanstack/react-query';

function useEstimates() {
  return useQuery({
    queryKey: ['estimates'],
    queryFn: async () => {
      const snapshot = await getDocs(collection(db, 'estimates'));
      return snapshot.docs.map(doc => ({...doc.data(), id: doc.id}));
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
  });
}
```

---

### 8. Optimize Third-Party Scripts

#### A. Defer Non-Critical Scripts

```tsx
import Script from 'next/script';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}

        {/* Load analytics after page interactive */}
        <Script
          src="https://www.googletagmanager.com/gtag/js"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}
```

---

## 📊 Implementation Priority

### Week 1 (Quick Wins):
1. ✅ Add lazy loading to heavy components (PDF, Excel, Charts)
2. ✅ Limit Firebase queries to 50 items
3. ✅ Optimize images with Next/Image
4. ✅ Add loading skeletons

### Week 2 (Medium Impact):
1. ✅ Add pagination to long lists
2. ✅ Create Firebase indexes
3. ✅ Implement React Query caching
4. ✅ Optimize fonts

### Week 3 (Polish):
1. ✅ Add virtualization for 100+ item lists
2. ✅ Set up proper cache headers
3. ✅ Add blur placeholders to images
4. ✅ Optimize login page

---

## 🎯 Expected Results

After implementing these optimizations:

| Metric | Current | Target | Impact |
|--------|---------|--------|--------|
| RES | 85 | 95+ | +10 points |
| LCP | 2.48s | <1.5s | 40% faster |
| INP | 456ms | <150ms | 67% faster |
| FCP | 1.55s | <1.0s | 35% faster |

---

## 🔧 Quick Start Commands

```bash
# Install performance packages
npm install react-window @tanstack/react-query

# Build and analyze bundle
npm run build
npx @next/bundle-analyzer

# Check lighthouse score
npx lighthouse https://www.delfenceinvoice.com --view

# Monitor in development
npm run dev -- --turbo
```

---

## 📝 Code Templates

### Loading Skeleton Component

Create `/src/components/ui/skeleton.tsx`:

```tsx
import { cn } from "@/lib/utils"

export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-muted", className)}
      {...props}
    />
  )
}

// Usage:
export function TableSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-12 w-full" />
    </div>
  );
}
```

### Lazy Load Template

```tsx
import dynamic from 'next/dynamic';

const HeavyComponent = dynamic(
  () => import('./HeavyComponent'),
  {
    ssr: false,
    loading: () => <Skeleton className="h-64 w-full" />
  }
);
```

---

## 🚦 Testing Performance

After each change:

1. **Local Testing**:
```bash
npm run build
npm run start
# Test at http://localhost:3000
```

2. **Lighthouse**:
```bash
npx lighthouse http://localhost:3000/invoices --view
```

3. **Deploy to Vercel**:
```bash
git add .
git commit -m "Performance: lazy load heavy components"
git push
```

4. **Check Vercel Analytics** (wait 24 hours for data)

---

## 🎁 Bonus: Progressive Web App (PWA)

Make your app installable:

```bash
npm install next-pwa
```

**File**: `next.config.js`

```javascript
const withPWA = require('next-pwa')({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
});

module.exports = withPWA({
  // your existing config
});
```

This will improve mobile experience and allow users to install your app!

---

Start with the quick wins (Week 1) and you should see immediate improvement in your RES score!
