'use client';

import { Filter, X } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';

import type { DesktopFiltersSheetProps } from '@/components/home/types';

export function DesktopFiltersSheet({
  isOpen,
  onOpenChange,
  desktopDraftFilterCount,
  activeFilterSections,
  hiddenActiveFilterSectionsCount,
  buildFilterSummary,
  controls,
  onResetSelections,
  onApplyFilters,
}: DesktopFiltersSheetProps) {
  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        hideClose
        className="hidden w-[min(34rem,92vw)] border-border/60 bg-[linear-gradient(180deg,hsl(var(--background)/0.99),hsl(var(--card)/0.96))] px-0 py-0 shadow-[0_30px_90px_-44px_rgba(15,23,42,0.42)] md:flex md:max-w-none md:flex-col"
      >
        <div className="border-b border-border/50 px-6 py-5">
          <SheetHeader className="space-y-0 text-left">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0 flex-1">
                <SheetTitle className="flex items-center gap-2">
                  <Filter className="h-5 w-5 text-primary" />
                  Filters
                  {desktopDraftFilterCount > 0 ? (
                    <Badge variant="secondary" className="rounded-full border-primary/20 bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary shadow-[0_10px_24px_-18px_rgba(59,130,246,0.55)]">
                      <span className="mr-1.5 inline-flex h-2 w-2 rounded-full bg-primary shadow-[0_0_12px_rgba(59,130,246,0.8)]" />
                      {desktopDraftFilterCount} active
                    </Badge>
                  ) : null}
                </SheetTitle>
              </div>
              <div className="flex items-center gap-2">
                <SheetClose asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-10 w-10 rounded-2xl border-border/60 bg-background/90 shadow-sm"
                  >
                    <X className="h-4 w-4" />
                    <span className="sr-only">Close filters</span>
                  </Button>
                </SheetClose>
              </div>
            </div>
            <SheetDescription className="mt-3 pl-8 text-xs leading-relaxed text-muted-foreground/80 sm:text-[13px]">
              Refine tasks by status, group, repository, tags, and deployment without crowding the main page.
            </SheetDescription>
          </SheetHeader>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {activeFilterSections.length > 0 && (
            <div className="mb-5 flex flex-wrap items-center gap-2">
              {activeFilterSections.slice(0, 3).map((section) => (
                <Badge
                  key={section.label}
                  variant="secondary"
                  className="max-w-full rounded-full border border-border/60 bg-background/90 px-3 py-1.5 text-xs font-medium text-foreground"
                >
                  <span className="mr-1 text-muted-foreground">{section.label}:</span>
                  <span>{buildFilterSummary(section.values)}</span>
                </Badge>
              ))}
              {hiddenActiveFilterSectionsCount > 0 && (
                <Badge
                  variant="secondary"
                  className="rounded-full border-border/60 bg-background/90 px-3 py-1.5 text-xs font-medium text-muted-foreground"
                >
                  +{hiddenActiveFilterSectionsCount} more
                </Badge>
              )}
            </div>
          )}
          {controls}
        </div>

        <div className="border-t border-border/50 px-6 py-4">
          <div className="flex items-center justify-between gap-3">
            <Button
              variant="ghost"
              onClick={onResetSelections}
              disabled={desktopDraftFilterCount === 0}
              className="rounded-xl px-3 font-medium text-muted-foreground"
            >
              Reset selections
            </Button>
            <Button
              onClick={onApplyFilters}
              className="rounded-xl px-4 font-semibold"
            >
              Apply filters
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
