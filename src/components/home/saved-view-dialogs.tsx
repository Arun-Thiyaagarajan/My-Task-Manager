'use client';

import { BookmarkPlus, Check, FolderKanban, Pin, PinOff, Save, Trash2 } from 'lucide-react';
import { format } from 'date-fns';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

import type { SavedViewDialogsProps } from '@/components/home/types';

export function SavedViewDialogs({
  isSaveViewDialogOpen,
  onSaveViewDialogOpenChange,
  isManageViewsDialogOpen,
  onManageViewsDialogOpenChange,
  newSavedViewName,
  onNewSavedViewNameChange,
  onSaveCurrentView,
  onCloseSaveDialog,
  savedTaskViews,
  isSavedViewActive,
  getSavedViewSummary,
  onApplySavedTaskView,
  onToggleSavedViewPin,
  onStartUpdateSavedView,
  onDeleteSavedView,
  onStartCreateSavedView,
  onCloseManageDialog,
}: SavedViewDialogsProps) {
  const isMobile = useIsMobile();

  const manageViewsContent = (
    <>
      <div className="shrink-0 border-b border-border/50 px-5 py-5 sm:px-6">
        {isMobile ? (
          <SheetHeader>
            <div className="mb-2 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <FolderKanban className="h-5 w-5" />
              </div>
              <div>
                <SheetTitle>Saved Views</SheetTitle>
                <SheetDescription>
                  Pin the views you use often so they stay one tap away on the home page.
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>
        ) : (
          <DialogHeader>
            <div className="mb-2 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <FolderKanban className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle>Saved Views</DialogTitle>
                <DialogDescription>
                  Pin the views you use often so they stay one tap away on the home page.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
        )}
      </div>
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-5 sm:px-6">
        {savedTaskViews.length > 0 ? savedTaskViews.map((view) => {
          const isActive = isSavedViewActive(view);

          return (
            <div
              key={view.id}
              className="rounded-[1.2rem] border border-border/60 bg-background/85 px-4 py-3 shadow-[0_14px_32px_-28px_rgba(15,23,42,0.22)]"
            >
              <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate text-sm font-semibold text-foreground sm:text-[15px]">{view.name}</p>
                  {isActive ? (
                    <Badge variant="secondary" className="rounded-full border-primary/20 bg-primary/10 px-2 py-0.5 text-[10px] text-primary">Active</Badge>
                  ) : null}
                  {view.pinned ? (
                    <Badge variant="secondary" className="rounded-full border-primary/20 bg-primary/10 px-2 py-0.5 text-[10px] text-primary">Pinned</Badge>
                  ) : null}
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                  <span className="truncate">{getSavedViewSummary(view)}</span>
                  <span className="hidden h-1 w-1 rounded-full bg-border sm:inline-flex" />
                  <span className="shrink-0">{format(new Date(view.updatedAt), 'dd MMM yyyy')}</span>
                </div>
                </div>
              <TooltipProvider>
                <div className={cn(
                  "grid shrink-0 gap-2",
                  isMobile ? "grid-cols-4" : "flex items-center gap-1 sm:gap-1.5"
                )}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant={isActive ? 'secondary' : 'outline'}
                        size="icon"
                        onClick={() => !isActive && onApplySavedTaskView(view)}
                        className={cn(
                          'h-9 rounded-xl shadow-sm',
                          isMobile ? 'w-full' : 'w-9',
                          isActive && 'bg-primary/15 text-primary hover:bg-primary/15'
                        )}
                      >
                        <Check className="h-4 w-4" />
                        <span className="sr-only">{isActive ? 'Current view' : 'Apply view'}</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      <p>{isActive ? 'Current view' : 'Apply this view'}</p>
                    </TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => onToggleSavedViewPin(view.id)}
                        className="h-9 w-full rounded-xl sm:w-9"
                      >
                        {view.pinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
                        <span className="sr-only">{view.pinned ? 'Unpin view' : 'Pin view'}</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      <p>{view.pinned ? 'Unpin from top bar' : 'Pin to top bar'}</p>
                    </TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onStartUpdateSavedView(view)}
                        className="h-9 w-full rounded-xl text-muted-foreground sm:w-9"
                      >
                        <Save className="h-4 w-4" />
                        <span className="sr-only">Update saved view</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-[220px]">
                      <p>Update this saved view with your current filters and layout.</p>
                    </TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onDeleteSavedView(view.id)}
                        className="h-9 w-full rounded-xl text-destructive hover:text-destructive sm:w-9"
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Delete saved view</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      <p>Delete this saved view</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </TooltipProvider>
              </div>
            </div>
          );
        }) : (
          <div className="rounded-[1.4rem] border border-dashed border-border/70 bg-muted/[0.24] px-5 py-10 text-center">
            <FolderKanban className="mx-auto mb-3 h-10 w-10 text-muted-foreground/60" />
            <p className="text-base font-semibold">No saved views yet.</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Save your current filters, search, sort, and date mode to reuse them later.
            </p>
          </div>
        )}
      </div>
    </>
  );

  return (
    <>
      <Dialog open={isSaveViewDialogOpen} onOpenChange={onSaveViewDialogOpenChange}>
        <DialogContent className="sm:max-w-md rounded-[1.75rem] border-border/60 bg-[linear-gradient(180deg,hsl(var(--background)/0.98),hsl(var(--card)/0.94))] p-0 shadow-[0_28px_80px_-42px_rgba(15,23,42,0.35)]">
          <div className="border-b border-border/50 px-6 py-5">
            <DialogHeader>
              <div className="mb-2 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <BookmarkPlus className="h-5 w-5" />
                </div>
                <div>
                  <DialogTitle>Save Current View</DialogTitle>
                  <DialogDescription>
                    Save the current search, filters, sort, and date mode as a reusable view.
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>
          </div>
          <div className="space-y-4 px-6 py-5">
            <div className="space-y-2">
              <Label htmlFor="saved-view-name" className="text-sm font-semibold">View name</Label>
              <Input
                id="saved-view-name"
                value={newSavedViewName}
                onChange={(event) => onNewSavedViewNameChange(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    onSaveCurrentView();
                  }
                }}
                placeholder="QA this month"
                className="h-11 rounded-xl"
              />
            </div>
            <div className="rounded-2xl border border-border/60 bg-muted/[0.35] p-4 text-sm text-muted-foreground">
              This view will remember your current search text, selected filters, favorites mode, date mode, sort order, and status-group accordion state.
            </div>
          </div>
          <DialogFooter className="border-t border-border/50 px-6 pb-6 pt-4">
            <Button variant="ghost" onClick={onCloseSaveDialog} className="font-medium">Cancel</Button>
            <Button onClick={onSaveCurrentView} className="rounded-xl px-6 font-semibold">
              Save view
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {isMobile ? (
        <Sheet open={isManageViewsDialogOpen} onOpenChange={onManageViewsDialogOpenChange}>
          <SheetContent
            side="bottom"
            className="flex max-h-[92vh] flex-col overflow-hidden rounded-t-[1.9rem] border-border/60 bg-[linear-gradient(180deg,hsl(var(--background)/0.99),hsl(var(--card)/0.95))] p-0"
          >
            <div className="mx-auto mt-3 h-1.5 w-14 rounded-full bg-muted-foreground/20" />
            {manageViewsContent}
            <SheetFooter className="shrink-0 border-t border-border/50 px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-4 sm:px-6 sm:pb-6">
              <Button
                variant="outline"
                onClick={onStartCreateSavedView}
                className="rounded-xl px-4 font-medium"
              >
                <BookmarkPlus className="mr-2 h-4 w-4" />
                New saved view
              </Button>
              <Button variant="ghost" onClick={onCloseManageDialog} className="font-medium">
                Close
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      ) : (
        <Dialog open={isManageViewsDialogOpen} onOpenChange={onManageViewsDialogOpenChange}>
          <DialogContent className="flex max-h-[min(88vh,720px)] flex-col overflow-hidden border-border/60 bg-[linear-gradient(180deg,hsl(var(--background)/0.99),hsl(var(--card)/0.95))] p-0 shadow-[0_34px_90px_-44px_rgba(15,23,42,0.42)] sm:max-w-2xl sm:rounded-[1.9rem]">
            {manageViewsContent}
            <DialogFooter className="shrink-0 border-t border-border/50 px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-4 sm:px-6 sm:pb-6">
              <Button
                variant="outline"
                onClick={onStartCreateSavedView}
                className="rounded-xl px-4 font-medium"
              >
                <BookmarkPlus className="mr-2 h-4 w-4" />
                New saved view
              </Button>
              <Button variant="ghost" onClick={onCloseManageDialog} className="font-medium">
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
