
"use client";

import React from 'react';
import type { Product, CompanySettings } from '@/types';

interface PrintablePriceSheetProps {
  groupedProducts: Map<string, Product[]>;
  companySettings: CompanySettings | null;
  customerName?: string;
}

export const PrintablePriceSheet = React.forwardRef<HTMLDivElement, PrintablePriceSheetProps>(
  ({ groupedProducts, companySettings, customerName }, ref) => {

    if (!groupedProducts || groupedProducts.size === 0 || !companySettings) {
      return (
        <div ref={ref} className="print-only-container">
          <div className="print-only p-8 bg-white text-black font-sans text-xs">
            <p>No products to display or company settings missing.</p>
          </div>
        </div>
      );
    }

    const currentDate = new Date().toLocaleDateString();
    const reportTitle = customerName ? `Price Sheet for ${customerName}` : 'Price Sheet';

    return (
      <div ref={ref} className="print-only-container">
        <div className="print-only" style={{ padding: '0.5in', backgroundColor: 'white', color: 'black' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '1.5rem' }}>
            <div style={{ display: 'block' }}>
              <h1 style={{ fontSize: '20px', fontWeight: 'bold', color: '#000', marginBottom: '0.5rem', marginTop: '0' }}>{companySettings.companyName || 'Your Company'}</h1>
              <p style={{ fontSize: '11px', margin: '0', lineHeight: '1.4' }}>{companySettings.addressLine1 || ''}</p>
              {companySettings.addressLine2 && <p style={{ fontSize: '11px', margin: '0', lineHeight: '1.4' }}>{companySettings.addressLine2}</p>}
              <p style={{ fontSize: '11px', margin: '0', lineHeight: '1.4' }}>
                {companySettings.city || ''}{companySettings.city && (companySettings.state || companySettings.zipCode) ? ', ' : ''}
                {companySettings.state || ''} {companySettings.zipCode || ''}
              </p>
              {companySettings.phone && <p style={{ fontSize: '11px', margin: '0', lineHeight: '1.4' }}>Phone: {companySettings.phone}</p>}
              {companySettings.email && <p style={{ fontSize: '11px', margin: '0', lineHeight: '1.4' }}>Email: {companySettings.email}</p>}
            </div>
            <div style={{ display: 'block', textAlign: 'right' }}>
              <h2 style={{ fontSize: '22px', fontWeight: 'bold', color: '#000', margin: '0 0 0.5rem 0' }}>{reportTitle}</h2>
              <p style={{ fontSize: '13px', margin: '0' }}><span style={{ fontWeight: '600' }}>Date:</span> {currentDate}</p>
            </div>
          </div>

          {Array.from(groupedProducts.entries()).map(([category, productsInCategory]) => (
            <div key={category} style={{ marginBottom: '1.5rem', pageBreakInside: 'avoid' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#374151', marginBottom: '0.5rem', paddingBottom: '0.25rem', borderBottom: '1px solid #d1d5db' }}>{category}</h3>
              {productsInCategory.length > 0 ? (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f9fafb' }}>
                      <th style={{ textAlign: 'left', padding: '6px', border: '1px solid #d1d5db', fontWeight: '600', color: '#4b5563', width: '60%' }}>Product Name</th>
                      <th style={{ textAlign: 'left', padding: '6px', border: '1px solid #d1d5db', fontWeight: '600', color: '#4b5563', width: '20%' }}>Unit</th>
                      <th style={{ textAlign: 'right', padding: '6px', border: '1px solid #d1d5db', fontWeight: '600', color: '#4b5563', width: '20%' }}>Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {productsInCategory.map((product) => (
                      <tr key={product.id} style={{ pageBreakInside: 'avoid' }}>
                        <td style={{ padding: '6px', border: '1px solid #d1d5db' }}>{product.name}</td>
                        <td style={{ padding: '6px', border: '1px solid #d1d5db' }}>{product.unit}</td>
                        <td style={{ textAlign: 'right', padding: '6px', border: '1px solid #d1d5db' }}>${product.price.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p style={{ fontSize: '12px', color: '#6b7280' }}>No products in this category.</p>
              )}
            </div>
          ))}

          <footer style={{ textAlign: 'center', color: '#6b7280', paddingTop: '1.5rem', marginTop: '1.5rem', borderTop: '1px solid #d1d5db' }}>
            <p style={{ margin: '0.25rem 0' }}>Prices subject to change without notice.</p>
            <p style={{ margin: '0.25rem 0' }}>{companySettings.companyName}</p>
          </footer>
        </div>
      </div>
    );
  }
);

PrintablePriceSheet.displayName = "PrintablePriceSheet";
