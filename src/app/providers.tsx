
"use client";

import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider as NextThemesProvider, useTheme as useNextTheme } from 'next-themes';
import { FirebaseProvider } from '@/components/firebase-provider';
import { AuthProvider } from '@/contexts/auth-context';
import { ColorThemeProvider } from '@/contexts/color-theme-context';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes (formerly cacheTime)
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      retry: 1,
    },
  },
});

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider attribute="class" defaultTheme="system" enableSystem>
      <ColorThemeProvider>
        <QueryClientProvider client={queryClient}>
          <FirebaseProvider>
            <AuthProvider>
              {children}
            </AuthProvider>
          </FirebaseProvider>
        </QueryClientProvider>
      </ColorThemeProvider>
    </NextThemesProvider>
  );
}

// Re-export a simplified useTheme for consistency if needed elsewhere
export const useTheme = useNextTheme;
