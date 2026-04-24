'use client';

import { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { CalendarIcon, Clock3, RotateCcw, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface DateTimePickerProps {
  value: Date | null | undefined;
  onChange: (value: Date | null) => void;
  placeholder?: string;
  className?: string;
  popoverClassName?: string;
  timeFormat?: '12h' | '24h';
  disabled?: boolean;
  disabledDates?: Parameters<typeof Calendar>[0]['disabled'];
  clearLabel?: string;
}

const DATE_FORMAT = 'yyyy-MM-dd';
const TIME_FORMAT = 'HH:mm';

function toDateInputValue(value: Date | null | undefined) {
  return value instanceof Date && !Number.isNaN(value.getTime()) ? format(value, DATE_FORMAT) : '';
}

function toTimeInputValue(value: Date | null | undefined) {
  return value instanceof Date && !Number.isNaN(value.getTime()) ? format(value, TIME_FORMAT) : '';
}

function parseDateInput(raw: string) {
  if (!raw) return null;
  const normalized = raw.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) return null;
  const [year, month, day] = normalized.split('-').map(Number);
  if (!year || !month || !day) return null;
  const next = new Date(year, month - 1, day);
  if (Number.isNaN(next.getTime())) return null;
  if (next.getFullYear() !== year || next.getMonth() !== month - 1 || next.getDate() !== day) return null;
  return next;
}

function parseTimeInput(raw: string) {
  if (!raw) return null;
  const normalized = raw.trim();
  if (!/^\d{2}:\d{2}$/.test(normalized)) return null;
  const [hours, minutes] = normalized.split(':').map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return { hours, minutes };
}

export function DateTimePicker({
  value,
  onChange,
  placeholder = 'Pick a date and time',
  className,
  popoverClassName,
  timeFormat = '12h',
  disabled = false,
  disabledDates,
  clearLabel = 'Clear',
}: DateTimePickerProps) {
  const isValidValue = value instanceof Date && !Number.isNaN(value.getTime());
  const [dateInput, setDateInput] = useState(toDateInputValue(value));
  const [timeInput, setTimeInput] = useState(toTimeInputValue(value));

  useEffect(() => {
    setDateInput(toDateInputValue(value));
    setTimeInput(toTimeInputValue(value));
  }, [value]);

  const displayValue = useMemo(() => {
    if (!isValidValue || !value) return placeholder;
    return format(value, timeFormat === '24h' ? 'PPP HH:mm' : 'PPP p');
  }, [isValidValue, placeholder, timeFormat, value]);

  const applyDatePart = (nextDate: Date | null) => {
    if (!nextDate) {
      onChange(null);
      return;
    }

    const base = isValidValue && value ? new Date(value) : new Date();
    base.setFullYear(nextDate.getFullYear(), nextDate.getMonth(), nextDate.getDate());
    base.setSeconds(0, 0);
    onChange(base);
  };

  const applyTimePart = (hours: number, minutes: number) => {
    const base = isValidValue && value ? new Date(value) : new Date();
    base.setHours(hours, minutes, 0, 0);
    onChange(base);
  };

  const handleDateInputCommit = () => {
    const parsed = parseDateInput(dateInput);
    if (!parsed) {
      setDateInput(toDateInputValue(value));
      return;
    }
    applyDatePart(parsed);
  };

  const handleTimeInputCommit = () => {
    const parsed = parseTimeInput(timeInput);
    if (!parsed) {
      setTimeInput(toTimeInputValue(value));
      return;
    }
    applyTimePart(parsed.hours, parsed.minutes);
  };

  const handleTodayClick = () => {
    const today = new Date();
    if (isValidValue && value) {
      today.setHours(value.getHours(), value.getMinutes(), 0, 0);
    } else {
      today.setHours(9, 0, 0, 0);
    }
    onChange(today);
  };

  return (
    <Popover>
      <PopoverTrigger asChild disabled={disabled}>
        <Button
          variant="outline"
          className={cn(
            "h-12 w-full justify-start rounded-2xl pl-3 pr-4 text-left font-normal shadow-sm",
            !isValidValue && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4 opacity-70" />
          <span className="truncate">{displayValue}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className={cn(
          "w-[min(100vw-1.5rem,42rem)] rounded-[1.4rem] border-border/60 p-0 shadow-[0_24px_60px_-36px_rgba(15,23,42,0.34)]",
          popoverClassName
        )}
      >
        <div className="grid gap-0 md:grid-cols-[minmax(0,1fr)_16rem]">
          <Calendar
            mode="single"
            selected={isValidValue && value ? value : undefined}
            onSelect={(day) => {
              if (!day) return;
              const base = isValidValue && value ? new Date(value) : new Date();
              day.setHours(base.getHours(), base.getMinutes(), 0, 0);
              onChange(day);
            }}
            defaultMonth={isValidValue && value ? value : new Date()}
            initialFocus
            disabled={disabledDates}
          />
          <div className="space-y-4 border-t border-border/55 bg-muted/[0.12] p-4 md:border-l md:border-t-0">
            <div className="grid gap-3">
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Date
                </label>
                <Input
                  type="text"
                  value={dateInput}
                  onChange={(event) => setDateInput(event.target.value)}
                  onBlur={handleDateInputCommit}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      handleDateInputCommit();
                    }
                  }}
                  inputMode="numeric"
                  placeholder="YYYY-MM-DD"
                  className="font-normal"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Time
                </label>
                <div className="relative">
                  <Clock3 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="text"
                    value={timeInput}
                    onChange={(event) => setTimeInput(event.target.value)}
                    onBlur={handleTimeInputCommit}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        handleTimeInputCommit();
                      }
                    }}
                    inputMode="numeric"
                    placeholder="HH:mm"
                    className="pl-9 font-normal"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button type="button" variant="outline" onClick={handleTodayClick} className="rounded-xl font-medium">
                <RotateCcw className="mr-2 h-4 w-4" />
                Today
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => onChange(null)}
                className="rounded-xl font-medium text-muted-foreground"
              >
                <X className="mr-2 h-4 w-4" />
                {clearLabel}
              </Button>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <Button type="button" variant="outline" className="rounded-xl text-xs font-semibold" onClick={() => applyTimePart(9, 0)}>
                9 AM
              </Button>
              <Button type="button" variant="outline" className="rounded-xl text-xs font-semibold" onClick={() => applyTimePart(13, 0)}>
                1 PM
              </Button>
              <Button type="button" variant="outline" className="rounded-xl text-xs font-semibold" onClick={() => applyTimePart(18, 0)}>
                6 PM
              </Button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
