# PDF Export Customization Guide

## Overview

All PDF exports (Estimates, Orders, Invoices, Price Sheets) now support customizable layouts with logo support and branding options.

---

## Company Settings - PDF Options

You can customize your PDF exports by updating your company settings in Firebase at `companySettings/main`.

### Available PDF Settings

```typescript
{
  // Basic Company Info (already exists)
  companyName: string,
  addressLine1?: string,
  addressLine2?: string,
  city?: string,
  state?: string,
  zipCode?: string,
  phone?: string,
  email?: string,
  website?: string,
  logoUrl?: string,  // URL to your company logo

  // PDF Customization Options (NEW)
  pdfShowLogo?: boolean,        // Show/hide logo (default: true)
  pdfLogoWidth?: number,        // Logo width in mm (default: 40)
  pdfLogoHeight?: number,       // Logo height in mm (default: 20)
  pdfHeaderColor?: string,      // Hex color for company name (#000000)
  pdfAccentColor?: string,      // Hex color for table headers (#424242)
  pdfFontSize?: number,         // Base font size (default: 10)
  pdfLayout?: 'standard' | 'compact' | 'detailed',  // Layout style

  // Disclaimers
  estimateDisclaimer?: string,  // Footer text for estimates
  invoiceDisclaimer?: string,   // Footer text for invoices
}
```

---

## How to Configure PDF Settings

### Option 1: Via Firebase Console

1. Go to Firebase Console → Firestore Database
2. Navigate to `companySettings` collection
3. Edit the `main` document
4. Add the PDF customization fields

### Option 2: Via Settings Page (if you have one)

Add these fields to your company settings form:

```typescript
// Logo Settings
<FormField label="Logo URL">
  <Input
    name="logoUrl"
    placeholder="https://yourdomain.com/logo.png"
  />
</FormField>

<FormField label="Show Logo in PDFs">
  <Switch name="pdfShowLogo" defaultChecked={true} />
</FormField>

<FormField label="Logo Width (mm)">
  <Input
    type="number"
    name="pdfLogoWidth"
    defaultValue={40}
  />
</FormField>

<FormField label="Logo Height (mm)">
  <Input
    type="number"
    name="pdfLogoHeight"
    defaultValue={20}
  />
</FormField>

// Color Settings
<FormField label="Header Text Color">
  <Input
    type="color"
    name="pdfHeaderColor"
    defaultValue="#000000"
  />
</FormField>

<FormField label="Table Header Color">
  <Input
    type="color"
    name="pdfAccentColor"
    defaultValue="#424242"
  />
</FormField>

// Font Settings
<FormField label="Base Font Size">
  <Input
    type="number"
    name="pdfFontSize"
    defaultValue={10}
    min={8}
    max={14}
  />
</FormField>
```

---

## Logo Requirements

### Supported Formats
- PNG (recommended, supports transparency)
- JPG/JPEG
- GIF

### Best Practices
1. **Use transparent PNGs** for best results
2. **Recommended dimensions**: 400x200px (2:1 ratio)
3. **File size**: Keep under 200KB for fast loading
4. **Hosting**:
   - Firebase Storage (recommended)
   - Your own CDN
   - Any publicly accessible URL

### Example Logo URLs

```typescript
// Firebase Storage
logoUrl: "https://firebasestorage.googleapis.com/v0/b/your-project.appspot.com/o/logos%2Fcompany-logo.png?alt=media"

// External CDN
logoUrl: "https://cdn.yourdomain.com/logo.png"

// Your website
logoUrl: "https://www.yourdomain.com/assets/logo.png"
```

---

## Color Customization

### Header Color
Controls the color of your company name in PDFs.

```typescript
pdfHeaderColor: "#1a73e8"  // Google Blue
pdfHeaderColor: "#e74c3c"  // Red
pdfHeaderColor: "#2c3e50"  // Dark Blue-Gray
```

### Accent Color
Controls table headers and important accents throughout the PDF.

```typescript
pdfAccentColor: "#4caf50"  // Green
pdfAccentColor: "#ff9800"  // Orange
pdfAccentColor: "#9c27b0"  // Purple
```

### Color Picker Tips
- Use web-safe colors for consistent printing
- Ensure good contrast with white backgrounds
- Test colors in print preview before finalizing

---

## Font Size Customization

The `pdfFontSize` setting controls the base font size. All other text scales proportionally:

```typescript
pdfFontSize: 8   // Very compact (good for dense price sheets)
pdfFontSize: 10  // Standard (default, most readable)
pdfFontSize: 12  // Large (good for easier reading)
pdfFontSize: 14  // Extra large (good for presentations)
```

