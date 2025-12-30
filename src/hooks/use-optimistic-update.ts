import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

export interface OptimisticUpdateOptions<T> {
  onUpdate: (data: T) => Promise<void>;
  onSuccess?: (data: T) => void;
  onError?: (error: Error, data: T) => void;
  successMessage?: string;
  errorMessage?: string;
}

/**
 * Hook for handling optimistic UI updates
 * Updates the UI immediately, then performs the actual update
 * Rolls back if the update fails
 */
export function useOptimisticUpdate<T>(options: OptimisticUpdateOptions<T>) {
  const { toast } = useToast();
  const [isUpdating, setIsUpdating] = useState(false);

  const update = useCallback(
    async (data: T, optimisticUpdate: () => void, rollback: () => void) => {
      // Apply optimistic update immediately
      optimisticUpdate();
      setIsUpdating(true);

      try {
        // Perform actual update
        await options.onUpdate(data);

        // Show success message if provided
        if (options.successMessage) {
          toast({
            title: 'Success',
            description: options.successMessage,
          });
        }

        // Call success callback
        options.onSuccess?.(data);
      } catch (error) {
        // Rollback on error
        rollback();

        const errorMessage =
          options.errorMessage ||
          (error instanceof Error ? error.message : 'An error occurred');

        toast({
          title: 'Error',
          description: errorMessage,
          variant: 'destructive',
        });

        // Call error callback
        options.onError?.(error as Error, data);
      } finally {
        setIsUpdating(false);
      }
    },
    [options, toast]
  );

  return { update, isUpdating };
}

/**
 * Simple debounce function
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };

    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(later, wait);
  };
}

/**
 * Hook for debounced search
 */
export function useDebouncedSearch(
  searchFn: (query: string) => void,
  delay: number = 300
) {
  const [query, setQuery] = useState('');

  const debouncedSearch = useCallback(
    debounce((newQuery: string) => {
      searchFn(newQuery);
    }, delay),
    [searchFn, delay]
  );

  const handleSearch = useCallback(
    (newQuery: string) => {
      setQuery(newQuery);
      debouncedSearch(newQuery);
    },
    [debouncedSearch]
  );

  return { query, handleSearch, setQuery };
}
