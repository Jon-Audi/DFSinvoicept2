import type React from "react";
import { Inter } from 'next/font/google';
import { cn } from '@/lib/utils';
import { Providers } from './providers';
import { Toaster } from "@/components/ui/toaster";
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
  preload: true,
  fallback: ['system-ui', 'arial']
});

export const metadata = {
  title: 'Delaware Fence Pro',
  description: 'Manage your fencing business with Delaware Fence Pro.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={cn(inter.variable)} suppressHydrationWarning>
      <body className="font-body bg-background text-foreground">
        <Providers>
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