**Font Size Mapping:**
- Base text: `pdfFontSize`
- Company name: `pdfFontSize * 2`
- Document title: `pdfFontSize + 8`
- Category headers: `pdfFontSize + 4`
- Table text: `pdfFontSize - 1`
- Disclaimer: `pdfFontSize - 1`

---

## Layout Options

### Standard (Default)
- Balanced spacing
- Clear section separation
- Best for most use cases

### Compact (Coming Soon)
- Reduced spacing
- More content per page
- Good for long price sheets

### Detailed (Coming Soon)
- Extra spacing
- Larger headers
- Good for presentations

---

## Example Configurations

### Configuration 1: Professional Blue
```json
{
  "companyName": "Delaware Fence Pro",
  "logoUrl": "https://firebasestorage.googleapis.com/.../logo.png",
  "pdfShowLogo": true,
  "pdfLogoWidth": 50,
  "pdfLogoHeight": 25,
  "pdfHeaderColor": "#1a73e8",
  "pdfAccentColor": "#4285f4",
  "pdfFontSize": 10,
  "estimateDisclaimer": "This estimate is valid for 30 days. Prices subject to change without notice."
}
```

### Configuration 2: Bold & Modern
```json
{
  "companyName": "Your Company",
  "logoUrl": "https://yourdomain.com/logo.png",
  "pdfShowLogo": true,
  "pdfLogoWidth": 40,
  "pdfLogoHeight": 40,
  "pdfHeaderColor": "#e74c3c",
  "pdfAccentColor": "#c0392b",
  "pdfFontSize": 11
}
```

### Configuration 3: Minimalist
```json
{
  "companyName": "Your Company",
  "pdfShowLogo": false,
  "pdfHeaderColor": "#2c3e50",
  "pdfAccentColor": "#34495e",
  "pdfFontSize": 9
}
```

---

## Technical Implementation

### How Logo Loading Works

1. When PDF export is triggered, the system checks for `logoUrl`
2. If `pdfShowLogo !== false` and `logoUrl` exists:
   - Logo is loaded asynchronously
   - Image is embedded into PDF
   - If loading fails, PDF continues without logo
3. Company header layout adjusts automatically based on logo presence

### CORS Requirements

For external logo URLs, ensure your server/CDN sends proper CORS headers:

```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET
```

Firebase Storage automatically handles CORS correctly.

---

## Troubleshooting

### Logo Not Appearing

**Problem**: Logo URL is set but doesn't show in PDF

**Solutions**:
1. Check `pdfShowLogo` is not set to `false`
2. Verify URL is publicly accessible
3. Check browser console for CORS errors
4. Ensure image format is PNG, JPG, or GIF
5. Try a smaller image (under 200KB)

### Logo Size Issues

**Problem**: Logo appears too large or too small

**Solutions**:
1. Adjust `pdfLogoWidth` (try 30-60mm)
2. Adjust `pdfLogoHeight` (try 15-30mm)
3. Maintain aspect ratio (width:height = 2:1 works best)

### Colors Not Applying

**Problem**: Custom colors don't appear in PDF

**Solutions**:
1. Ensure hex format includes `#` (e.g., `#1a73e8`)
2. Use 6-character hex codes (no abbreviations)
3. Clear browser cache and regenerate PDF

### Font Size Too Small/Large

**Problem**: Text is hard to read

**Solutions**:
1. Keep `pdfFontSize` between 8-14
2. Test with actual documents before committing
3. Consider your audience (older customers may need larger fonts)

---

## Best Practices

### 1. Brand Consistency
- Use your brand colors consistently
- Match PDF styling to your website/marketing materials
- Keep logo consistent across all documents

### 2. Readability
- Ensure good contrast (dark text on light background)
- Don't go below font size 8
- Test print quality before finalizing

### 3. Professional Appearance
- Use high-quality logos
- Keep disclaimers concise and professional
- Maintain consistent spacing

### 4. Performance
- Optimize logo file size (under 200KB)
- Use CDN for faster loading
- Consider caching for frequently accessed logos

---

## Future Enhancements

Planned features for future releases:

- [ ] Multiple layout templates
- [ ] Custom footer text
- [ ] Watermarks for drafts
- [ ] Multi-page headers
- [ ] Custom margins
- [ ] Page numbering styles
- [ ] Digital signatures
- [ ] QR codes for payment/tracking

---

## Need Help?

If you encounter issues or need custom PDF layouts, check:
1. Browser console for error messages
2. Firebase logs for image loading issues
3. PDF preview before downloading
4. Documentation at `/help` or contact support
