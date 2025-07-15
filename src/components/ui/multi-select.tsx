
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

const MAX_DISPLAYED_ITEMS = 2;

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
    (value: string) => {
      onChange(selected.filter((s) => s !== value));
    },
    [onChange, selected]
  );
  
  // Options that are not already selected.
  const filteredOptions = options.filter(
    (option) => !selected.includes(option.value)
  );

  const lowerCaseQuery = query.trim().toLowerCase();
  // Determine if the "creatable" option should be shown.
  const showCreatable = 
      creatable && 
      lowerCaseQuery.length > 0 && 
      !options.some(opt => opt.label.toLowerCase() === lowerCaseQuery);

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
  
  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      const input = inputRef.current;
      if (input) {
        if (e.key === 'Delete' || e.key === 'Backspace') {
          if (input.value === '') {
            e.preventDefault();
            handleUnselect(selected[selected.length - 1]);
          }
        }
        if (e.key === 'Enter' && showCreatable) {
          e.preventDefault();
          handleSelectCreatable();
        }
        if (e.key === 'Escape') {
          input.blur();
        }
      }
    },
    [handleUnselect, selected, showCreatable, handleSelectCreatable]
  );

  const visibleItems = selected.slice(0, MAX_DISPLAYED_ITEMS);
  const hiddenItemsCount = selected.length - MAX_DISPLAYED_ITEMS;


  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <div 
          className={cn("group flex items-center rounded-md border border-input h-full w-full px-3 py-1 text-sm ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2", className)}
          role="button"
          aria-expanded={isOpen}
          onClick={() => setIsOpen(true)}
        >
          <div className="flex flex-wrap gap-1 items-center flex-grow">
            {selected.length === 0 && <span className="text-muted-foreground">{placeholder}</span>}
            {visibleItems.map((value) => {
               const option = options.find(o => o.value === value);
               return (
                <Badge key={value} variant="secondary" className="whitespace-nowrap">
                  {option ? option.label : value}
                  <button
                    className="ml-1 rounded-full outline-none ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleUnselect(value)
                    }}
                  >
                    <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                  </button>
                </Badge>
              );
            })}
            {hiddenItemsCount > 0 && (
                <Badge variant="secondary">
                    +{hiddenItemsCount} more
                </Badge>
            )}
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
            <CommandList>
                <CommandEmpty>No results found.</CommandEmpty>
                <CommandGroup>
                    {filteredOptions.map((option) => (
                    <CommandItem
                        key={option.value}
                        value={option.label}
                        onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        }}
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
                        onMouseDown={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                        }}
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
                            <p className="text-xs font-medium text-muted-foreground px-2">Selected</p>
                            {selected.map(value => {
                                const option = options.find(o => o.value === value);
                                return (
                                <div key={value} className="flex items-center justify-between rounded-md hover:bg-accent">
                                    <span className="text-sm truncate px-2 py-1.5">{option ? option.label : value}</span>
                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleUnselect(value)}>
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
