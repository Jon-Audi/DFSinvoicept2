import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Estimate, Order, Invoice, LineItem, CompanySettings, Product } from '@/types';

// Helper function to convert hex color to RGB
function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)]
    : [66, 66, 66]; // Default gray
}

// Helper function to add company header with logo support
async function addCompanyHeader(
  doc: jsPDF,
  companySettings: CompanySettings | null,
  startY: number = 20
): Promise<number> {
  if (!companySettings) return startY;

  let currentY = startY;
  const pageWidth = doc.internal.pageSize.getWidth();

  // Logo Settings
  const showLogo = companySettings.pdfShowLogo !== false; // Default true
  const logoWidth = companySettings.pdfLogoWidth || 40;
  const logoHeight = companySettings.pdfLogoHeight || 20;

  // If logo exists and should be shown
  if (showLogo && companySettings.logoUrl) {
    try {
      // Load logo image
      const img = await loadImage(companySettings.logoUrl);
      doc.addImage(img, 'PNG', 14, currentY, logoWidth, logoHeight);
      currentY += logoHeight + 5;
    } catch (error) {
      console.error('Error loading logo:', error);
      // Continue without logo
    }
  }

  // Company Name
  const fontSize = companySettings.pdfFontSize || 10;
  doc.setFontSize(fontSize * 2); // 2x for company name
  doc.setFont('helvetica', 'bold');

  // Apply header color if set
  if (companySettings.pdfHeaderColor) {
    const [r, g, b] = hexToRgb(companySettings.pdfHeaderColor);
    doc.setTextColor(r, g, b);
  }

  doc.text(companySettings.companyName || 'Company Name', 14, currentY);
  doc.setTextColor(0, 0, 0); // Reset to black
  doc.setFont('helvetica', 'normal');

  currentY += 8;
  doc.setFontSize(fontSize);

  // Address
  if (companySettings.addressLine1) {
    doc.text(companySettings.addressLine1, 14, currentY);
    currentY += 5;
  }
  if (companySettings.addressLine2) {
    doc.text(companySettings.addressLine2, 14, currentY);
    currentY += 5;
  }

  // City, State, Zip
  const cityStateZip = [
    companySettings.city,
    companySettings.state,
    companySettings.zipCode
  ].filter(Boolean).join(', ');

  if (cityStateZip) {
    doc.text(cityStateZip, 14, currentY);
    currentY += 5;
  }

  // Contact Info
  if (companySettings.phone) {
    doc.text(`Phone: ${companySettings.phone}`, 14, currentY);
    currentY += 5;
  }
  if (companySettings.email) {
    doc.text(`Email: ${companySettings.email}`, 14, currentY);
    currentY += 5;
  }
  if (companySettings.website) {
    doc.text(`Web: ${companySettings.website}`, 14, currentY);
    currentY += 5;
  }

  return currentY + 5; // Add some spacing after header
}

// Helper function to convert gs:// URLs to HTTPS
function convertGsToHttps(url: string): string {
  if (url.startsWith('gs://')) {
    // Extract bucket and path from gs:// URL
    const parts = url.replace('gs://', '').split('/');
    const bucket = parts[0];
    const path = parts.slice(1).join('/');
    // Encode the path for Firebase Storage URL format
    const encodedPath = encodeURIComponent(path);
    return `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodedPath}?alt=media`;
  }
  return url;
}

// Helper function to load image from URL
function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    // Convert gs:// to https:// if needed
    img.src = convertGsToHttps(url);
  });
}

