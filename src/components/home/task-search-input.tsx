'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Search, SearchX, ChevronRight as ChevronRightIcon, X } from 'lucide-react';
import { cn } from '@/lib/utils';

import type { TaskSearchInputProps } from '@/components/home/types';

export function TaskSearchInput({
  searchInputRef,
  searchQuery,
  executedSearchQuery,
  isSearchFocused,
  isSearchActive,
  isMobile,
  searchSuggestions,
  onSearchQueryChange,
  onSearchFocus,
  onSearchBlur,
  onSearchKeyDown,
  onClearSearch,
  onSuggestionClick,
}: TaskSearchInputProps) {
  return (
    <div className="relative flex w-full flex-col">
      <div className="relative flex w-full items-center">
        <Search className="absolute left-3 h-4 w-4 text-muted-foreground" />
        <Input
          ref={searchInputRef}
          placeholder="Search tasks..."
          value={searchQuery}
          onChange={onSearchQueryChange}
          onFocus={onSearchFocus}
          onBlur={() => {
            if (isMobile) return;
            setTimeout(() => onSearchBlur(), 200);
          }}
          onKeyDown={onSearchKeyDown}
          className={cn(
            'h-11 w-full rounded-2xl border-border/60 bg-background/85 pl-10 pr-16 font-normal shadow-[0_14px_30px_-24px_rgba(15,23,42,0.18)] transition-all duration-300 focus-visible:ring-[3px] focus-visible:ring-primary/10 focus-visible:border-primary/40',
            executedSearchQuery && 'border-primary/40 bg-primary/5 shadow-sm'
          )}
        />
        <div className="absolute right-0 flex h-full items-center gap-1 pr-1.5">
          {searchQuery && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-muted-foreground hover:text-foreground"
              onClick={onClearSearch}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="pointer-events-none hidden h-5 select-none items-center rounded border bg-muted px-1.5 text-[10px] font-medium text-muted-foreground sm:inline-flex">
                  Enter
                </div>
              </TooltipTrigger>
              <TooltipContent side="top">
                <span>Press Enter to search tasks</span>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {isSearchFocused && isSearchActive && (
        <div className="absolute left-0 right-0 top-full z-[150] mx-auto mt-2 w-full max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border bg-popover shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200 sm:max-w-none">
          <div className="border-b bg-muted/30 px-4 py-2">
            <p className="text-[11px] font-medium text-muted-foreground/70">Suggestions</p>
          </div>
          <div className="max-h-[300px] overflow-y-auto no-scrollbar">
            {searchSuggestions.length > 0 ? (
              searchSuggestions.map((suggestion) => (
                <button
                  key={suggestion.id}
                  onClick={() => onSuggestionClick(suggestion.taskId)}
                  className="group flex w-full items-center gap-3 border-b p-3 text-left transition-colors last:border-0 hover:bg-muted active:bg-muted/80"
                >
                  <div
                    className={cn(
                      'rounded-lg bg-muted/50 p-2 transition-colors group-hover:bg-primary/10',
                      suggestion.type === 'task'
                        ? 'text-primary'
                        : suggestion.type === 'user'
                          ? 'text-amber-500'
                          : suggestion.type === 'tag'
                            ? 'text-green-500'
                            : 'text-blue-500'
                    )}
                  >
                    <suggestion.icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-bold transition-colors group-hover:text-primary">
                        {suggestion.title}
                      </p>
                      {suggestion.isBinned && (
                        <Badge variant="secondary" className="h-4 shrink-0 border-none bg-zinc-500/10 px-1.5 text-[8px] font-bold text-zinc-500">
                          Bin
                        </Badge>
                      )}
                    </div>
                    <p className="truncate text-[11px] font-medium text-muted-foreground">{suggestion.subLabel}</p>
                  </div>
                  <ChevronRightIcon className="h-3 w-3 text-muted-foreground/30 opacity-0 transition-opacity group-hover:opacity-100" />
                </button>
              ))
            ) : (
              <div className="animate-in zoom-in-95 p-8 text-center duration-300">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted/50">
                  <SearchX className="h-6 w-6 text-muted-foreground/40" />
                </div>
                <p className="text-sm font-bold text-foreground/80">No matches found</p>
                <p className="mt-1 text-[11px] font-medium text-muted-foreground">Try a different keyword</p>
              </div>
            )}
          </div>
          {searchSuggestions.length > 0 && (
            <div className="border-t bg-muted/10 p-3 text-center">
              <p className="text-[10px] font-medium text-muted-foreground">
                Press <span className="font-bold">Enter</span> for all results
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
