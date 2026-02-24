"use client";

import React, { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/icons';
import { useToast } from '@/hooks/use-toast';
import type { Product } from '@/types';
import ExcelJS from 'exceljs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ExcelImportExportProps {
  products: Product[];
  onImport: (products: Omit<Product, 'id'>[]) => Promise<void>;
}

const COLUMNS: Partial<ExcelJS.Column>[] = [
  { header: 'Product Name', key: 'Product Name', width: 30 },
  { header: 'Category', key: 'Category', width: 15 },
  { header: 'Subcategory', key: 'Subcategory', width: 15 },
  { header: 'Unit', key: 'Unit', width: 10 },
  { header: 'Cost', key: 'Cost', width: 10 },
  { header: 'Price', key: 'Price', width: 10 },
  { header: 'Markup %', key: 'Markup %', width: 10 },
  { header: 'Stock Quantity', key: 'Stock Quantity', width: 15 },
  { header: 'Is Assembly', key: 'Is Assembly', width: 12 },
];

async function triggerDownload(workbook: ExcelJS.Workbook, filename: string) {
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function ExcelImportExport({ products, onImport }: ExcelImportExportProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const exportToExcel = async () => {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Products');
      worksheet.columns = COLUMNS;

      products.forEach(p => {
        worksheet.addRow({
          'Product Name': p.name,
          'Category': p.category,
          'Subcategory': p.subcategory || '',
          'Unit': p.unit,
          'Cost': p.cost,
          'Price': p.price,
          'Markup %': p.markupPercentage,
          'Stock Quantity': p.quantityInStock || 0,
          'Is Assembly': p.isAssembly ? 'Yes' : 'No',
        });
      });

      const filename = `Products_Export_${new Date().toISOString().split('T')[0]}.xlsx`;
      await triggerDownload(workbook, filename);

      toast({
        title: "Export Successful",
        description: `Exported ${products.length} products to ${filename}`,
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({ title: "Export Failed", description: "Could not export products to Excel.", variant: "destructive" });
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const buffer = e.target?.result as ArrayBuffer;
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(buffer);

        const worksheet = workbook.worksheets[0];
        if (!worksheet) {
          toast({ title: "Import Failed", description: "The Excel file is empty.", variant: "destructive" });
          return;
        }

        // Map header names to column indices from first row
        const headers: Record<string, number> = {};
        worksheet.getRow(1).eachCell((cell, col) => { headers[String(cell.value)] = col; });

        const getVal = (row: ExcelJS.Row, key: string) => {
          const col = headers[key];
          return col ? row.getCell(col).value : undefined;
        };

        const importedProducts: Omit<Product, 'id'>[] = [];
        worksheet.eachRow((row, rowNumber) => {
          if (rowNumber === 1) return;
          const assemblyVal = String(getVal(row, 'Is Assembly') ?? 'No').toLowerCase();
          importedProducts.push({
            name: String(getVal(row, 'Product Name') ?? `Product ${rowNumber - 1}`),
            category: String(getVal(row, 'Category') ?? 'Uncategorized'),
            subcategory: String(getVal(row, 'Subcategory') ?? ''),
            unit: String(getVal(row, 'Unit') ?? 'unit'),
            cost: parseFloat(String(getVal(row, 'Cost') ?? 0)),
            price: parseFloat(String(getVal(row, 'Price') ?? 0)),
            markupPercentage: parseFloat(String(getVal(row, 'Markup %') ?? 0)),
            quantityInStock: parseInt(String(getVal(row, 'Stock Quantity') ?? 0)),
            isAssembly: assemblyVal === 'yes' || assemblyVal === '1' || assemblyVal === 'true',
          });
        });

        if (importedProducts.length === 0) {
          toast({ title: "Import Failed", description: "No data rows found in the file.", variant: "destructive" });
          return;
        }

        await onImport(importedProducts);
        toast({ title: "Import Successful", description: `Imported ${importedProducts.length} products from Excel.` });
      } catch (error) {
        console.error('Import error:', error);
        toast({ title: "Import Failed", description: "Could not import products from Excel. Please check the file format.", variant: "destructive" });
      }
    };

    reader.readAsArrayBuffer(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const downloadTemplate = async () => {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Products');
      worksheet.columns = COLUMNS;
      worksheet.addRow({
        'Product Name': 'Example Product',
        'Category': 'Example Category',
        'Subcategory': 'Example Subcategory',
        'Unit': 'piece',
        'Cost': 10.00,
        'Price': 15.00,
        'Markup %': 50,
        'Stock Quantity': 100,
        'Is Assembly': 'No',
      });
      await triggerDownload(workbook, 'Products_Import_Template.xlsx');
      toast({ title: "Template Downloaded", description: "Excel template downloaded successfully." });
    } catch (error) {
      console.error('Template download error:', error);
      toast({ title: "Download Failed", description: "Could not download template.", variant: "destructive" });
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline">
            <Icon name="Download" className="mr-2 h-4 w-4" />
            Excel
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={exportToExcel}>
            <Icon name="Download" className="mr-2 h-4 w-4" />
            Export to Excel
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
            <Icon name="Upload" className="mr-2 h-4 w-4" />
            Import from Excel
          </DropdownMenuItem>
          <DropdownMenuItem onClick={downloadTemplate}>
            <Icon name="FileText" className="mr-2 h-4 w-4" />
            Download Template
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls"
        onChange={handleFileSelect}
        style={{ display: 'none' }}
      />
    </>
  );
}
