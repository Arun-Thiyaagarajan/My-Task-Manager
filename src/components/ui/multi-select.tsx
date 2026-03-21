'use client';

import * as React from 'react';
import { X, PlusCircle, ListFilter } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import {
  Command,
  CommandGroup,
  CommandItem,
  CommandList,
  CommandEmpty,
} from '@/components/ui/command';
import { Command as CommandPrimitive } from 'cmdk';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from './popover';
import { Button } from './button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from '@/components/ui/dialog';
import { ScrollArea } from './scroll-area';

export type SelectOption = {
  value: string;
  label: string;
};

interface MultiSelectProps {
  options: SelectOption[];
  selected: string[];
  onChange: (selected: string[]) => void;
  onCreate?: (value: string) => string | undefined;
  placeholder?: string;
  className?: string;
  creatable?: boolean;
  maxVisible?: number;
}

export const MultiSelect = React.memo(function MultiSelect({
  options,
  selected,
  onChange,
  onCreate,
  placeholder = 'Select...',
  className,
  creatable = false,
  maxVisible = 1,
}: MultiSelectProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  
  const [isOpen, setIsOpen] = React.useState(false);
  const [isListOpen, setIsListOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');
  
  const safeSelected = Array.isArray(selected) ? selected : [];

  const handleUnselect = React.useCallback(
    (e: React.MouseEvent | React.KeyboardEvent, value: string) => {
      e.preventDefault();
      e.stopPropagation();
      const newSelected = safeSelected.filter((s) => s !== value);
      onChange(newSelected);
    },
    [onChange, safeSelected]
  );
  
  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      const input = inputRef.current;
      if (input) {
        if (e.key === 'Delete' || e.key === 'Backspace') {
          if (input.value === '' && safeSelected.length > 0) {
            handleUnselect(e, safeSelected[safeSelected.length - 1]);
          }
        }
        if (e.key === 'Escape') {
          input.blur();
        }
      }
    },
    [handleUnselect, safeSelected]
  );

  const allOptions = React.useMemo(() => {
    const opts = [...options];
    safeSelected.forEach(value => {
        if (!options.some(o => o.value === value)) {
            opts.push({ value, label: value });
        }
    });
    return opts;
  }, [options, safeSelected]);
  
  const selectedMap = React.useMemo(() => {
    const map = new Map<string, string>();
    safeSelected.forEach(value => {
      const option = allOptions.find(o => o.value === value);
      map.set(value, option ? option.label : value);
    });
    return map;
  }, [safeSelected, allOptions]);

  const filteredOptions = allOptions.filter(
    (option) => !safeSelected.includes(option.value)
  );

  const lowerCaseQuery = query.trim().toLowerCase();
  const showCreatable = 
      creatable && 
      lowerCaseQuery.length > 0 && 
      !allOptions.some(opt => opt.label.toLowerCase() === lowerCaseQuery);

  const handleSelectCreatable = React.useCallback(() => {
    if (!showCreatable) return;

    const newValue = query.trim();
    if (onCreate) {
      const newId = onCreate(newValue);
      if (newId) {
        onChange([...safeSelected, newId]);
      }
    } else {
      onChange([...safeSelected, newValue]);
    }
    setQuery('');
  }, [showCreatable, query, onCreate, onChange, safeSelected]);

  const visibleItems = safeSelected.slice(0, maxVisible);
  const hiddenCount = safeSelected.length - maxVisible;

  return (
    <>
        <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
            <div 
            className={cn("group flex items-center rounded-md border border-input h-auto min-h-11 w-full px-3 py-1 text-sm transition-colors hover:border-primary/50 focus-within:ring-1 focus-within:ring-primary focus-within:border-primary bg-background", className)}
            role="button"
            aria-expanded={isOpen}
            onClick={() => setIsOpen(true)}
            >
            <div className="flex flex-wrap gap-1 items-center flex-grow overflow-hidden py-0.5">
                {safeSelected.length === 0 && <span className="text-muted-foreground">{placeholder}</span>}
                
                {visibleItems.map((value) => {
                    const label = selectedMap.get(value);
                    return (
                        <Badge key={value} variant="secondary" className="whitespace-nowrap max-w-[120px] truncate">
                            {label}
                            {safeSelected.length === 1 && (
                                <button
                                    className="ml-1 rounded-full outline-none transition-colors"
                                    onKeyDown={(e) => { if (e.key === 'Enter') handleUnselect(e, value); }}
                                    onMouseDown={(e) => e.preventDefault()}
                                    onClick={(e) => handleUnselect(e, value)}
                                >
                                    <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                                </button>
                            )}
                        </Badge>
                    );
                })}

                {hiddenCount > 0 && (
                    <Button 
                        variant="secondary" 
                        size="sm" 
                        className="h-6 px-2 text-[10px] font-bold text-primary hover:bg-primary/10 border-primary/20 bg-primary/5"
                        onClick={(e) => {
                            e.stopPropagation();
                            setIsListOpen(true);
                        }}
                    >
                        +{hiddenCount} more
                    </Button>
                )}
            </div>
            </div>
        </PopoverTrigger>
        <PopoverContent 
            className="w-[300px] p-0" 
            align="start"
            onOpenAutoFocus={(e) => e.preventDefault()}
            onPointerDownCapture={(e) => e.stopPropagation()}
        >
            <Command onKeyDown={handleKeyDown} className={cn('overflow-visible bg-transparent', className)}>
                <div className="flex items-center border-b px-3" cmdk-input-wrapper="">
                    <CommandPrimitive.Input
                        ref={inputRef}
                        value={query}
                        onValueChange={setQuery}
                        placeholder={placeholder}
                        className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
                    />
                </div>
                <CommandList 
                    className="max-h-60 overscroll-contain"
                    onWheel={(e) => e.stopPropagation()}
                    onTouchStart={(e) => e.stopPropagation()}
                    onTouchMove={(e) => e.stopPropagation()}
                >
                    <CommandEmpty>No results found.</CommandEmpty>
                    <CommandGroup>
                        {filteredOptions.map((option) => (
                        <CommandItem
                            key={option.value}
                            value={option.label}
                            onMouseDown={(e) => e.preventDefault()}
                            onSelect={() => {
                            onChange([...safeSelected, option.value]);
                            setQuery('');
                            }}
                            className="cursor-pointer"
                        >
                            {option.label}
                        </CommandItem>
                        ))}
                    </CommandGroup>
                    {showCreatable && (
                    <CommandGroup>
                        <CommandItem
                            key={query}
                            value={query}
                            onMouseDown={(e) => e.preventDefault()}
                            onSelect={handleSelectCreatable}
                            className="cursor-pointer text-primary"
                        >
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Create "{query.trim()}"
                        </CommandItem>
                    </CommandGroup>
                    )}
                    {safeSelected.length > 0 && (
                        <CommandGroup>
                            <div className="space-y-1 p-2 border-t mt-2 pt-2">
                                <div className="flex items-center justify-between px-2 mb-1">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Selected ({safeSelected.length})</p>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="p-0 h-auto text-[10px] font-bold text-muted-foreground hover:text-destructive"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            onChange([]);
                                            setIsOpen(false);
                                        }}
                                    >
                                        Clear all
                                    </Button>
                                </div>
                                {safeSelected.slice(0, 5).map(value => (
                                    <div key={value} className="flex items-center justify-between rounded-md hover:bg-accent group/item">
                                        <span className="text-xs truncate px-2 py-1">{selectedMap.get(value)}</span>
                                        <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="h-6 w-6 opacity-0 group-hover/item:opacity-100 transition-opacity" 
                                        onClick={(e) => handleUnselect(e, value)}
                                        >
                                            <X className="h-3 w-3" />
                                        </Button>
                                    </div>
                                ))}
                                {safeSelected.length > 5 && (
                                    <p className="text-[10px] text-center text-muted-foreground pt-1 italic">And {safeSelected.length - 5} more...</p>
                                )}
                            </div>
                        </CommandGroup>
                    )}
                </CommandList>
            </Command>
        </PopoverContent>
        </Popover>

        <Dialog open={isListOpen} onOpenChange={setIsListOpen}>
            <DialogContent 
                className="sm:max-w-md max-h-[90vh] flex flex-col p-0 overflow-hidden"
                onOpenAutoFocus={(e) => e.preventDefault()}
            >
                <div className="p-6 pb-2 shrink-0">
                    <DialogHeader>
                        <div className="flex items-center gap-2 mb-1">
                            <div className="p-2 bg-primary/10 rounded-full">
                                <ListFilter className="h-4 w-4 text-primary" />
                            </div>
                            <DialogTitle>Selected Items</DialogTitle>
                        </div>
                        <p className="text-sm text-muted-foreground">You have {safeSelected.length} items selected for this filter.</p>
                    </DialogHeader>
                </div>
                
                <div className="flex-1 overflow-y-auto overscroll-contain px-6 py-4">
                    <div className="flex flex-wrap gap-2">
                        {safeSelected.map(value => (
                            <Badge key={value} variant="secondary" className="pl-3 pr-1 py-1 h-8 text-sm gap-2 border-primary/10 transition-all hover:border-primary/30">
                                <span className="truncate max-w-[200px]">{selectedMap.get(value)}</span>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 rounded-full hover:bg-destructive hover:text-white"
                                    onClick={(e) => handleUnselect(e, value)}
                                >
                                    <X className="h-3 w-3" />
                                </Button>
                            </Badge>
                        ))}
                    </div>
                </div>

                <div className="p-4 bg-muted/10 border-t flex items-center justify-between shrink-0">
                    <Button
                        variant="outline"
                        size="sm"
                        className="text-xs text-destructive hover:bg-destructive/10 h-10 px-4 rounded-xl"
                        onClick={() => {
                            onChange([]);
                            setIsListOpen(false);
                        }}
                    >
                        Clear All
                    </Button>
                    <DialogClose asChild>
                        <Button className="h-10 px-6 rounded-xl font-bold">Done</Button>
                    </DialogClose>
                </div>
            </DialogContent>
        </Dialog>
    </>
  );
});