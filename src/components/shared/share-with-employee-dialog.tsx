
"use client";

import React, { useState } from 'react';
import { addDoc, collection } from 'firebase/firestore';
import { useFirebase } from '@/components/firebase-provider';
import { useAuth } from '@/contexts/auth-context';
import { EMPLOYEES, getEmployeeNameFromEmail } from '@/lib/employee-utils';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Icon } from '@/components/icons';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

interface ShareWithEmployeeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  docType: 'Invoice' | 'Order' | 'Estimate';
  docId: string;
  docNumber: string;
}

export function ShareWithEmployeeDialog({
  open,
  onOpenChange,
  docType,
  docId,
  docNumber,
}: ShareWithEmployeeDialogProps) {
  const { db } = useFirebase();
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedEmail, setSelectedEmail] = useState('');
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);

  const otherEmployees = EMPLOYEES.filter(e => e.email !== user?.email);

  const handleSend = async () => {
    if (!db || !user?.email || !selectedEmail) return;
    setIsSending(true);
    try {
      await addDoc(collection(db, 'notifications'), {
        toEmail: selectedEmail,
        fromEmail: user.email,
        message: message.trim() || null,
        docType,
        docId,
        docNumber,
        read: false,
        createdAt: new Date().toISOString(),
      });
      toast({
        title: 'Sent',
        description: `${docType} ${docNumber} shared with ${getEmployeeNameFromEmail(selectedEmail)}.`,
      });
      setSelectedEmail('');
      setMessage('');
      onOpenChange(false);
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon name="Share2" className="h-5 w-5" />
            Share {docType} {docNumber}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <Label className="text-sm font-medium mb-2 block">Send to</Label>
            <div className="flex flex-col gap-2">
              {otherEmployees.map(emp => (
                <button
                  key={emp.email}
                  type="button"
                  onClick={() => setSelectedEmail(emp.email)}
                  className={`flex items-center gap-3 p-3 rounded-lg border text-left transition-colors ${
                    selectedEmail === emp.email
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border hover:bg-accent'
                  }`}
                >
                  <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-sm font-semibold">
                    {emp.name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{emp.name}</p>
                    <p className="text-xs text-muted-foreground">{emp.email}</p>
                  </div>
                  {selectedEmail === emp.email && (
                    <Icon name="Check" className="h-4 w-4 ml-auto" />
                  )}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label htmlFor="share-message" className="text-sm font-medium mb-2 block">
              Message <span className="text-muted-foreground font-normal">(optional)</span>
            </Label>
            <Textarea
              id="share-message"
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Add a note..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSend} disabled={!selectedEmail || isSending}>
            {isSending && <Icon name="Loader2" className="mr-2 h-4 w-4 animate-spin" />}
            Send
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
