'use client';

import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LoadingSpinnerProps {
  isOverlay?: boolean;
  text?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function LoadingSpinner({ 
  isOverlay = false, 
  text = 'Loading...', 
  className,
  size = 'md' 
}: LoadingSpinnerProps) {
  const containerClasses = cn(
    "flex items-center justify-center",
    isOverlay ? "fixed inset-0 z-[200] bg-background/80 backdrop-blur-sm" : "flex-1 py-16",
    className
  );

  const iconSizes = {
    sm: 'h-6 w-6',
    md: 'h-10 w-10',
    lg: 'h-16 w-16'
  };

  return (
    <div className={containerClasses}>
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="relative">
            <Loader2 className={cn("animate-spin text-primary", iconSizes[size])} />
            <div className={cn("absolute inset-0 bg-primary/10 rounded-full blur-xl animate-pulse", iconSizes[size])} />
        </div>
        <p className={cn(
            "font-semibold text-foreground tracking-tight",
            size === 'sm' ? 'text-sm' : size === 'lg' ? 'text-xl' : 'text-lg'
        )}>
          {text}
        </p>
      </div>
    </div>
  );
}
