import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Estimate, Order, Invoice, LineItem, CompanySettings } from '@/types';

export async function exportEstimateToPDF(estimate: Estimate, companySettings: CompanySettings | null) {
  const doc = new jsPDF();

  // Company Header
  if (companySettings) {
    doc.setFontSize(20);
    doc.text(companySettings.companyName || 'Company Name', 14, 20);
    doc.setFontSize(10);

    let yPos = 28;
    if (companySettings.address) {
      doc.text(companySettings.address, 14, yPos);
      yPos += 5;
    }
    if (companySettings.phone) {
      doc.text(`Phone: ${companySettings.phone}`, 14, yPos);
      yPos += 5;
    }
    if (companySettings.email) {
      doc.text(`Email: ${companySettings.email}`, 14, yPos);
      yPos += 5;
    }
  }

  // Document Title
  doc.setFontSize(18);
  doc.text('ESTIMATE', 14, 50);

  // Estimate Details
  doc.setFontSize(10);
  doc.text(`Estimate #: ${estimate.estimateNumber}`, 14, 60);
  doc.text(`Date: ${new Date(estimate.date).toLocaleDateString()}`, 14, 65);
  doc.text(`Customer: ${estimate.customerName}`, 14, 70);
  if (estimate.status) {
    doc.text(`Status: ${estimate.status}`, 14, 75);
  }

  // Line Items Table
  const tableData = estimate.lineItems.map((item: LineItem) => [
    item.productName,
    item.quantity.toString(),
    item.unit || 'ea',
    `$${item.unitPrice.toFixed(2)}`,
    `$${item.total.toFixed(2)}`,
  ]);

  autoTable(doc, {
    startY: 85,
    head: [['Product', 'Quantity', 'Unit', 'Unit Price', 'Total']],
    body: tableData,
    theme: 'grid',
    styles: { fontSize: 9 },
    headStyles: { fillColor: [66, 66, 66] },
  });

  // Totals
  const finalY = (doc as any).lastAutoTable.finalY || 85;
  doc.setFontSize(12);
  doc.text(`Subtotal: $${estimate.subtotal.toFixed(2)}`, 140, finalY + 10);

  if (estimate.taxAmount && estimate.taxAmount > 0) {
    doc.text(`Tax: $${estimate.taxAmount.toFixed(2)}`, 140, finalY + 17);
    doc.text(`Total: $${estimate.total.toFixed(2)}`, 140, finalY + 24);
  } else {
    doc.text(`Total: $${estimate.total.toFixed(2)}`, 140, finalY + 17);
  }

  // Notes
  if (estimate.notes) {
    doc.setFontSize(10);
    doc.text('Notes:', 14, finalY + 35);
    const splitNotes = doc.splitTextToSize(estimate.notes, 180);
    doc.text(splitNotes, 14, finalY + 42);
  }

  // Save PDF
  doc.save(`Estimate_${estimate.estimateNumber}.pdf`);
}

