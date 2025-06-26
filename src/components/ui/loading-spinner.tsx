'use client';

import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LoadingSpinnerProps {
  isOverlay?: boolean;
  text?: string;
  className?: string;
}

export function LoadingSpinner({ isOverlay = false, text = 'Loading...', className }: LoadingSpinnerProps) {
  const containerClasses = cn(
    "flex items-center justify-center",
    isOverlay ? "fixed inset-0 z-[200] bg-background/80 backdrop-blur-sm" : "flex-1 py-16",
    className
  );

  return (
    <div className={containerClasses}>
      <div className="flex flex-col items-center gap-4 text-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-lg font-semibold text-foreground">
          {text}
        </p>
      </div>
    </div>
  );
}
