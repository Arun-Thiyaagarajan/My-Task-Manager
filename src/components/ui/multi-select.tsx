
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

  return (
    <Command onKeyDown={handleKeyDown} className={cn('overflow-visible bg-transparent h-full', className)}>
      <div className="group rounded-md border border-input px-3 py-2 text-sm ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 h-full">
        <div className="flex flex-wrap gap-1 h-full items-center">
          {selected.map((value) => {
             const option = options.find(o => o.value === value);
             return (
              <Badge key={value} variant="secondary">
                {option ? option.label : ''}
                <button
                  className="ml-1 rounded-full outline-none ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onClick={() => handleUnselect(value)}
                >
                  <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                </button>
              </Badge>
            );
          })}
          <CommandPrimitive.Input
            ref={inputRef}
            value={query}
            onValueChange={setQuery}
            onBlur={() => setIsOpen(false)}
            onFocus={() => setIsOpen(true)}
            placeholder={selected.length > 0 ? '' : placeholder}
            className="ml-2 flex-1 bg-transparent outline-none placeholder:text-muted-foreground h-full"
          />
        </div>
      </div>
      <div className="relative mt-2">
        {isOpen ? (
          <div className="absolute top-0 z-10 w-full rounded-md border bg-popover text-popover-foreground shadow-md outline-none animate-in">
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
            </CommandList>
          </div>
        ) : null}
      </div>
    </Command>
  );
}

    