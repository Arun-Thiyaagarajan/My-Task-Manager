'use client';

import * as React from 'react';
import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

export const AssistantLauncher = React.forwardRef<HTMLButtonElement, React.ComponentPropsWithoutRef<'button'>>(
  ({ className, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        id="floating-ai-assistant-trigger"
        type="button"
        className={cn(
          'fixed bottom-16 right-8 z-[120] hidden rounded-[30px] md:flex focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45 focus-visible:ring-offset-4 focus-visible:ring-offset-background',
          className
        )}
        {...props}
      >
        <span className="group relative flex h-[58px] w-[58px] items-center justify-center rounded-[26px] border border-primary/20 bg-[linear-gradient(145deg,hsl(var(--primary))_0%,hsl(var(--primary)/0.88)_52%,hsl(228_92%_61%)_100%)] text-primary-foreground shadow-[0_26px_60px_-28px_hsl(var(--primary)/0.9)] ring-1 ring-white/20 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_30px_70px_-30px_hsl(var(--primary)/0.95)] dark:ring-white/10">
          <span className="absolute inset-[1px] rounded-[25px] bg-[linear-gradient(180deg,rgba(255,255,255,0.28),rgba(255,255,255,0.02)_42%,rgba(255,255,255,0.08))]" />
          <span className="absolute inset-0 rounded-[26px] bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.34),transparent_54%)]" />
          <span className="absolute -right-1.5 -top-1.5 flex h-6 min-w-6 items-center justify-center rounded-full border border-white/30 bg-background/95 px-1.5 text-[9px] font-black uppercase tracking-[0.18em] text-primary shadow-lg dark:bg-background/90">
            AI
          </span>
          <span className="absolute inset-0 rounded-[26px] opacity-0 transition-opacity duration-300 group-hover:opacity-100">
            <span className="absolute inset-x-3 top-2 h-5 rounded-full bg-white/20 blur-xl" />
          </span>
          <Sparkles className="relative h-6 w-6" />
          <span className="sr-only">Open AI assistant</span>
          {children}
        </span>
      </button>
    );
  }
);

AssistantLauncher.displayName = 'AssistantLauncher';
