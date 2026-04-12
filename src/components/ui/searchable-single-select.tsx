'use client';

import * as React from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { type SelectOption } from '@/components/ui/multi-select';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

interface SearchableSingleSelectProps {
  options: SelectOption[];
  value: string | null | undefined;
  onChange: (value: string | null) => void;
  placeholder?: string;
  emptyLabel?: string;
  className?: string;
  searchPlaceholder?: string;
  dialogTitle?: string;
  dialogDescription?: string;
}

export function SearchableSingleSelect({
  options,
  value,
  onChange,
  placeholder = 'Select...',
  emptyLabel = 'Clear selection',
  className,
  searchPlaceholder = 'Search...',
  dialogTitle = 'Choose an option',
  dialogDescription = 'Search and select a single option.',
}: SearchableSingleSelectProps) {
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = React.useState(false);
  const selectedOption = options.find(option => option.value === value) || null;

  const trigger = (
    <Button
      type="button"
      variant="outline"
      role="combobox"
      aria-expanded={isOpen}
      className={cn(
        'group flex h-auto min-h-10 w-full items-start justify-between rounded-md px-3 py-2 text-sm font-normal shadow-none',
        'border-input bg-background hover:bg-background',
        className
      )}
      onClick={() => setIsOpen(true)}
    >
      <span className={cn('min-w-0 flex-1 whitespace-normal break-words text-left leading-snug', !selectedOption && 'text-muted-foreground')}>
        {selectedOption?.label || placeholder}
      </span>
      <ChevronsUpDown className="ml-2 mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/70" />
    </Button>
  );

  const picker = (
    <Command className="flex h-full max-h-full bg-transparent">
      <CommandInput placeholder={searchPlaceholder} className="h-9 text-sm" />
      <CommandList className="max-h-[min(21rem,52vh,var(--radix-popover-content-available-height,52vh))] flex-1 scroll-pb-8 pb-3">
        <CommandEmpty>No matching items found.</CommandEmpty>
        <CommandGroup className="p-1.5 pb-6">
          <CommandItem
            value={emptyLabel}
            onSelect={() => {
              onChange(null);
              setIsOpen(false);
            }}
            className="min-h-9 items-start rounded-sm px-2.5 py-2 text-[13px] font-normal"
          >
            <div className="mr-2.5 mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center">
              {!value ? <Check className="h-4 w-4" /> : null}
            </div>
            <span className="whitespace-normal break-words leading-snug">{emptyLabel}</span>
          </CommandItem>
          {options.map(option => (
            <CommandItem
              key={option.value}
              value={option.label}
              onSelect={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
              className="min-h-9 items-start rounded-sm px-2.5 py-2 text-[13px] font-normal"
            >
              <div className="mr-2.5 mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center">
                {value === option.value ? <Check className="h-4 w-4" /> : null}
              </div>
              <span className="whitespace-normal break-words leading-snug">{option.label}</span>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </Command>
  );

  if (isMobile) {
    return (
      <>
        {trigger}
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogContent className="flex h-auto max-h-[min(82vh,32rem)] w-[calc(100vw-1rem)] max-w-xl flex-col overflow-hidden rounded-lg border-border/60 bg-background p-0 shadow-[0_28px_84px_-40px_rgba(15,23,42,0.38)]">
            <div className="border-b border-border/60 px-5 py-4">
              <DialogTitle className="text-base">{dialogTitle}</DialogTitle>
              <DialogDescription className="mt-1 text-sm">{dialogDescription}</DialogDescription>
            </div>
            <div className="flex min-h-0 flex-1 overflow-hidden p-2">{picker}</div>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent
        align="start"
        className="max-h-[min(24rem,var(--radix-popover-content-available-height),70vh)] w-[var(--radix-popover-trigger-width)] overflow-hidden rounded-md border-border/65 bg-background p-0 shadow-lg"
      >
        {picker}
      </PopoverContent>
    </Popover>
  );
}
