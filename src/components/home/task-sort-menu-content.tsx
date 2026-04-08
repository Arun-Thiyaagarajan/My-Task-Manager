'use client';

import { Check } from 'lucide-react';

import {
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

interface SortOption {
  value: string;
  label: string;
}

interface TaskSortMenuContentProps {
  align?: 'start' | 'center' | 'end';
  selectedSortLabel: string;
  sortDescriptor: string;
  sortOptions: SortOption[];
  onSortChange: (value: string) => void;
}

export function TaskSortMenuContent({
  align = 'end',
  selectedSortLabel,
  sortDescriptor,
  sortOptions,
  onSortChange,
}: TaskSortMenuContentProps) {
  return (
    <DropdownMenuContent
      align={align}
      className="max-h-[min(22rem,calc(100vh-1.5rem))] w-60 overflow-y-auto rounded-2xl p-2 pr-1 [scrollbar-color:hsl(var(--primary)/0.35)_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar]:w-3 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:border-[3px] [&::-webkit-scrollbar-thumb]:border-solid [&::-webkit-scrollbar-thumb]:border-popover [&::-webkit-scrollbar-thumb]:bg-primary/30 hover:[&::-webkit-scrollbar-thumb]:bg-primary/45"
    >
      <DropdownMenuLabel className="px-2 py-1 text-xs font-semibold text-muted-foreground">
        Sort: {selectedSortLabel}
      </DropdownMenuLabel>
      <DropdownMenuSeparator className="my-1" />
      {sortOptions.map((option) => (
        <DropdownMenuItem
          key={option.value}
          onSelect={() => onSortChange(option.value)}
          className="rounded-xl px-3 py-2.5"
        >
          <div className="flex w-full items-center justify-between gap-3">
            <span className="text-sm font-medium">{option.label}</span>
            {sortDescriptor === option.value ? <Check className="h-4 w-4 text-primary" /> : null}
          </div>
        </DropdownMenuItem>
      ))}
    </DropdownMenuContent>
  );
}