export async function exportEstimateToPDF(estimate: Estimate, companySettings: CompanySettings | null) {
  const doc = new jsPDF();

  // Get settings
  const fontSize = companySettings?.pdfFontSize || 10;
  const accentColor = companySettings?.pdfAccentColor
    ? hexToRgb(companySettings.pdfAccentColor)
    : [66, 66, 66];

  // Company Header with logo support
  let currentY = await addCompanyHeader(doc, companySettings, 15);

  // Document Title
  doc.setFontSize(fontSize + 8);
  doc.setFont('helvetica', 'bold');
  doc.text('ESTIMATE', 14, currentY);

  currentY += 8;
  doc.setFont('helvetica', 'normal');

  // Estimate Details
  doc.setFontSize(fontSize);
  doc.text(`Estimate #: ${estimate.estimateNumber}`, 14, currentY);
  currentY += 5;
  doc.text(`Date: ${new Date(estimate.date).toLocaleDateString()}`, 14, currentY);
  currentY += 5;
  doc.text(`Customer: ${estimate.customerName}`, 14, currentY);
  currentY += 5;
  if (estimate.status) {
    doc.text(`Status: ${estimate.status}`, 14, currentY);
    currentY += 5;
  }

  currentY += 5;

  // Line Items Table
  const tableData = estimate.lineItems.map((item: LineItem) => [
    item.productName,
    item.quantity.toString(),
    item.unit || 'ea',
    `$${item.unitPrice.toFixed(2)}`,
    `$${item.total.toFixed(2)}`,
  ]);

  autoTable(doc, {
    startY: currentY,
    head: [['Product', 'Quantity', 'Unit', 'Unit Price', 'Total']],
    body: tableData,
    theme: 'grid',
    styles: { fontSize: fontSize - 1 },
    headStyles: { fillColor: accentColor },
  });

  // Totals
  const finalY = (doc as any).lastAutoTable.finalY || currentY;
  doc.setFontSize(fontSize + 2);
  doc.text(`Subtotal: $${estimate.subtotal.toFixed(2)}`, 140, finalY + 10);

  if (estimate.taxAmount && estimate.taxAmount > 0) {
    doc.text(`Tax: $${estimate.taxAmount.toFixed(2)}`, 140, finalY + 17);
    doc.text(`Total: $${estimate.total.toFixed(2)}`, 140, finalY + 24);
  } else {
    doc.text(`Total: $${estimate.total.toFixed(2)}`, 140, finalY + 17);
  }

  // Notes
  if (estimate.notes) {
    doc.setFontSize(fontSize);
    doc.text('Notes:', 14, finalY + 35);
    const splitNotes = doc.splitTextToSize(estimate.notes, 180);
    doc.text(splitNotes, 14, finalY + 42);
  }

  // Disclaimer
  if (companySettings?.estimateDisclaimer) {
    doc.setFontSize(fontSize - 1);
    doc.setTextColor(100, 100, 100);
    const splitDisclaimer = doc.splitTextToSize(companySettings.estimateDisclaimer, 180);
    doc.text(splitDisclaimer, 14, finalY + (estimate.notes ? 60 : 50));
    doc.setTextColor(0, 0, 0);
  }

  // Save PDF
  doc.save(`Estimate_${estimate.estimateNumber}.pdf`);
}

export async function exportOrderToPDF(order: Order, companySettings: CompanySettings | null) {
  const doc = new jsPDF();

  // Get settings
  const fontSize = companySettings?.pdfFontSize || 10;
  const accentColor = companySettings?.pdfAccentColor
    ? hexToRgb(companySettings.pdfAccentColor)
    : [66, 66, 66];

  // Company Header with logo support
  let currentY = await addCompanyHeader(doc, companySettings, 15);

  // Document Title
  doc.setFontSize(fontSize + 8);
  doc.setFont('helvetica', 'bold');
  doc.text('ORDER', 14, currentY);

  currentY += 8;
  doc.setFont('helvetica', 'normal');

  // Order Details
  doc.setFontSize(fontSize);
  doc.text(`Order #: ${order.orderNumber}`, 14, currentY);
  currentY += 5;
  doc.text(`Date: ${new Date(order.date).toLocaleDateString()}`, 14, currentY);
  currentY += 5;
  doc.text(`Customer: ${order.customerName}`, 14, currentY);
  currentY += 5;
  if (order.status) {
    doc.text(`Status: ${order.status}`, 14, currentY);
    currentY += 5;
  }
  if (order.distributor) {
    doc.text(`Distributor: ${order.distributor}`, 14, currentY);
    currentY += 5;
  }

  currentY += 5;

  // Line Items Table
  const tableData = order.lineItems.map((item: LineItem) => [
    item.productName,
    item.quantity.toString(),
    item.unit || 'ea',
    `$${item.unitPrice.toFixed(2)}`,
    `$${item.total.toFixed(2)}`,
  ]);

  autoTable(doc, {
    startY: currentY,
    head: [['Product', 'Quantity', 'Unit', 'Unit Price', 'Total']],
    body: tableData,
    theme: 'grid',
    styles: { fontSize: fontSize - 1 },
    headStyles: { fillColor: accentColor },
  });

  // Totals
  const finalY = (doc as any).lastAutoTable.finalY || currentY;
  doc.setFontSize(fontSize + 2);
  doc.text(`Subtotal: $${order.subtotal.toFixed(2)}`, 140, finalY + 10);

  if (order.taxAmount && order.taxAmount > 0) {
    doc.text(`Tax: $${order.taxAmount.toFixed(2)}`, 140, finalY + 17);
    doc.text(`Total: $${order.total.toFixed(2)}`, 140, finalY + 24);
  } else {
    doc.text(`Total: $${order.total.toFixed(2)}`, 140, finalY + 17);
  }

  // Notes
  if (order.notes) {
    doc.setFontSize(fontSize);
    doc.text('Notes:', 14, finalY + 35);
    const splitNotes = doc.splitTextToSize(order.notes, 180);
    doc.text(splitNotes, 14, finalY + 42);
  }

  // Save PDF
  doc.save(`Order_${order.orderNumber}.pdf`);
}

