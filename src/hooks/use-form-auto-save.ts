import { useEffect, useRef } from 'react';

/**
 * Hook to auto-save form data to localStorage
 * @param key - Unique localStorage key for this form
 * @param data - Form data to save
 * @param enabled - Whether auto-save is enabled (e.g., only save for new forms, not edits)
 */
export function useFormAutoSave<T>(
  key: string,
  data: T,
  enabled: boolean = true
) {
  const debounceTimeout = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    // Debounce saving to avoid excessive localStorage writes
    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }

    debounceTimeout.current = setTimeout(() => {
      try {
        localStorage.setItem(key, JSON.stringify(data));
      } catch (error) {
        console.error('Failed to save form data to localStorage:', error);
      }
    }, 1000); // Save 1 second after last change

    return () => {
      if (debounceTimeout.current) {
        clearTimeout(debounceTimeout.current);
      }
    };
  }, [key, data, enabled]);
}

/**
 * Retrieve saved form data from localStorage
 * @param key - Unique localStorage key for this form
 * @returns Parsed form data or null if not found
 */
export function getSavedFormData<T>(key: string): T | null {
  if (typeof window === 'undefined') return null;

  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : null;
  } catch (error) {
    console.error('Failed to retrieve saved form data:', error);
    return null;
  }
}

/**
 * Clear saved form data from localStorage
 * @param key - Unique localStorage key for this form
 */
export function clearSavedFormData(key: string) {
  if (typeof window === 'undefined') return;

  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.error('Failed to clear saved form data:', error);
  }
}
