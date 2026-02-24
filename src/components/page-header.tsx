import type React from 'react';

interface PageHeaderProps {
  title: string;
  description?: string;
  children?: React.ReactNode;
}

export function PageHeader({ title, description, children }: PageHeaderProps) {
  return (
    <div className="mb-6 pb-5 border-b border-border/60">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-1 self-stretch rounded-full bg-primary shrink-0 mt-0.5" />
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight font-headline">{title}</h1>
            {description && <p className="text-muted-foreground text-sm mt-0.5">{description}</p>}
          </div>
        </div>
        {children && <div className="shrink-0">{children}</div>}
      </div>
    </div>
  );
}
