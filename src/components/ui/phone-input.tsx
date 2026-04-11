'use client';

import * as React from 'react';
import { Check, ChevronDown } from 'lucide-react';
import type { CountryCode } from 'libphonenumber-js';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  buildPhoneValue,
  getCountryCallingCode,
  getDefaultPhoneCountry,
  getCountryName,
  getExpectedNationalLength,
  getNationalPhoneDigits,
  getPhoneCountryFromValue,
  getPhoneCountryOptions,
  type PhoneCountryOption,
  sanitizePhoneDigits,
} from '@/lib/phone';

interface PhoneInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> {
  value: string;
  onChange: (value: string) => void;
  onCountryChange?: (country: CountryCode) => void;
  error?: boolean;
}

const ALLOWED_CONTROL_KEYS = new Set([
  'Backspace',
  'Delete',
  'Tab',
  'Enter',
  'Escape',
  'ArrowLeft',
  'ArrowRight',
  'ArrowUp',
  'ArrowDown',
  'Home',
  'End',
]);

const countryOptions = getPhoneCountryOptions();

export const PhoneInput = React.forwardRef<HTMLInputElement, PhoneInputProps>(
  (
    {
      value,
      onChange,
      onCountryChange,
      onBlur,
      onKeyDown,
      onPaste,
      placeholder = '9876543210',
      disabled,
      className,
      error,
      id,
      name,
      'aria-invalid': ariaInvalid,
      ...props
    },
    ref
  ) => {
    const [open, setOpen] = React.useState(false);
    const [country, setCountry] = React.useState<CountryCode>(getPhoneCountryFromValue(value) || getDefaultPhoneCountry());

    React.useEffect(() => {
      const resolvedCountry = getPhoneCountryFromValue(value);
      if (resolvedCountry && resolvedCountry !== country) {
        setCountry(resolvedCountry);
      }
    }, [country, value]);

    const selectedCountry = React.useMemo<PhoneCountryOption>(() => {
      return countryOptions.find((option) => option.code === country) || countryOptions[0];
    }, [country]);

    const nationalNumber = React.useMemo(() => getNationalPhoneDigits(value, country), [country, value]);
    const maxNationalDigits = React.useMemo(() => getExpectedNationalLength(country), [country]);
    const helperText = React.useMemo(() => {
      if (!maxNationalDigits) return null;
      return `${getCountryName(country)} allows up to ${maxNationalDigits} digits.`;
    }, [country, maxNationalDigits]);
    const hasError = error || ariaInvalid === true || ariaInvalid === 'true';

    const clampNationalDigits = React.useCallback(
      (digits: string, targetCountry: CountryCode) => {
        const normalizedDigits = sanitizePhoneDigits(digits);
        const maxDigits = getExpectedNationalLength(targetCountry);
        return maxDigits ? normalizedDigits.slice(0, maxDigits) : normalizedDigits;
      },
      []
    );

    const updateCountry = React.useCallback(
      (nextCountry: CountryCode) => {
        const nextDigits = clampNationalDigits(nationalNumber, nextCountry);
        setCountry(nextCountry);
        onCountryChange?.(nextCountry);
        onChange(buildPhoneValue(nextCountry, nextDigits));
        setOpen(false);
      },
      [clampNationalDigits, nationalNumber, onChange, onCountryChange]
    );

    const handleInputChange = React.useCallback(
      (event: React.ChangeEvent<HTMLInputElement>) => {
        const digits = clampNationalDigits(event.target.value, country);
        onChange(buildPhoneValue(country, digits));
      },
      [clampNationalDigits, country, onChange]
    );

    const handlePaste = React.useCallback(
      (event: React.ClipboardEvent<HTMLInputElement>) => {
        const pastedText = event.clipboardData.getData('text');
        const digits = clampNationalDigits(pastedText, country);
        if (digits !== pastedText) {
          event.preventDefault();
          onChange(buildPhoneValue(country, digits));
        }
        onPaste?.(event);
      },
      [clampNationalDigits, country, onChange, onPaste]
    );

    const handleKeyDown = React.useCallback(
      (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (
          event.ctrlKey ||
          event.metaKey ||
          event.altKey ||
          ALLOWED_CONTROL_KEYS.has(event.key)
        ) {
          onKeyDown?.(event);
          return;
        }

        if (event.key.length === 1 && !/\d/.test(event.key)) {
          event.preventDefault();
        }

        onKeyDown?.(event);
      },
      [onKeyDown]
    );

    return (
      <div className={cn('flex w-full min-w-0 flex-col gap-2', className)}>
        <div className="flex min-w-0 items-center gap-2">
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                role="combobox"
                aria-expanded={open}
                aria-label="Select country code"
                disabled={disabled}
                className={cn(
                  'h-11 w-[6.5rem] shrink-0 justify-between rounded-xl border-border/70 bg-background px-2.5 text-left shadow-sm sm:w-[7rem]',
                  'hover:bg-muted/40',
                  hasError && 'border-destructive/60 focus-visible:ring-destructive/30'
                )}
              >
                <span className="flex min-w-0 items-center gap-1.5 overflow-hidden">
                  <span className="shrink-0 text-base leading-none">{selectedCountry.flag}</span>
                  <span className="shrink-0 text-sm font-semibold text-foreground">{selectedCountry.dialCode}</span>
                </span>
                <ChevronDown className="ml-1 h-4 w-4 shrink-0 opacity-60" />
              </Button>
            </PopoverTrigger>
            <PopoverContent
              align="start"
              sideOffset={8}
              collisionPadding={12}
              className="max-h-[min(15rem,46vh)] w-[min(19rem,calc(100vw-1rem))] overflow-hidden rounded-[1.15rem] border-border/70 p-0 shadow-[0_24px_70px_-38px_rgba(15,23,42,0.35)] sm:max-h-[min(17rem,50vh)] lg:max-h-[min(19rem,54vh)]"
              onWheelCapture={(event) => event.stopPropagation()}
              onTouchMove={(event) => event.stopPropagation()}
            >
              <Command className="overflow-hidden rounded-[1.15rem]">
                <div className="border-b border-border/60 px-2.5 py-2">
                  <CommandInput
                    placeholder="Search country or code..."
                    className="h-9 rounded-lg border border-border/60 bg-background px-3"
                  />
                </div>
                <CommandList
                  className="max-h-[min(11.5rem,36vh)] overscroll-contain pb-1 sm:max-h-[min(13.5rem,40vh)] lg:max-h-[min(15.5rem,44vh)]"
                  onWheelCapture={(event) => event.stopPropagation()}
                  onTouchMove={(event) => event.stopPropagation()}
                  style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }}
                >
                  <CommandEmpty>No country found.</CommandEmpty>
                  <CommandGroup className="p-1.5">
                    {countryOptions.map((option) => (
                      <CommandItem
                        key={option.code}
                        value={`${option.name} ${option.dialCode} ${option.code}`}
                        onSelect={() => updateCountry(option.code)}
                        className="mx-0.5 my-0.5 flex items-center gap-2 rounded-lg px-2.5 py-1.5"
                      >
                        <span className="text-sm leading-none">{option.flag}</span>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium text-foreground">{option.name}</div>
                        </div>
                        <span className="shrink-0 text-xs font-semibold text-muted-foreground">{option.dialCode}</span>
                        <Check className={cn('h-4 w-4 shrink-0', country === option.code ? 'opacity-100' : 'opacity-0')} />
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>

          <div
            className={cn(
              'relative flex min-w-0 flex-1 items-center overflow-hidden rounded-xl border border-input bg-background shadow-sm transition-colors',
              hasError && 'border-destructive/60 focus-within:border-destructive/70 focus-within:ring-1 focus-within:ring-destructive/20',
              !hasError && 'focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/20',
              disabled && 'cursor-not-allowed opacity-50'
            )}
          >
            <input
              {...props}
              ref={ref}
              id={id}
              name={name}
              type="tel"
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete="tel-national"
              placeholder={placeholder}
              value={nationalNumber}
              maxLength={maxNationalDigits ?? undefined}
              disabled={disabled}
              onChange={handleInputChange}
              onBlur={onBlur}
              onPaste={handlePaste}
              onKeyDown={handleKeyDown}
              className="h-11 min-w-0 w-full flex-1 bg-transparent px-3 text-sm font-medium leading-normal tracking-normal outline-none placeholder:font-normal placeholder:text-muted-foreground"
            />
          </div>
        </div>
        {helperText ? (
          <p className="pl-[calc(7rem+0.5rem)] text-[11px] leading-4 text-muted-foreground sm:pl-[calc(7.5rem+0.5rem)]">
            {helperText}
          </p>
        ) : null}
      </div>
    );
  }
);

PhoneInput.displayName = 'PhoneInput';
