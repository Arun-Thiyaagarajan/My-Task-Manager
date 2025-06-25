'use client';

import * as React from 'react';
import { X } from 'lucide-react';

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
}

export function MultiSelect({
  options,
  selected,
  onChange,
  onCreate,
  placeholder = 'Select...',
  className,
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
  
  const handleCreate = () => {
    if (onCreate && query.trim()) {
      const newOptionValue = query.trim();
      if (!options.some(o => o.label.toLowerCase() === newOptionValue.toLowerCase()) && !selected.includes(newOptionValue)) {
        onCreate(newOptionValue);
      }
      onChange([...selected, newOptionValue]);
      setQuery('');
      inputRef.current?.blur();
    }
  };

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
        if (e.key === 'Escape') {
          input.blur();
        }
      }
    },
    [handleUnselect, selected]
  );
  
  const filteredOptions = options.filter(
    (option) => !selected.includes(option.value)
  );

  return (
    <Command onKeyDown={handleKeyDown} className={cn('overflow-visible', className)}>
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
                {filteredOptions.filter(o => o.label.toLowerCase().includes(query.toLowerCase().trim())).map((option) => (
                  <CommandItem
                    key={option.value}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onSelect={() => {
                      onChange([...selected, option.value]);
                      setQuery('');
                      inputRef.current?.blur();
                    }}
                    className="cursor-pointer"
                  >
                    {option.label}
                  </CommandItem>
                ))}
                {onCreate && query.trim() && !options.some(o => o.label.toLowerCase() === query.trim().toLowerCase()) && (
                  <CommandItem
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onSelect={handleCreate}
                    className="cursor-pointer"
                  >
                    Create "{query}"
                  </CommandItem>
                )}
              </CommandGroup>
            </CommandList>
          </div>
        ) : null}
      </div>
    </Command>
  );
}
