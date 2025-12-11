"use client";

import React, { useState, useEffect } from 'react';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/icons';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from "@/hooks/use-toast";
import { useFirebase } from '@/components/firebase-provider';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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

const SUBCATEGORIES_DOC_ID = "subcategories";

export default function SubcategoriesPage() {
  const { db } = useFirebase();
  const [subcategories, setSubcategories] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isBulkDialogOpen, setIsBulkDialogOpen] = useState(false);
  const [newSubcategory, setNewSubcategory] = useState('');
  const [bulkSubcategories, setBulkSubcategories] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!db) return;

    const fetchSubcategories = async () => {
      setIsLoading(true);
      try {
        const docRef = doc(db, 'settings', SUBCATEGORIES_DOC_ID);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          setSubcategories(data.list || []);
        }
      } catch (error) {
        toast({ title: "Error", description: "Could not fetch subcategories.", variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    };

    fetchSubcategories();
  }, [db, toast]);

  const saveSubcategoriesToFirestore = async (updatedList: string[]) => {
    if (!db) return;

    try {
      const docRef = doc(db, 'settings', SUBCATEGORIES_DOC_ID);
      await setDoc(docRef, { list: updatedList.sort() });
      setSubcategories(updatedList.sort());
    } catch (error) {
      toast({ title: "Error", description: "Could not save subcategories.", variant: "destructive" });
      throw error;
    }
  };

  const handleAddSubcategory = async () => {
    const trimmed = newSubcategory.trim();
    if (!trimmed) {
      toast({ title: "Error", description: "Subcategory name cannot be empty.", variant: "destructive" });
      return;
    }

    if (subcategories.some(s => s.toLowerCase() === trimmed.toLowerCase())) {
      toast({ title: "Error", description: "This subcategory already exists.", variant: "destructive" });
      return;
    }

    try {
      await saveSubcategoriesToFirestore([...subcategories, trimmed]);
      toast({ title: "Success", description: `Subcategory "${trimmed}" has been added.` });
      setNewSubcategory('');
      setIsDialogOpen(false);
    } catch (error) {
      // Error already toasted in saveSubcategoriesToFirestore
    }
  };

  const handleEditSubcategory = async () => {
    if (editingIndex === null) return;

    const trimmed = editValue.trim();
    if (!trimmed) {
      toast({ title: "Error", description: "Subcategory name cannot be empty.", variant: "destructive" });
      return;
    }

    if (subcategories.some((s, idx) => idx !== editingIndex && s.toLowerCase() === trimmed.toLowerCase())) {
      toast({ title: "Error", description: "This subcategory already exists.", variant: "destructive" });
      return;
    }

    try {
      const updated = [...subcategories];
      const oldName = updated[editingIndex];
      updated[editingIndex] = trimmed;
      await saveSubcategoriesToFirestore(updated);
      toast({ title: "Success", description: `Subcategory "${oldName}" has been updated to "${trimmed}".` });
      setEditingIndex(null);
      setEditValue('');
    } catch (error) {
      // Error already toasted
    }
  };

  const handleDeleteSubcategory = async () => {
    if (deleteIndex === null) return;

    try {
      const updated = subcategories.filter((_, idx) => idx !== deleteIndex);
      const deletedName = subcategories[deleteIndex];
      await saveSubcategoriesToFirestore(updated);
      toast({ title: "Success", description: `Subcategory "${deletedName}" has been removed.` });
      setDeleteIndex(null);
    } catch (error) {
      // Error already toasted
    }
  };

  const handleBulkAddSubcategories = async () => {
    const input = bulkSubcategories.trim();
    if (!input) {
      toast({ title: "Error", description: "Please enter at least one subcategory.", variant: "destructive" });
      return;
    }

    // Split by comma or newline, trim, filter empty, and remove duplicates
    const newItems = input
      .split(/[,\n]+/)
      .map(item => item.trim())
      .filter(item => item.length > 0);

    if (newItems.length === 0) {
      toast({ title: "Error", description: "No valid subcategories found.", variant: "destructive" });
      return;
    }

    // Check for duplicates in existing list
    const existingLowercase = subcategories.map(s => s.toLowerCase());
    const toAdd: string[] = [];
    const skipped: string[] = [];

    newItems.forEach(item => {
      if (existingLowercase.includes(item.toLowerCase()) || toAdd.map(s => s.toLowerCase()).includes(item.toLowerCase())) {
        skipped.push(item);
      } else {
        toAdd.push(item);
      }
    });

    if (toAdd.length === 0) {
      toast({
        title: "No New Subcategories",
        description: "All subcategories already exist.",
        variant: "destructive"
      });
      return;
    }

    try {
      await saveSubcategoriesToFirestore([...subcategories, ...toAdd]);

      let description = `Added ${toAdd.length} subcategor${toAdd.length === 1 ? 'y' : 'ies'}.`;
      if (skipped.length > 0) {
        description += ` Skipped ${skipped.length} duplicate${skipped.length === 1 ? '' : 's'}.`;
      }

      toast({ title: "Success", description });
      setBulkSubcategories('');
      setIsBulkDialogOpen(false);
    } catch (error) {
      // Error already toasted in saveSubcategoriesToFirestore
    }
  };

  if (isLoading) {
    return (
      <PageHeader title="Subcategory Management" description="Loading subcategories...">
        <div className="flex items-center justify-center h-32">
          <Icon name="Loader2" className="h-8 w-8 animate-spin" />
        </div>
      </PageHeader>
    );
  }

  return (
    <>
      <PageHeader
        title="Subcategory Management"
        description="Manage product subcategories. These will be available as dropdown options when creating or editing products."
      >
        <div className="flex gap-2">
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Icon name="PlusCircle" className="mr-2 h-4 w-4" />
                Add Subcategory
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Subcategory</DialogTitle>
                <DialogDescription>
                  Enter a name for the new product subcategory.
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <Input
                  placeholder="e.g., Privacy, Picket, Gates"
                  value={newSubcategory}
                  onChange={(e) => setNewSubcategory(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleAddSubcategory();
                    }
                  }}
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddSubcategory}>
                  Add Subcategory
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={isBulkDialogOpen} onOpenChange={setIsBulkDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Icon name="ListPlus" className="mr-2 h-4 w-4" />
                Bulk Add
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Bulk Add Subcategories</DialogTitle>
                <DialogDescription>
                  Enter multiple subcategories separated by commas or new lines. Duplicates will be skipped automatically.
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <Textarea
                  placeholder="Privacy, Picket, Gates&#10;Shadow Box&#10;Chain Link"
                  value={bulkSubcategories}
                  onChange={(e) => setBulkSubcategories(e.target.value)}
                  rows={8}
                  className="font-mono text-sm"
                />
                <p className="text-sm text-muted-foreground mt-2">
                  You can separate items with commas or put each on a new line.
                </p>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsBulkDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleBulkAddSubcategories}>
                  <Icon name="Plus" className="mr-2 h-4 w-4" />
                  Add All
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </PageHeader>

      <div className="rounded-lg border shadow-sm">
        {subcategories.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <p>No subcategories defined yet.</p>
            <p className="text-sm mt-2">Add your first subcategory to get started.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Subcategory Name</TableHead>
                <TableHead className="w-[100px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {subcategories.map((subcategory, index) => (
                <TableRow key={index}>
                  <TableCell>
                    {editingIndex === index ? (
                      <Input
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleEditSubcategory();
                          } else if (e.key === 'Escape') {
                            setEditingIndex(null);
                            setEditValue('');
                          }
                        }}
                        autoFocus
                      />
                    ) : (
                      <span className="font-medium">{subcategory}</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {editingIndex === index ? (
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={handleEditSubcategory}
                        >
                          <Icon name="Check" className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setEditingIndex(null);
                            setEditValue('');
                          }}
                        >
                          <Icon name="X" className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setEditingIndex(index);
                            setEditValue(subcategory);
                          }}
                        >
                          <Icon name="Edit" className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteIndex(index)}
                        >
                          <Icon name="Trash2" className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <AlertDialog open={deleteIndex !== null} onOpenChange={(open) => !open && setDeleteIndex(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Subcategory?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deleteIndex !== null ? subcategories[deleteIndex] : ''}&quot;?
              This will not affect existing products, but this subcategory will no longer be available in the dropdown.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteIndex(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteSubcategory}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
