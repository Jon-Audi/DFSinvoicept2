
"use client";

import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider as NextThemesProvider, useTheme as useNextTheme } from 'next-themes';
import { FirebaseProvider } from '@/components/firebase-provider';
import { AuthProvider } from '@/contexts/auth-context';

const queryClient = new QueryClient();

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider attribute="class" defaultTheme="system" enableSystem>
      <QueryClientProvider client={queryClient}>
        <FirebaseProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
        </FirebaseProvider>
      </QueryClientProvider>
    </NextThemesProvider>
  );
}

// Re-export a simplified useTheme for consistency if needed elsewhere
export const useTheme = useNextTheme;
