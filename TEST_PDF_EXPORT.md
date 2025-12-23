# Testing PDF Export with Logo

## Important: Clear Browser Cache First!

The PDF export code is cached by your browser. You **MUST** clear the cache to see the changes.

### How to Clear Cache and Hard Refresh

**Chrome/Edge (Windows/Linux):**
- Press `Ctrl + Shift + R` or `Ctrl + F5`

**Chrome/Edge (Mac):**
- Press `Cmd + Shift + R`

**Firefox (Windows/Linux):**
- Press `Ctrl + Shift + R` or `Ctrl + F5`

**Firefox (Mac):**
- Press `Cmd + Shift + R`

**Safari:**
- Press `Cmd + Option + R`

---

## What Was Fixed

All PDF export functions now support:
1. ✅ Company logo (automatic `gs://` to HTTPS conversion)
2. ✅ Multi-line address (addressLine1, addressLine2, city, state, zip)
3. ✅ Custom colors (header and table accents)
4. ✅ Custom font sizes
5. ✅ Disclaimers (estimates and invoices)

### Functions Updated:
- `exportEstimateToPDF` - ✅ Updated
- `exportOrderToPDF` - ✅ Updated
- `exportInvoiceToPDF` - ✅ Updated
- `exportPriceSheetToPDF` - ✅ Updated

---

## Testing Steps

### 1. Hard Refresh the Page
First, do a hard refresh (see commands above) to clear the cached JavaScript.

### 2. Test Estimate PDF Export
1. Go to **Estimates** page
2. Find any estimate
3. Click the **three dots menu** (⋮)
4. Click **Export PDF**
5. Check the PDF for:
   - ✅ Your logo at the top
   - ✅ "Delaware Fence Solutions" as company name
   - ✅ Full address (1111 Greenbank Road, Wilmington, DE 19808)
   - ✅ Phone, email, website
   - ✅ Estimate disclaimer at the bottom

### 3. Test Invoice PDF Export
1. Go to **Invoices** page
2. Find any invoice
3. Click the **three dots menu** (⋮)
4. Click **Export PDF**
5. Check the PDF for:
   - ✅ Your logo at the top
   - ✅ Company information
   - ✅ Invoice disclaimer at the bottom

### 4. Test Price Sheet PDF Export
1. Go to **Products** page
2. Click **Export Price Sheet PDF** button
3. Select categories to export
4. Click **Submit**
5. Check the PDF for:
   - ✅ Your logo at the top
   - ✅ Company information
   - ✅ Generated date
   - ✅ Products grouped by category

---

## Troubleshooting

### Logo Still Not Showing?

**Check Browser Console:**
1. Press `F12` to open Developer Tools
2. Click **Console** tab
3. Click "Export PDF" and watch for errors
4. Look for:
   - `Error loading logo:` - Logo URL issue
   - CORS errors - Firebase Storage permissions

**Verify Logo URL Conversion:**
The system should automatically convert:
```
FROM: gs://delfenceinvoice.firebasestorage.app/Logo.png
TO:   https://firebasestorage.googleapis.com/v0/b/delfenceinvoice.firebasestorage.app/o/Logo.png?alt=media
```

**Check Network Tab:**
1. In Developer Tools, click **Network** tab
2. Filter by **Img**
3. Click "Export PDF"
4. See if Logo.png is being requested
5. Click on it to see if it loads successfully

### Still Having Issues?

**Option 1: Update Logo URL Manually**

Update Firestore `companySettings/main` with HTTPS URL:
```json
{
  "logoUrl": "https://firebasestorage.googleapis.com/v0/b/delfenceinvoice.firebasestorage.app/o/Logo.png?alt=media"
}
```

**Option 2: Check Firebase Storage Rules**

Make sure Logo.png is publicly readable:
1. Go to Firebase Console → Storage
2. Click on `Logo.png`
3. Go to **Permissions** tab
4. Ensure public read access is enabled

**Option 3: Test Logo URL Directly**

Paste this URL in your browser:
```
https://firebasestorage.googleapis.com/v0/b/delfenceinvoice.firebasestorage.app/o/Logo.png?alt=media
```

If the logo image appears, the URL is working correctly.

---

## Expected Result

Your PDFs should now look like this:

```
┌─────────────────────────────────────┐
│   [YOUR LOGO IMAGE]                 │
│                                     │
│   Delaware Fence Solutions          │
│   1111 Greenbank Road               │
│   Wilmington, DE 19808              │
│   Phone: 302-610-8901               │
│   Email: Info@...                   │
│   Web: https://www...               │
│                                     │
│   ESTIMATE / INVOICE / PRICE SHEET  │
│   ...document content...            │
│                                     │
│   [Disclaimer text at bottom]       │
└─────────────────────────────────────┘
```

---

## Next: Customize Colors & Sizing

Once the logo is working, you can customize the PDF appearance by adding these fields to Firestore `companySettings/main`:

### Logo Size
```json
{
  "pdfShowLogo": true,
  "pdfLogoWidth": 50,    // Width in mm (try 40-60)
  "pdfLogoHeight": 25    // Height in mm (try 20-30)
}
```

### Colors (Brand Your PDFs)
```json
{
  "pdfHeaderColor": "#2d6a4f",  // Company name color (forest green)
  "pdfAccentColor": "#52b788",  // Table header color (light green)
  "pdfFontSize": 10              // Base font size
}
```

### Example: Professional Blue Theme
```json
{
  "pdfHeaderColor": "#1a73e8",
  "pdfAccentColor": "#4285f4",
  "pdfFontSize": 10
}
```

After adding these, do another hard refresh and test!
