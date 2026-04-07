'use client';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { Copy, Download, Tag, Trash2 } from 'lucide-react';

import type { BulkSelectionBarProps } from '@/components/home/types';

export function BulkSelectionBar({
  filteredTasksCount,
  selectedTaskIds,
  onToggleSelectAll,
  onOpenTagsDialog,
  onBulkCopyText,
  onBulkExportPdf,
  onBulkDelete,
}: BulkSelectionBarProps) {
  return (
    <Card className="overflow-hidden border-primary/30 bg-[linear-gradient(180deg,hsl(var(--background)/0.96),hsl(var(--card)/0.92))] shadow-[0_22px_60px_-34px_rgba(15,23,42,0.16)] backdrop-blur-xl dark:bg-[linear-gradient(180deg,rgba(17,24,39,0.98),rgba(15,23,42,0.94))] dark:shadow-[0_22px_60px_-34px_rgba(0,0,0,0.62)]">
      <CardContent className="flex flex-col gap-4 p-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-3 rounded-2xl border border-border/60 bg-background/72 px-3 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] dark:bg-white/[0.02] dark:shadow-none">
            <Checkbox
              id="select-all-tasks"
              checked={filteredTasksCount > 0 && selectedTaskIds.length === filteredTasksCount}
              onCheckedChange={onToggleSelectAll}
              className="h-5 w-5"
            />
            <Label htmlFor="select-all-tasks" className="cursor-pointer whitespace-nowrap text-sm font-semibold text-foreground">
              {selectedTaskIds.length > 0 ? `${selectedTaskIds.length} Selected` : 'Select All'}
            </Label>
          </div>

          <div
            className={cn(
              'ml-auto hidden w-full items-stretch justify-end gap-2 transition-opacity duration-300 md:flex md:flex-row md:items-center',
              selectedTaskIds.length > 0 ? 'opacity-100' : 'pointer-events-none opacity-40'
            )}
          >
            <Button id="bulk-tags-trigger" variant="outline" size="sm" onClick={onOpenTagsDialog} className="h-10 rounded-2xl border-border/60 bg-background/86 px-4 font-medium shadow-[0_10px_24px_-20px_rgba(15,23,42,0.12)] transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/25 hover:bg-background dark:shadow-[0_10px_24px_-20px_rgba(0,0,0,0.38)]">
              <Tag className="mr-2 h-4 w-4 text-primary" /> Tags
            </Button>
            <Button id="bulk-copy-trigger" variant="outline" size="sm" onClick={onBulkCopyText} className="h-10 rounded-2xl border-border/60 bg-background/86 px-4 font-medium shadow-[0_10px_24px_-20px_rgba(15,23,42,0.12)] transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/25 hover:bg-background dark:shadow-[0_10px_24px_-20px_rgba(0,0,0,0.38)]">
              <Copy className="mr-2 h-4 w-4 text-primary" /> Copy
            </Button>
            <Button id="bulk-pdf-trigger" variant="outline" size="sm" onClick={onBulkExportPdf} className="h-10 rounded-2xl border-border/60 bg-background/86 px-4 font-medium shadow-[0_10px_24px_-20px_rgba(15,23,42,0.12)] transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/25 hover:bg-background dark:shadow-[0_10px_24px_-20px_rgba(0,0,0,0.38)]">
              <Download className="mr-2 h-4 w-4 text-primary" /> PDF
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button id="bulk-delete-trigger" variant="destructive" size="sm" className="h-10 rounded-2xl px-4 font-semibold shadow-[0_14px_30px_-22px_rgba(220,38,38,0.38)] transition-all duration-200 hover:-translate-y-0.5 dark:shadow-[0_14px_30px_-22px_rgba(127,29,29,0.55)]">
                  <Trash2 className="mr-2 h-4 w-4" /> Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="font-semibold">Move to Bin?</AlertDialogTitle>
                  <AlertDialogDescription className="text-sm font-normal leading-relaxed">
                    You are about to move {selectedTaskIds.length} task(s) to the bin. You can restore them for up to 30 days.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="gap-2 pt-4">
                  <AlertDialogCancel className="rounded-lg font-medium">Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={onBulkDelete} className="rounded-lg bg-destructive px-6 font-bold hover:bg-destructive/90">
                    Delete Tasks
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        <div
          className={cn(
            'grid grid-cols-2 gap-2 transition-opacity duration-300 md:hidden',
            selectedTaskIds.length > 0 ? 'opacity-100' : 'pointer-events-none opacity-40'
          )}
        >
          <Button variant="outline" size="sm" onClick={onOpenTagsDialog} className="h-10 rounded-2xl border-border/60 bg-background/86 px-4 font-medium shadow-[0_10px_24px_-20px_rgba(15,23,42,0.12)] transition-all duration-200 hover:border-primary/25 hover:bg-background dark:shadow-[0_10px_24px_-20px_rgba(0,0,0,0.38)]">
            <Tag className="mr-2 h-4 w-4 text-primary" /> Tags
          </Button>
          <Button variant="outline" size="sm" onClick={onBulkCopyText} className="h-10 rounded-2xl border-border/60 bg-background/86 px-4 font-medium shadow-[0_10px_24px_-20px_rgba(15,23,42,0.12)] transition-all duration-200 hover:border-primary/25 hover:bg-background dark:shadow-[0_10px_24px_-20px_rgba(0,0,0,0.38)]">
            <Copy className="mr-2 h-4 w-4 text-primary" /> Copy
          </Button>
          <Button variant="outline" size="sm" onClick={onBulkExportPdf} className="h-10 rounded-2xl border-border/60 bg-background/86 px-4 font-medium shadow-[0_10px_24px_-20px_rgba(15,23,42,0.12)] transition-all duration-200 hover:border-primary/25 hover:bg-background dark:shadow-[0_10px_24px_-20px_rgba(0,0,0,0.38)]">
            <Download className="mr-2 h-4 w-4 text-primary" /> PDF
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm" className="h-10 rounded-2xl px-4 font-semibold shadow-[0_14px_30px_-22px_rgba(220,38,38,0.38)] transition-all duration-200 dark:shadow-[0_14px_30px_-22px_rgba(127,29,29,0.55)]">
                <Trash2 className="mr-2 h-4 w-4" /> Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="font-semibold">Move to Bin?</AlertDialogTitle>
                <AlertDialogDescription className="text-sm font-normal leading-relaxed">
                  You are about to move {selectedTaskIds.length} task(s) to the bin. You can restore them for up to 30 days.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="gap-2 pt-4">
                <AlertDialogCancel className="rounded-lg font-medium">Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={onBulkDelete} className="rounded-lg bg-destructive px-6 font-bold hover:bg-destructive/90">
                  Delete Tasks
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  );
}
