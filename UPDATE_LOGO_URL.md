# Fix Logo URL for PDF Export

## Current Issue

Your `logoUrl` in company settings is:
```
gs://delfenceinvoice.firebasestorage.app/Logo.png
```

This is a Google Storage URI format that won't work in web browsers or PDF exports.

## Solution

Update the `logoUrl` field in Firestore to use the HTTPS format.

### Step 1: Get the Correct URL

**Option A - Via Firebase Console (Recommended)**
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `delfenceinvoice`
3. Click **Storage** in the left menu
4. Find your `Logo.png` file
5. Click on the file
6. Click the **Get download URL** button or copy the displayed URL
7. The URL should look like:
   ```
   https://firebasestorage.googleapis.com/v0/b/delfenceinvoice.firebasestorage.app/o/Logo.png?alt=media&token=YOUR_TOKEN_HERE
   ```

**Option B - Convert Manually**
If the file is publicly accessible, you can use this format:
```
https://firebasestorage.googleapis.com/v0/b/delfenceinvoice.firebasestorage.app/o/Logo.png?alt=media
```

### Step 2: Update Company Settings

1. Go to Firebase Console → Firestore Database
2. Navigate to: `companySettings` → `main`
3. Edit the `logoUrl` field
4. Replace with the HTTPS URL from Step 1
5. Click **Update**

### Step 3: (Optional) Add PDF Customization Settings

While you're editing, you can also add these optional fields for PDF customization:

```javascript
{
  // ... existing fields ...
  "logoUrl": "https://firebasestorage.googleapis.com/.../Logo.png?alt=media&token=...",

  // Optional PDF Settings
  "pdfShowLogo": true,           // Show logo in PDFs (default: true)
  "pdfLogoWidth": 50,            // Logo width in mm (default: 40)
  "pdfLogoHeight": 25,           // Logo height in mm (default: 20)
  "pdfHeaderColor": "#1a73e8",   // Company name color (hex)
  "pdfAccentColor": "#4285f4",   // Table header color (hex)
  "pdfFontSize": 10              // Base font size (default: 10)
}
```

### Recommended Settings for Delaware Fence Solutions

Based on your company, here are some professional color suggestions:

**Option 1: Professional Blue**
```javascript
{
  "pdfHeaderColor": "#1a73e8",  // Google Blue
  "pdfAccentColor": "#4285f4",  // Lighter Blue
  "pdfFontSize": 10
}
```

**Option 2: Forest Green (Fencing/Outdoor)**
```javascript
{
  "pdfHeaderColor": "#2d6a4f",  // Forest Green
  "pdfAccentColor": "#52b788",  // Lighter Green
  "pdfFontSize": 10
}
```

**Option 3: Professional Gray**
```javascript
{
  "pdfHeaderColor": "#2c3e50",  // Dark Blue-Gray
  "pdfAccentColor": "#34495e",  // Medium Gray
  "pdfFontSize": 10
}
```

## Testing

After updating:

1. Go to **Estimates**, **Invoices**, or **Products** page
2. Click **Export PDF**
3. Check that:
   - Your logo appears at the top
   - Company information is displayed correctly
   - Colors match your branding (if you set custom colors)

## Troubleshooting

### Logo Still Not Showing?

1. **Check URL accessibility**: Paste the URL in your browser - the image should display
2. **Check file permissions**: In Firebase Storage, make sure the file has public read access
3. **Clear browser cache**: Hard refresh (Ctrl+Shift+R or Cmd+Shift+R)
4. **Check browser console**: Look for CORS or loading errors

### Storage Rules for Public Access

If your logo isn't publicly accessible, update your Firebase Storage rules:

1. Go to Firebase Console → Storage → Rules
2. Add this rule to allow public read access to logos:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /Logo.png {
      allow read: if true;  // Public read access
    }
    // ... other rules
  }
}
```

## Need Help?

See the full [PDF_CUSTOMIZATION_GUIDE.md](PDF_CUSTOMIZATION_GUIDE.md) for detailed documentation.
