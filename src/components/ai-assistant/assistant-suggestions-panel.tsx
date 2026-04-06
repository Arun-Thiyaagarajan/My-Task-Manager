'use client';

import { Loader2, Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { PromptSuggestion } from './assistant-types';

type Props = {
  show: boolean;
  isSuggestionsLoading: boolean;
  displayPromptSuggestions: PromptSuggestion[];
  normalizedInput: string;
  onDismiss: () => void;
  onSelect: (text: string) => void;
};

export function AssistantSuggestionsPanel({
  show,
  isSuggestionsLoading,
  displayPromptSuggestions,
  onDismiss,
  onSelect,
}: Props) {
  if (!show) return null;

  return (
    <div className="overflow-hidden rounded-[24px] border border-border/60 bg-background/95 p-2 shadow-[0_14px_34px_-30px_rgba(15,23,42,0.22)] transition-all duration-200 ease-out animate-in fade-in-0 slide-in-from-bottom-1 dark:shadow-[0_18px_40px_-34px_rgba(0,0,0,0.55)]">
      <div className="flex items-center justify-between gap-3 px-2 pb-1">
        <div className="flex items-center gap-2">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Suggested prompts
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7 rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          onClick={onDismiss}
        >
          <X className="h-3.5 w-3.5" />
          <span className="sr-only">Close suggestions</span>
        </Button>
      </div>
      <div className="max-h-52 space-y-1 overflow-y-auto pr-1">
        {isSuggestionsLoading && !displayPromptSuggestions.length ? (
          Array.from({ length: 3 }).map((_, index) => (
            <div
              key={`suggestion-skeleton-${index}`}
              className="flex items-start justify-between gap-3 rounded-2xl border border-border/40 px-3 py-2.5"
            >
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-4 w-[78%] rounded-full" />
                <Skeleton className="h-3.5 w-[54%] rounded-full" />
              </div>
              <Skeleton className="h-6 w-16 shrink-0 rounded-full" />
            </div>
          ))
        ) : (
          displayPromptSuggestions.map((suggestion) => (
            <button
              key={suggestion.id}
              type="button"
              className="group flex w-full items-start justify-between gap-3 rounded-2xl border border-transparent bg-transparent px-3 py-2 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/15 hover:bg-[linear-gradient(180deg,hsl(var(--primary)/0.08),hsl(var(--primary)/0.04))] hover:shadow-[0_14px_26px_-24px_hsl(var(--primary)/0.65)]"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => onSelect(suggestion.text)}
            >
              <span className="min-w-0 text-sm leading-5 text-foreground transition-colors group-hover:text-primary [overflow-wrap:anywhere]">
                {suggestion.text}
              </span>
              <span
                className={cn(
                  'shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold transition-colors',
                  suggestion.source === 'history'
                    ? 'bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary'
                    : 'bg-primary/8 text-primary group-hover:bg-primary/14'
                )}
              >
                {suggestion.source === 'history' ? 'History' : 'Suggested'}
              </span>
            </button>
          ))
        )}
      </div>
      {isSuggestionsLoading && displayPromptSuggestions.length ? (
        <div className="px-2 pt-2">
          <div className="flex items-center gap-2 rounded-2xl bg-muted/35 px-3 py-2 text-[11px] text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Refreshing suggestions...
          </div>
        </div>
      ) : null}
    </div>
  );
}

