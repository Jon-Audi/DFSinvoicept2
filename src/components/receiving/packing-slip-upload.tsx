"use client";

import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/icons';
import { useFirebase } from '@/components/firebase-provider';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';

interface PackingSlipUploadProps {
  packingSlipUrls: string[];
  onPackingSlipChange: (urls: string[]) => void;
  disabled?: boolean;
}

export function PackingSlipUpload({ packingSlipUrls, onPackingSlipChange, disabled }: PackingSlipUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [deletingUrls, setDeletingUrls] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { storage } = useFirebase();
  const { toast } = useToast();

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || !storage || files.length === 0) return;

    // Validate file types (images and PDFs only)
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];
    const invalidFiles = Array.from(files).filter(file => !allowedTypes.includes(file.type));
    
    if (invalidFiles.length > 0) {
      toast({
        title: "Invalid File Type",
        description: "Please upload only images (JPG, PNG, WebP) or PDF files.",
        variant: "destructive"
      });
      return;
    }

    // Validate file sizes (max 10MB each)
    const maxSize = 10 * 1024 * 1024; // 10MB
    const oversizedFiles = Array.from(files).filter(file => file.size > maxSize);
    
    if (oversizedFiles.length > 0) {
      toast({
        title: "File Too Large",
        description: "Each file must be smaller than 10MB.",
        variant: "destructive"
      });
      return;
    }

    setUploading(true);

    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        const timestamp = Date.now();
        const fileName = `${timestamp}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
        const storageRef = ref(storage, `packing-slips/${fileName}`);
        
        await uploadBytes(storageRef, file);
        const downloadURL = await getDownloadURL(storageRef);
        return downloadURL;
      });

      const newUrls = await Promise.all(uploadPromises);
      const updatedUrls = [...packingSlipUrls, ...newUrls];
      onPackingSlipChange(updatedUrls);

      toast({
        title: "Upload Successful",
        description: `${files.length} packing slip${files.length > 1 ? 's' : ''} uploaded successfully.`
      });

      // Clear the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload Failed",
        description: "Failed to upload packing slips. Please try again.",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteFile = async (urlToDelete: string) => {
    if (!storage) return;

    setDeletingUrls(prev => new Set([...prev, urlToDelete]));

    try {
      // Extract the file path from the URL to delete from Firebase Storage
      const url = new URL(urlToDelete);
      const pathMatch = url.pathname.match(/\/o\/(.+?)\?/);
      if (pathMatch) {
        const filePath = decodeURIComponent(pathMatch[1]);
        const fileRef = ref(storage, filePath);
        await deleteObject(fileRef);
      }

      // Remove from the URLs array
      const updatedUrls = packingSlipUrls.filter(url => url !== urlToDelete);
      onPackingSlipChange(updatedUrls);

      toast({
        title: "File Deleted",
        description: "Packing slip removed successfully."
      });
    } catch (error) {
      console.error('Delete error:', error);
      toast({
        title: "Delete Failed",
        description: "Failed to delete packing slip. Please try again.",
        variant: "destructive"
      });
    } finally {
      setDeletingUrls(prev => {
        const newSet = new Set(prev);
        newSet.delete(urlToDelete);
        return newSet;
      });
    }
  };

  const getFileTypeFromUrl = (url: string): string => {
    const pathname = new URL(url).pathname;
    const extension = pathname.split('.').pop()?.toLowerCase();
    
    switch (extension) {
      case 'pdf':
        return 'PDF';
      case 'jpg':
      case 'jpeg':
        return 'JPG';
      case 'png':
        return 'PNG';
      case 'webp':
        return 'WebP';
      default:
        return 'File';
    }
  };

  const getFileName = (url: string): string => {
    try {
      const pathname = new URL(url).pathname;
      const fileName = pathname.split('/').pop() || 'Unknown';
      return decodeURIComponent(fileName).replace(/^\d+-/, ''); // Remove timestamp prefix
    } catch {
      return 'Unknown file';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">Packing Slips</label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || uploading}
        >
          {uploading ? (
            <Icon name="Loader2" className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Icon name="Upload" className="mr-2 h-4 w-4" />
          )}
          {uploading ? 'Uploading...' : 'Upload Files'}
        </Button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,.pdf"
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled || uploading}
      />

      {packingSlipUrls.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            {packingSlipUrls.length} file{packingSlipUrls.length > 1 ? 's' : ''} uploaded
          </p>
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {packingSlipUrls.map((url, index) => (
              <div
                key={url}
                className="flex items-center justify-between p-2 border rounded-lg bg-muted/50"
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <Icon
                    name={getFileTypeFromUrl(url) === 'PDF' ? 'FileText' : 'Image'}
                    className="h-4 w-4 text-muted-foreground flex-shrink-0"
                  />
                  <span className="text-sm truncate" title={getFileName(url)}>
                    {getFileName(url)}
                  </span>
                  <Badge variant="outline" className="text-xs">
                    {getFileTypeFromUrl(url)}
                  </Badge>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => window.open(url, '_blank')}
                    className="h-6 w-6 p-0"
                    title="View file"
                  >
                    <Icon name="ExternalLink" className="h-3 w-3" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteFile(url)}
                    disabled={disabled || deletingUrls.has(url)}
                    className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                    title="Delete file"
                  >
                    {deletingUrls.has(url) ? (
                      <Icon name="Loader2" className="h-3 w-3 animate-spin" />
                    ) : (
                      <Icon name="X" className="h-3 w-3" />
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Upload images (JPG, PNG, WebP) or PDF files up to 10MB each
      </p>
    </div>
  );
}