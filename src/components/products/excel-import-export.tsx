"use client";

import React, { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/icons';
import { useToast } from '@/hooks/use-toast';
import type { Product } from '@/types';
import * as XLSX from 'xlsx';
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

export function ExcelImportExport({ products, onImport }: ExcelImportExportProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const exportToExcel = () => {
    try {
      // Prepare data for export
      const exportData = products.map(p => ({
        'Product Name': p.name,
        'Category': p.category,
        'Subcategory': p.subcategory || '',
        'Unit': p.unit,
        'Cost': p.cost,
        'Price': p.price,
        'Markup %': p.markupPercentage,
        'Stock Quantity': p.quantityInStock || 0,
        'Is Assembly': p.isAssembly ? 'Yes' : 'No',
      }));

      // Create worksheet
      const worksheet = XLSX.utils.json_to_sheet(exportData);

      // Set column widths
      worksheet['!cols'] = [
        { wch: 30 }, // Product Name
        { wch: 15 }, // Category
        { wch: 15 }, // Subcategory
        { wch: 10 }, // Unit
        { wch: 10 }, // Cost
        { wch: 10 }, // Price
        { wch: 10 }, // Markup %
        { wch: 15 }, // Stock Quantity
        { wch: 12 }, // Is Assembly
      ];

      // Create workbook
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Products');

      // Generate filename with date
      const filename = `Products_Export_${new Date().toISOString().split('T')[0]}.xlsx`;

      // Save file
      XLSX.writeFile(workbook, filename);

      toast({
        title: "Export Successful",
        description: `Exported ${products.length} products to ${filename}`,
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Export Failed",
        description: "Could not export products to Excel.",
        variant: "destructive",
      });
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });

        // Get first sheet
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        // Convert to JSON
        const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[];

        if (jsonData.length === 0) {
          toast({
            title: "Import Failed",
            description: "The Excel file is empty.",
            variant: "destructive",
          });
          return;
        }

        // Transform data to Product format
        const importedProducts: Omit<Product, 'id'>[] = jsonData.map((row, index) => {
          // Handle different possible column names (case-insensitive)
          const getName = () => row['Product Name'] || row['product name'] || row['name'] || row['Name'] || `Product ${index + 1}`;
          const getCategory = () => row['Category'] || row['category'] || 'Uncategorized';
          const getSubcategory = () => row['Subcategory'] || row['subcategory'] || '';
          const getUnit = () => row['Unit'] || row['unit'] || 'unit';
          const getCost = () => parseFloat(row['Cost'] || row['cost'] || 0);
          const getPrice = () => parseFloat(row['Price'] || row['price'] || 0);
          const getMarkup = () => parseFloat(row['Markup %'] || row['markup %'] || row['Markup'] || row['markup'] || 0);
          const getStock = () => parseInt(row['Stock Quantity'] || row['stock quantity'] || row['Stock'] || row['stock'] || 0);
          const getIsAssembly = () => {
            const val = row['Is Assembly'] || row['is assembly'] || row['Assembly'] || row['assembly'] || 'No';
            return val.toString().toLowerCase() === 'yes' || val === true || val === 1;
          };

          return {
            name: getName(),
            category: getCategory(),
            subcategory: getSubcategory(),
            unit: getUnit(),
            cost: getCost(),
            price: getPrice(),
            markupPercentage: getMarkup(),
            quantityInStock: getStock(),
            isAssembly: getIsAssembly(),
          };
        });

        // Call import handler
        await onImport(importedProducts);

        toast({
          title: "Import Successful",
          description: `Imported ${importedProducts.length} products from Excel.`,
        });
      } catch (error) {
        console.error('Import error:', error);
        toast({
          title: "Import Failed",
          description: "Could not import products from Excel. Please check the file format.",
          variant: "destructive",
        });
      }
    };

    reader.readAsBinaryString(file);

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const downloadTemplate = () => {
    try {
      // Create template with example data
      const templateData = [
        {
          'Product Name': 'Example Product',
          'Category': 'Example Category',
          'Subcategory': 'Example Subcategory',
          'Unit': 'piece',
          'Cost': 10.00,
          'Price': 15.00,
          'Markup %': 50,
          'Stock Quantity': 100,
          'Is Assembly': 'No',
        },
      ];

      const worksheet = XLSX.utils.json_to_sheet(templateData);

      // Set column widths
      worksheet['!cols'] = [
        { wch: 30 }, // Product Name
        { wch: 15 }, // Category
        { wch: 15 }, // Subcategory
        { wch: 10 }, // Unit
        { wch: 10 }, // Cost
        { wch: 10 }, // Price
        { wch: 10 }, // Markup %
        { wch: 15 }, // Stock Quantity
        { wch: 12 }, // Is Assembly
      ];

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Products');

      XLSX.writeFile(workbook, 'Products_Import_Template.xlsx');

      toast({
        title: "Template Downloaded",
        description: "Excel template downloaded successfully.",
      });
    } catch (error) {
      console.error('Template download error:', error);
      toast({
        title: "Download Failed",
        description: "Could not download template.",
        variant: "destructive",
      });
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
