
'use client';

import * as React from 'react';
import { X, PlusCircle } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import {
  Command,
  CommandGroup,
  CommandItem,
  CommandList,
  CommandEmpty
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
  onCreate?: (value: string) => void;
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
  
  const filteredOptions = options.filter(
    (option) => !selected.includes(option.value)
  );

  const showCreatable = creatable && query.trim() && !options.some(opt => opt.label.toLowerCase() === query.trim().toLowerCase());
  
  const handleSelectCreatable = React.useCallback(() => {
    if (showCreatable) {
      const newValue = query.trim();
      if (newValue) {
        if (!selected.includes(newValue)) {
            if (onCreate) {
              onCreate(newValue);
            }
            onChange([...selected, newValue]);
        }
        setQuery('');
      }
    }
  }, [query, showCreatable, selected, onCreate, onChange]);

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
    <Command onKeyDown={handleKeyDown} className={cn('overflow-visible bg-transparent', className)}>
      <div className="group rounded-md border border-input px-3 py-2 text-sm ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
        <div className="flex flex-wrap gap-1">
          {selected.map((value) => {
             const option = options.find(o => o.value === value);
             return (
              <Badge key={value} variant="secondary">
                {option ? option.label : value}
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
            className="ml-2 flex-1 bg-transparent outline-none placeholder:text-muted-foreground"
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
                    <React.Fragment>
                        <CommandPrimitive.Separator />
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
                                Create "{query}"
                            </CommandItem>
                        </CommandGroup>
                    </React.Fragment>
                )}
            </CommandList>
          </div>
        ) : null}
      </div>
    </Command>
  );
}
