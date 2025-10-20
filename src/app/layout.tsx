
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
// AuthProvider is now in Providers.tsx
import { Toaster } from "@/components/ui/toaster";
import { Providers } from './providers';
import { cn } from '@/lib/utils';
import { AppSidebar } from '@/components/layout/app-sidebar';
import { AppHeader } from '@/components/layout/app-header';
import { SidebarProvider } from "@/components/ui/sidebar";

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'Delaware Fence Pro',
  description: 'Manage your fencing business with Delaware Fence Pro.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={cn(inter.variable)} suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body className="font-body bg-background text-foreground">
        <Providers>
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
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
