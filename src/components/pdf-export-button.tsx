"use client";

import { Button } from '@/components/ui/button';
import { Icon } from '@/components/icons';
import { useToast } from '@/hooks/use-toast';
import { exportEstimateToPDF, exportOrderToPDF, exportInvoiceToPDF } from '@/lib/pdf-export';
import type { Estimate, Order, Invoice, CompanySettings } from '@/types';

interface PDFExportButtonProps {
  document: Estimate | Order | Invoice;
  type: 'estimate' | 'order' | 'invoice';
  companySettings: CompanySettings | null;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

export function PDFExportButton({ document, type, companySettings, variant = 'outline', size = 'default' }: PDFExportButtonProps) {
  const { toast } = useToast();

  const handleExport = async () => {
    try {
      if (type === 'estimate') {
        await exportEstimateToPDF(document as Estimate, companySettings);
      } else if (type === 'order') {
        await exportOrderToPDF(document as Order, companySettings);
      } else if (type === 'invoice') {
        await exportInvoiceToPDF(document as Invoice, companySettings);
      }

      toast({
        title: 'PDF Exported',
        description: `${type.charAt(0).toUpperCase() + type.slice(1)} has been downloaded as PDF.`,
      });
    } catch (error) {
      console.error('PDF export error:', error);
      toast({
        title: 'Export Failed',
        description: 'Could not export PDF. Please try again.',
        variant: 'destructive',
      });
    }
  };

  return (
    <Button variant={variant} size={size} onClick={handleExport}>
      <Icon name="FileDown" className="mr-2 h-4 w-4" />
      Export PDF
    </Button>
  );
}