export async function exportInvoiceToPDF(invoice: Invoice, companySettings: CompanySettings | null) {
  const doc = new jsPDF();

  // Get settings
  const fontSize = companySettings?.pdfFontSize || 10;
  const accentColor = companySettings?.pdfAccentColor
    ? hexToRgb(companySettings.pdfAccentColor)
    : [66, 66, 66];

  // Company Header with logo support
  let currentY = await addCompanyHeader(doc, companySettings, 15);

  // Document Title
  doc.setFontSize(fontSize + 8);
  doc.setFont('helvetica', 'bold');
  doc.text('INVOICE', 14, currentY);

  currentY += 8;
  doc.setFont('helvetica', 'normal');

  // Invoice Details
  doc.setFontSize(fontSize);
  doc.text(`Invoice #: ${invoice.invoiceNumber}`, 14, currentY);
  currentY += 5;
  doc.text(`Date: ${new Date(invoice.date).toLocaleDateString()}`, 14, currentY);
  currentY += 5;
  doc.text(`Customer: ${invoice.customerName}`, 14, currentY);
  currentY += 5;
  if (invoice.status) {
    doc.text(`Status: ${invoice.status}`, 14, currentY);
    currentY += 5;
  }

  // Payment Status
  if (invoice.paymentStatus) {
    doc.text(`Payment Status: ${invoice.paymentStatus}`, 14, currentY);
    currentY += 5;
  }

  currentY += 5;

  // Line Items Table
  const tableData = invoice.lineItems.map((item: LineItem) => [
    item.productName,
    item.quantity.toString(),
    item.unit || 'ea',
    `$${item.unitPrice.toFixed(2)}`,
    `$${item.total.toFixed(2)}`,
  ]);

  autoTable(doc, {
    startY: currentY,
    head: [['Product', 'Quantity', 'Unit', 'Unit Price', 'Total']],
    body: tableData,
    theme: 'grid',
    styles: { fontSize: fontSize - 1 },
    headStyles: { fillColor: accentColor },
  });

  // Totals
  const finalY = (doc as any).lastAutoTable.finalY || currentY;
  doc.setFontSize(fontSize + 2);
  doc.text(`Subtotal: $${invoice.subtotal.toFixed(2)}`, 140, finalY + 10);

  if (invoice.taxAmount && invoice.taxAmount > 0) {
    doc.text(`Tax: $${invoice.taxAmount.toFixed(2)}`, 140, finalY + 17);
    doc.text(`Total: $${invoice.total.toFixed(2)}`, 140, finalY + 24);
  } else {
    doc.text(`Total: $${invoice.total.toFixed(2)}`, 140, finalY + 17);
  }

  // Payment Info
  if (invoice.amountPaid && invoice.amountPaid > 0) {
    doc.text(`Amount Paid: $${invoice.amountPaid.toFixed(2)}`, 140, finalY + 31);
    doc.text(`Balance Due: $${(invoice.total - invoice.amountPaid).toFixed(2)}`, 140, finalY + 38);
  }

  // Notes
  if (invoice.notes) {
    doc.setFontSize(fontSize);
    doc.text('Notes:', 14, finalY + 50);
    const splitNotes = doc.splitTextToSize(invoice.notes, 180);
    doc.text(splitNotes, 14, finalY + 57);
  }

  // Disclaimer
  if (companySettings?.invoiceDisclaimer) {
    doc.setFontSize(fontSize - 1);
    doc.setTextColor(100, 100, 100);
    const splitDisclaimer = doc.splitTextToSize(companySettings.invoiceDisclaimer, 180);
    doc.text(splitDisclaimer, 14, finalY + (invoice.notes ? 70 : 60));
    doc.setTextColor(0, 0, 0);
  }

  // Save PDF
  doc.save(`Invoice_${invoice.invoiceNumber}.pdf`);
}

export async function exportPriceSheetToPDF(groupedProducts: Map<string, Product[]>, companySettings: CompanySettings | null) {
  const doc = new jsPDF();

  // Get settings
  const fontSize = companySettings?.pdfFontSize || 10;
  const accentColor = companySettings?.pdfAccentColor
    ? hexToRgb(companySettings.pdfAccentColor)
    : [66, 66, 66];

  // Company Header with logo support
  let currentY = await addCompanyHeader(doc, companySettings, 15);

  // Document Title
  doc.setFontSize(fontSize + 8);
  doc.setFont('helvetica', 'bold');
  doc.text('PRICE SHEET', 14, currentY);
  currentY += 8;

  doc.setFontSize(fontSize);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, currentY);
  currentY += 10;

  // Iterate through each category
  for (const [category, products] of groupedProducts.entries()) {
    // Check if we need a new page
    if (currentY > 250) {
      doc.addPage();
      currentY = 20;
    }

    // Category Header
    doc.setFontSize(fontSize + 4);
    doc.setFont('helvetica', 'bold');
    doc.text(category, 14, currentY);
    currentY += 8;

    // Products Table
    const tableData = products.map((product: Product) => [
      product.name,
      product.subcategory || '-',
      `$${(product.price || 0).toFixed(2)}`,
      product.unit || 'ea',
    ]);

    autoTable(doc, {
      startY: currentY,
      head: [['Product', 'Subcategory', 'Price', 'Unit']],
      body: tableData,
      theme: 'grid',
      styles: { fontSize: fontSize - 1 },
      headStyles: { fillColor: accentColor },
      margin: { left: 14 },
    });

    currentY = (doc as any).lastAutoTable.finalY + 10;
  }

  // Save PDF
  const filename = `Price_Sheet_${new Date().toLocaleDateString().replace(/\//g, '-')}.pdf`;
  doc.save(filename);
}
