"use client";

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Icon } from '@/components/icons';
import { useToast } from '@/hooks/use-toast';
import type { Estimate, Order, Invoice } from '@/types';

interface EmailDocumentDialogProps {
  document: Estimate | Order | Invoice;
  type: 'estimate' | 'order' | 'invoice';
  customerEmail?: string;
  triggerButton?: React.ReactNode;
}

export function EmailDocumentDialog({
  document,
  type,
  customerEmail = '',
  triggerButton,
}: EmailDocumentDialogProps) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState(customerEmail);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const { toast } = useToast();

  React.useEffect(() => {
    if (open) {
      setEmail(customerEmail);

      // Set default subject
      const docNumber = (document as any).estimateNumber ||
                       (document as any).orderNumber ||
                       (document as any).invoiceNumber;
      setSubject(`${type.charAt(0).toUpperCase() + type.slice(1)} #${docNumber}`);

      // Set default message
      setMessage(
        `Please find attached ${type} #${docNumber}.\n\n` +
        `Customer: ${document.customerName}\n` +
        `Date: ${new Date(document.date).toLocaleDateString()}\n` +
        `Total: $${document.total.toFixed(2)}\n\n` +
        `Thank you for your business!`
      );
    }
  }, [open, document, type, customerEmail]);

  const handleSend = async () => {
    if (!email) {
      toast({
        title: 'Email Required',
        description: 'Please enter an email address.',
        variant: 'destructive',
      });
      return;
    }

    setIsSending(true);

    try {
      // Create HTML email content
      const docNumber = (document as any).estimateNumber ||
                       (document as any).orderNumber ||
                       (document as any).invoiceNumber;

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #f4f4f4; padding: 20px; text-align: center; }
            .content { padding: 20px; background-color: #fff; }
            .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
            th { background-color: #f4f4f4; }
            .total { font-size: 18px; font-weight: bold; text-align: right; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>${type.toUpperCase()} #${docNumber}</h1>
            </div>
            <div class="content">
              <p>${message.replace(/\n/g, '<br>')}</p>

              <h3>Details:</h3>
              <table>
                <tr>
                  <th>Customer</th>
                  <td>${document.customerName}</td>
                </tr>
                <tr>
                  <th>Date</th>
                  <td>${new Date(document.date).toLocaleDateString()}</td>
                </tr>
                <tr>
                  <th>Status</th>
                  <td>${(document as any).status || 'N/A'}</td>
                </tr>
              </table>

              <h3>Line Items:</h3>
              <table>
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Qty</th>
                    <th>Unit Price</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  ${document.lineItems.map(item => `
                    <tr>
                      <td>${item.productName}</td>
                      <td>${item.quantity} ${item.unit || 'ea'}</td>
                      <td>$${item.unitPrice.toFixed(2)}</td>
                      <td>$${item.total.toFixed(2)}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>

              <p class="total">
                Subtotal: $${document.subtotal.toFixed(2)}<br>
                ${document.taxAmount ? `Tax: $${document.taxAmount.toFixed(2)}<br>` : ''}
                <strong>Total: $${document.total.toFixed(2)}</strong>
              </p>

              ${document.notes ? `<p><strong>Notes:</strong><br>${document.notes}</p>` : ''}
            </div>
            <div class="footer">
              <p>This is an automated message. Please do not reply to this email.</p>
            </div>
          </div>
        </body>
        </html>
      `;

      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: email,
          subject,
          html: htmlContent,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send email');
      }

      toast({
        title: 'Email Sent',
        description: `${type.charAt(0).toUpperCase() + type.slice(1)} has been sent to ${email}`,
      });

      setOpen(false);
    } catch (error: any) {
      console.error('Email send error:', error);
      toast({
        title: 'Send Failed',
        description: error.message || 'Could not send email. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {triggerButton || (
          <Button variant="outline">
            <Icon name="Mail" className="mr-2 h-4 w-4" />
            Email {type.charAt(0).toUpperCase() + type.slice(1)}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Email {type.charAt(0).toUpperCase() + type.slice(1)}</DialogTitle>
          <DialogDescription>
            Send this {type} to the customer via email.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <label className="text-sm font-medium mb-2 block">To</label>
            <Input
              type="email"
              placeholder="customer@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Subject</label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Message</label>
            <Textarea
              rows={6}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </div>

          <div className="text-xs text-muted-foreground">
            The full {type} details will be included in the email automatically.
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isSending}>
            Cancel
          </Button>
          <Button onClick={handleSend} disabled={isSending}>
            {isSending ? (
              <>
                <Icon name="Loader2" className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Icon name="Send" className="mr-2 h-4 w-4" />
                Send Email
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
