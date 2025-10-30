
"use client";

import React from 'react';
import type { CustomerStatementReportData, CompanySettings } from '@/types';
import { format } from 'date-fns';

interface PrintableCustomerStatementProps {
  reportData: CustomerStatementReportData;
  companySettings: CompanySettings;
  logoUrl?: string;
}

export const PrintableCustomerStatement = React.forwardRef<HTMLDivElement, PrintableCustomerStatementProps>(
  ({ reportData, companySettings, logoUrl }, ref) => {
    if (!reportData || !companySettings) {
      return null;
    }

    const { customer, startDate, endDate, openingBalance, transactions, closingBalance } = reportData;
    const formatDate = (date: Date | string) => new Date(date).toLocaleDateString();

    return (
      <div ref={ref} className="print-only-container">
        <div className="print-only p-8 bg-white text-black font-sans text-xs">
          {/* Header */}
          <header className="grid grid-cols-2 gap-8 mb-6">
            <div>
              {logoUrl && (
                <div style={{ textAlign: 'left', marginBottom: '1rem', width: '128px' }}>
                  <img
                    src={logoUrl}
                    alt={`${companySettings.companyName || 'Company'} Logo`}
                    style={{ display: 'block', maxWidth: '100%', height: 'auto', objectFit: 'contain' }}
                    data-ai-hint="company logo"
                  />
                </div>
              )}
              <h1 className="text-xl font-bold text-gray-800">{companySettings.companyName || 'Your Company'}</h1>
              <p>{companySettings.addressLine1 || ''}</p>
              {companySettings.addressLine2 && <p>{companySettings.addressLine2}</p>}
              <p>{companySettings.city || ''}, {companySettings.state || ''} {companySettings.zipCode || ''}</p>
            </div>
            <div className="text-right">
              <h2 className="text-2xl font-bold text-gray-700">Customer Statement</h2>
              <p className="mt-1">
                For the period of {formatDate(startDate)} to {formatDate(endDate)}
              </p>
            </div>
          </header>

          {/* Customer Info */}
          <section className="mb-6 p-3 border border-gray-300 rounded-md bg-gray-50">
            <h3 className="text-lg font-semibold text-gray-700 mb-1">Statement For:</h3>
            <p className="font-bold">{customer.companyName || `${customer.firstName} ${customer.lastName}`}</p>
          </section>

          {/* Transactions Table */}
          <section>
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th className="text-left p-1.5 border border-gray-300 font-semibold">Date</th>
                  <th className="text-left p-1.5 border border-gray-300 font-semibold">Transaction</th>
                  <th className="text-right p-1.5 border border-gray-300 font-semibold">Debit</th>
                  <th className="text-right p-1.5 border border-gray-300 font-semibold">Credit</th>
                  <th className="text-right p-1.5 border border-gray-300 font-semibold">Balance</th>
                </tr>
              </thead>
              <tbody>
                {/* Opening Balance */}
                <tr>
                  <td className="p-1.5 border border-gray-300">{formatDate(startDate)}</td>
                  <td className="p-1.5 border border-gray-300 font-semibold">Opening Balance</td>
                  <td className="p-1.5 border border-gray-300"></td>
                  <td className="p-1.5 border border-gray-300"></td>
                  <td className="text-right p-1.5 border border-gray-300 font-semibold">${openingBalance.toFixed(2)}</td>
                </tr>

                {/* Transactions */}
                {transactions.map((item, index) => (
                  <tr key={index}>
                    <td className="p-1.5 border border-gray-300">{formatDate(item.date)}</td>
                    <td className="p-1.5 border border-gray-300">{item.transactionType}: {item.documentNumber}</td>
                    <td className="text-right p-1.5 border border-gray-300">{item.debit > 0 ? `$${item.debit.toFixed(2)}` : ''}</td>
                    <td className="text-right p-1.5 border border-gray-300">{item.credit > 0 ? `$${item.credit.toFixed(2)}` : ''}</td>
                    <td className="text-right p-1.5 border border-gray-300">${item.balance.toFixed(2)}</td>
                  </tr>
                ))}

                {/* Closing Balance */}
                <tr className="bg-gray-100 font-bold">
                  <td colSpan={4} className="text-right p-1.5 border border-gray-300">Closing Balance as of {formatDate(endDate)}:</td>
                  <td className="text-right p-1.5 border border-gray-300">${closingBalance.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
            {transactions.length === 0 && (
                <p className="text-center text-gray-500 py-4">No transactions recorded for this period.</p>
            )}
          </section>

          <footer className="text-center text-gray-500 pt-6 mt-6 border-t border-gray-300">
            <p>Thank you for your business!</p>
          </footer>
        </div>
      </div>
    );
  }
);

PrintableCustomerStatement.displayName = "PrintableCustomerStatement";
