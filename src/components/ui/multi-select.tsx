
'use client';

import * as React from 'react';
import { X, PlusCircle } from 'lucide-react';

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
}

export function MultiSelect({
  options,
  selected,
  onChange,
  onCreate,
  placeholder = 'Select...',
  className,
  creatable = false,
}: MultiSelectProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  
  const [isOpen, setIsOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');
  
  const handleUnselect = React.useCallback(
    (e: React.MouseEvent | React.KeyboardEvent, value: string) => {
      e.preventDefault();
      e.stopPropagation();
      const newSelected = selected.filter((s) => s !== value);
      onChange(newSelected);
      if (newSelected.length <= 1) {
        setIsOpen(false);
      }
    },
    [onChange, selected]
  );
  
  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      const input = inputRef.current;
      if (input) {
        if (e.key === 'Delete' || e.key === 'Backspace') {
          if (input.value === '') {
            handleUnselect(e, selected[selected.length - 1]);
          }
        }
        if (e.key === 'Escape') {
          input.blur();
        }
      }
    },
    [handleUnselect, selected]
  );

  const allOptions = [...options];
  
  const selectedMap = new Map<string, string>();
  selected.forEach(value => {
    const option = allOptions.find(o => o.value === value);
    selectedMap.set(value, option ? option.label : value);
  });

  // Also add any selected values that are not in the predefined options (for creatable)
  selected.forEach(value => {
      if (!options.some(o => o.value === value)) {
          if (!allOptions.some(o => o.value === value)) {
              allOptions.push({ value, label: value });
          }
      }
  });

  const filteredOptions = allOptions.filter(
    (option) => !selected.includes(option.value)
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
        onChange([...selected, newId]);
      }
    } else {
      onChange([...selected, newValue]);
    }
    setQuery('');
  }, [showCreatable, query, onCreate, onChange, selected]);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <div 
          className={cn("group flex items-center rounded-md border border-input h-auto min-h-10 w-full px-3 py-1 text-sm ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2", className)}
          role="button"
          aria-expanded={isOpen}
          onClick={() => setIsOpen(true)}
        >
          <div className="flex flex-wrap gap-1 items-center flex-grow">
            {selected.length === 0 && <span className="text-muted-foreground">{placeholder}</span>}
            {selected.length > 0 && selected.map(value => {
                const label = selectedMap.get(value);
                return (
                    <Badge key={value} variant="secondary" className="whitespace-nowrap">
                        {label}
                        <button
                          className="ml-1 rounded-full outline-none ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2"
                          onKeyDown={(e) => { if (e.key === 'Enter') handleUnselect(e, value); }}
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={(e) => handleUnselect(e, value)}
                        >
                          <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                        </button>
                    </Badge>
                );
            })}
          </div>
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
          <Command onKeyDown={handleKeyDown} className={cn('overflow-visible bg-transparent', className)}>
            <div className="flex items-center border-b px-3" cmdk-input-wrapper="">
                <CommandPrimitive.Input
                    ref={inputRef}
                    value={query}
                    onValueChange={setQuery}
                    onBlur={() => setIsOpen(false)}
                    onFocus={() => setIsOpen(true)}
                    placeholder={placeholder}
                    className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
                />
            </div>
            <CommandList className="max-h-60 overflow-y-auto">
                <CommandEmpty>No results found.</CommandEmpty>
                <CommandGroup>
                    {filteredOptions.map((option) => (
                    <CommandItem
                        key={option.value}
                        value={option.label}
                        onMouseDown={(e) => e.preventDefault()}
                        onSelect={() => {
                          onChange([...selected, option.value]);
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
                {selected.length > 0 && (
                    <CommandGroup>
                        <div className="space-y-1 p-2">
                            <div className="flex items-center justify-between px-2">
                                <p className="text-xs font-medium text-muted-foreground">Selected</p>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="p-0 h-auto text-xs text-muted-foreground hover:text-foreground"
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
                            {selected.map(value => {
                                return (
                                <div key={value} className="flex items-center justify-between rounded-md hover:bg-accent">
                                    <span className="text-sm truncate px-2 py-1.5">{selectedMap.get(value)}</span>
                                    <Button 
                                      variant="ghost" 
                                      size="icon" 
                                      className="h-7 w-7" 
                                      onClick={(e) => handleUnselect(e, value)}
                                    >
                                        <X className="h-3 w-3" />
                                    </Button>
                                </div>
                                );
                            })}
                        </div>
                    </CommandGroup>
                )}
            </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
