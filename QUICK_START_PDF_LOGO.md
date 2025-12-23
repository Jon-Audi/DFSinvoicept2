# Quick Start: Adding Your Logo to PDF Exports

## Step 1: Upload Your Logo to Firebase Storage

1. Go to Firebase Console → Storage
2. Create a folder called `logos` (if it doesn't exist)
3. Upload your company logo (PNG recommended)
4. Click on the uploaded file
5. Copy the download URL (it will look like this):
   ```
   https://firebasestorage.googleapis.com/v0/b/your-project.appspot.com/o/logos%2Flogo.png?alt=media&token=...
   ```

## Step 2: Update Company Settings in Firestore

1. Go to Firebase Console → Firestore Database
2. Navigate to the `companySettings` collection
3. Click on the `main` document
4. Add/update the following fields:

```json
{
  "logoUrl": "https://firebasestorage.googleapis.com/.../logo.png",
  "pdfShowLogo": true,
  "pdfLogoWidth": 40,
  "pdfLogoHeight": 20
}
```

## Step 3: (Optional) Customize Colors

Add these fields to match your brand:

```json
{
  "pdfHeaderColor": "#1a73e8",
  "pdfAccentColor": "#4285f4",
  "pdfFontSize": 10
}
```

## Step 4: Test It Out!

1. Go to any page with PDF export (Estimates, Invoices, Products)
2. Click "Export PDF" or "Export Price Sheet PDF"
3. Your logo should now appear at the top!

---

## Common Issues

### Logo Not Showing?
- Make sure `pdfShowLogo` is `true` (or not set, defaults to true)
- Verify the logo URL is publicly accessible
- Check that the URL starts with `https://`

### Logo Too Big/Small?
- Adjust `pdfLogoWidth` (try values 30-60)
- Adjust `pdfLogoHeight` (try values 15-30)
- Keep aspect ratio similar to your original logo

### Need More Help?
See the full [PDF_CUSTOMIZATION_GUIDE.md](PDF_CUSTOMIZATION_GUIDE.md) for detailed instructions.
