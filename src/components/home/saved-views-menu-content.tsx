'use client';

import { BookmarkPlus, FolderKanban } from 'lucide-react';

import {
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';

interface SavedViewsMenuContentProps {
  align?: 'start' | 'center' | 'end';
  onSaveCurrentView: () => void;
  onOpenManageViews: () => void;
}

export function SavedViewsMenuContent({
  align = 'end',
  onSaveCurrentView,
  onOpenManageViews,
}: SavedViewsMenuContentProps) {
  return (
    <DropdownMenuContent align={align} className="w-64 rounded-2xl p-2">
      <DropdownMenuLabel className="px-2 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        Saved Views
      </DropdownMenuLabel>
      <DropdownMenuItem onSelect={onSaveCurrentView} className="rounded-xl px-3 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <BookmarkPlus className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Save current view</p>
            <p className="text-[11px] text-muted-foreground">Store the current filters, search, and sort.</p>
          </div>
        </div>
      </DropdownMenuItem>
      <DropdownMenuItem onSelect={onOpenManageViews} className="rounded-xl px-3 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <FolderKanban className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">View saved</p>
            <p className="text-[11px] text-muted-foreground">Open and manage saved task views.</p>
          </div>
        </div>
      </DropdownMenuItem>
    </DropdownMenuContent>
  );
}
