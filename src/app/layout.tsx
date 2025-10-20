"use client";

import type React from "react";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { AppHeader } from "@/components/layout/app-header";
import { SidebarProvider } from "@/components/ui/sidebar";
import { useAuth } from "@/contexts/auth-context";
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { Icon } from '@/components/icons';
import { Providers } from './providers';
import { Toaster } from "@/components/ui/toaster";
import './globals.css';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-body bg-background text-foreground">
        <Providers>
          <MainAppLayout>{children}</MainAppLayout>
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}

function MainAppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user && pathname !== '/login' && pathname !== '/signup') {
      router.replace('/login');
    }
  }, [user, loading, router, pathname]);

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background">
        <Icon name="Loader2" className="h-10 w-10 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Loading application...</p>
      </div>
    );
  }

  // Redirect authenticated users away from login/signup
  if (user && (pathname === '/login' || pathname === '/signup')) {
      router.replace('/dashboard');
      return (
         <div className="flex min-h-screen flex-col items-center justify-center bg-background">
            <Icon name="Loader2" className="h-10 w-10 animate-spin text-primary" />
            <p className="mt-4 text-muted-foreground">Redirecting to dashboard...</p>
         </div>
      );
  }
  
  // Render login/signup pages without the main app layout
  if (!user && (pathname === '/login' || pathname === '/signup')) {
      return <>{children}</>;
  }

  // If we are not authenticated and not on a public page, show a loader
  if (!user && pathname !== '/login' && pathname !== '/signup') {
    return (
         <div className="flex min-h-screen flex-col items-center justify-center bg-background">
            <Icon name="Loader2" className="h-10 w-10 animate-spin text-primary" />
            <p className="mt-4 text-muted-foreground">Redirecting to login...</p>
         </div>
    );
  }
  
  // Render the full app layout for authenticated users
  return (
    <SidebarProvider defaultOpen>
      <div className="flex min-h-screen bg-background">
        <AppSidebar />
        <div className="flex flex-1 flex-col">
          <AppHeader />
          <main className="flex-1 p-6 overflow-auto">
            <div className="w-full max-w-[1440px] mx-auto">
              {children}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