export async function exportOrderToPDF(order: Order, companySettings: CompanySettings | null) {
  const doc = new jsPDF();

  // Company Header
  if (companySettings) {
    doc.setFontSize(20);
    doc.text(companySettings.companyName || 'Company Name', 14, 20);
    doc.setFontSize(10);

    let yPos = 28;
    if (companySettings.address) {
      doc.text(companySettings.address, 14, yPos);
      yPos += 5;
    }
    if (companySettings.phone) {
      doc.text(`Phone: ${companySettings.phone}`, 14, yPos);
      yPos += 5;
    }
    if (companySettings.email) {
      doc.text(`Email: ${companySettings.email}`, 14, yPos);
      yPos += 5;
    }
  }

  // Document Title
  doc.setFontSize(18);
  doc.text('ORDER', 14, 50);

  // Order Details
  doc.setFontSize(10);
  doc.text(`Order #: ${order.orderNumber}`, 14, 60);
  doc.text(`Date: ${new Date(order.date).toLocaleDateString()}`, 14, 65);
  doc.text(`Customer: ${order.customerName}`, 14, 70);
  if (order.status) {
    doc.text(`Status: ${order.status}`, 14, 75);
  }
  if (order.distributor) {
    doc.text(`Distributor: ${order.distributor}`, 14, 80);
  }

  // Line Items Table
  const tableData = order.lineItems.map((item: LineItem) => [
    item.productName,
    item.quantity.toString(),
    item.unit || 'ea',
    `$${item.unitPrice.toFixed(2)}`,
    `$${item.total.toFixed(2)}`,
  ]);

  autoTable(doc, {
    startY: 90,
    head: [['Product', 'Quantity', 'Unit', 'Unit Price', 'Total']],
    body: tableData,
    theme: 'grid',
    styles: { fontSize: 9 },
    headStyles: { fillColor: [66, 66, 66] },
  });

  // Totals
  const finalY = (doc as any).lastAutoTable.finalY || 90;
  doc.setFontSize(12);
  doc.text(`Subtotal: $${order.subtotal.toFixed(2)}`, 140, finalY + 10);

  if (order.taxAmount && order.taxAmount > 0) {
    doc.text(`Tax: $${order.taxAmount.toFixed(2)}`, 140, finalY + 17);
    doc.text(`Total: $${order.total.toFixed(2)}`, 140, finalY + 24);
  } else {
    doc.text(`Total: $${order.total.toFixed(2)}`, 140, finalY + 17);
  }

  // Notes
  if (order.notes) {
    doc.setFontSize(10);
    doc.text('Notes:', 14, finalY + 35);
    const splitNotes = doc.splitTextToSize(order.notes, 180);
    doc.text(splitNotes, 14, finalY + 42);
  }

  // Save PDF
  doc.save(`Order_${order.orderNumber}.pdf`);
}

export async function exportInvoiceToPDF(invoice: Invoice, companySettings: CompanySettings | null) {
  const doc = new jsPDF();

  // Company Header
  if (companySettings) {
    doc.setFontSize(20);
    doc.text(companySettings.companyName || 'Company Name', 14, 20);
    doc.setFontSize(10);

    let yPos = 28;
    if (companySettings.address) {
      doc.text(companySettings.address, 14, yPos);
      yPos += 5;
    }
    if (companySettings.phone) {
      doc.text(`Phone: ${companySettings.phone}`, 14, yPos);
      yPos += 5;
    }
    if (companySettings.email) {
      doc.text(`Email: ${companySettings.email}`, 14, yPos);
      yPos += 5;
    }
  }

  // Document Title
  doc.setFontSize(18);
  doc.text('INVOICE', 14, 50);

  // Invoice Details
  doc.setFontSize(10);
  doc.text(`Invoice #: ${invoice.invoiceNumber}`, 14, 60);
  doc.text(`Date: ${new Date(invoice.date).toLocaleDateString()}`, 14, 65);
  doc.text(`Customer: ${invoice.customerName}`, 14, 70);
  if (invoice.status) {
    doc.text(`Status: ${invoice.status}`, 14, 75);
  }

  // Payment Status
  if (invoice.paymentStatus) {
    doc.text(`Payment Status: ${invoice.paymentStatus}`, 14, 80);
  }

  // Line Items Table
  const tableData = invoice.lineItems.map((item: LineItem) => [
    item.productName,
    item.quantity.toString(),
    item.unit || 'ea',
    `$${item.unitPrice.toFixed(2)}`,
    `$${item.total.toFixed(2)}`,
  ]);

  autoTable(doc, {
    startY: 90,
    head: [['Product', 'Quantity', 'Unit', 'Unit Price', 'Total']],
    body: tableData,
    theme: 'grid',
    styles: { fontSize: 9 },
    headStyles: { fillColor: [66, 66, 66] },
  });

  // Totals
  const finalY = (doc as any).lastAutoTable.finalY || 90;
  doc.setFontSize(12);
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
    doc.setFontSize(10);
    doc.text('Notes:', 14, finalY + 50);
    const splitNotes = doc.splitTextToSize(invoice.notes, 180);
    doc.text(splitNotes, 14, finalY + 57);
  }

  // Save PDF
  doc.save(`Invoice_${invoice.invoiceNumber}.pdf`);
}
