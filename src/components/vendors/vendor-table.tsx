
"use client";

import React from 'react';
import type { Vendor } from '@/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/icons';
import { VendorDialog } from './vendor-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface VendorTableProps {
  vendors: Vendor[];
  onSave: (vendor: Omit<Vendor, 'id'> & { id?: string }) => void;
  onDelete: (vendorId: string) => void;
}

export function VendorTable({ vendors, onSave, onDelete }: VendorTableProps) {
  const [vendorToDelete, setVendorToDelete] = React.useState<Vendor | null>(null);

  return (
    <>
      <div className="rounded-lg border shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Vendor Name</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Email</TableHead>
              <TableHead className="w-[80px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {vendors.map((vendor) => (
              <TableRow key={vendor.id}>
                <TableCell className="font-medium">{vendor.name}</TableCell>
                <TableCell>{vendor.contactName || 'N/A'}</TableCell>
                <TableCell>{vendor.phone || 'N/A'}</TableCell>
                <TableCell>{vendor.email || 'N/A'}</TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Icon name="MoreHorizontal" className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <VendorDialog
                        vendor={vendor}
                        triggerButton={
                          <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                            <Icon name="Edit" className="mr-2 h-4 w-4" /> Edit
                          </DropdownMenuItem>
                        }
                        onSave={onSave}
                      />
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive focus:bg-destructive/10"
                        onSelect={() => setVendorToDelete(vendor)}
                      >
                        <Icon name="Trash2" className="mr-2 h-4 w-4" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      
      {vendorToDelete && (
        <AlertDialog open={!!vendorToDelete} onOpenChange={(isOpen) => !isOpen && setVendorToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete the vendor &quot;{vendorToDelete.name}&quot;. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setVendorToDelete(null)}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (vendorToDelete) onDelete(vendorToDelete.id);
                  setVendorToDelete(null);
                }}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
}
