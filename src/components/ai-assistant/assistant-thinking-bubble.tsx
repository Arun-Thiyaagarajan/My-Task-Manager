'use client';

import { Sparkles } from 'lucide-react';

export function AssistantThinkingBubble({ isExecuting }: { isExecuting: boolean }) {
  return (
    <div className="flex justify-start">
      <div className="max-w-[92%] rounded-[28px] border border-primary/15 bg-[linear-gradient(180deg,hsl(var(--background)/0.98),hsl(var(--card)/0.94))] px-4 py-3 text-foreground shadow-[0_18px_40px_-30px_hsl(var(--foreground)/0.35)]">
        <div className="flex items-center gap-3">
          <div className="relative flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/15">
            <Sparkles className="h-4 w-4" />
            <span className="absolute inset-0 rounded-2xl bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.28),transparent_60%)]" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-semibold">
              {isExecuting ? 'Applying your request' : 'Thinking through your request'}
            </p>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 animate-bounce rounded-full bg-primary/70 [animation-delay:0ms]" />
              <span className="h-2 w-2 animate-bounce rounded-full bg-primary/60 [animation-delay:180ms]" />
              <span className="h-2 w-2 animate-bounce rounded-full bg-primary/50 [animation-delay:360ms]" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
