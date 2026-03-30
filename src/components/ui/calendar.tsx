
"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { DayPicker, CaptionProps, useDayPicker, useNavigation } from "react-day-picker"
import { format, setMonth, setYear } from "date-fns"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./select"

export type CalendarProps = React.ComponentProps<typeof DayPicker>

function CustomCaption(props: CaptionProps) {
  const { fromYear = 2000, toYear = 2100 } = useDayPicker();
  const { goToMonth, nextMonth, previousMonth } = useNavigation();
  const today = React.useMemo(() => new Date(), []);
  const months = React.useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) => new Date(new Date().getFullYear(), i, 1)),
    []
  )
  const years = Array.from({ length: (toYear - fromYear) + 1 }, (_, i) => fromYear + i);
  
  const handleMonthChange = (value: string) => {
    const newDate = setMonth(props.displayMonth, parseInt(value, 10));
    goToMonth(newDate);
  };
  
  const handleYearChange = (value: string) => {
    const newDate = setYear(props.displayMonth, parseInt(value, 10));
    goToMonth(newDate);
  };

  return (
    <div className="space-y-3 px-2 py-1.5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-0.5">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-muted-foreground">Pick Date</p>
          <p className="text-sm font-semibold text-foreground">{format(props.displayMonth, 'MMMM yyyy')}</p>
        </div>
        <button
          type="button"
          onClick={() => goToMonth(today)}
          className="w-full rounded-full border border-border/60 bg-muted/35 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground sm:w-auto"
        >
          Today
        </button>
      </div>
      <div className="flex items-center justify-center gap-2 sm:gap-3">
        <button 
            type="button"
            onClick={() => previousMonth && goToMonth(previousMonth)}
            disabled={!previousMonth}
            className={cn(buttonVariants({ variant: "outline" }), "h-8 w-8 rounded-full border-border/60 bg-background/60 p-0 opacity-80 shadow-sm hover:bg-muted/60 hover:opacity-100")}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
      <div className="flex min-w-0 flex-1 justify-center gap-2">
        <Select
          value={String(props.displayMonth.getMonth())}
          onValueChange={handleMonthChange}
        >
          <SelectTrigger className="h-9 w-[112px] min-w-0 rounded-xl border-border/60 bg-background/70 px-3 text-sm font-medium shadow-sm focus:ring-0 sm:w-[126px]">
            <SelectValue>{format(props.displayMonth, 'MMMM')}</SelectValue>
          </SelectTrigger>
          <SelectContent className="rounded-2xl border-border/60">
            {months.map((month, index) => (
              <SelectItem key={index} value={String(index)}>
                {format(month, 'MMMM')}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={String(props.displayMonth.getFullYear())}
          onValueChange={handleYearChange}
        >
          <SelectTrigger className="h-9 w-[84px] min-w-0 rounded-xl border-border/60 bg-background/70 px-3 text-sm font-medium shadow-sm focus:ring-0 sm:w-[92px]">
            <SelectValue>{props.displayMonth.getFullYear()}</SelectValue>
          </SelectTrigger>
          <SelectContent className="max-h-64 rounded-2xl border-border/60">
            {years.map((year) => (
              <SelectItem key={year} value={String(year)}>
                {year}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
        <button 
            type="button"
            onClick={() => nextMonth && goToMonth(nextMonth)}
            disabled={!nextMonth}
            className={cn(buttonVariants({ variant: "outline" }), "h-8 w-8 rounded-full border-border/60 bg-background/60 p-0 opacity-80 shadow-sm hover:bg-muted/60 hover:opacity-100")}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
      </div>
    </div>
  )
}


function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3.5", className)}
      classNames={{
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
        month: "space-y-4",
        caption: "hidden", // We use a fully custom caption
        table: "w-full border-collapse space-y-1.5 flex flex-col items-center",
        head_row: "mb-1 flex",
        head_cell:
          "text-muted-foreground rounded-md w-9 sm:w-10 font-semibold text-[0.68rem] sm:text-[0.72rem] uppercase tracking-[0.16em] sm:tracking-[0.18em]",
        row: "flex w-full mt-1.5 justify-between",
        cell: "h-9 w-9 sm:h-10 sm:w-10 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-xl [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-accent/80 first:[&:has([aria-selected])]:rounded-l-xl last:[&:has([aria-selected])]:rounded-r-xl focus-within:relative focus-within:z-20",
        day: cn(
          buttonVariants({ variant: "ghost" }),
          "h-9 w-9 sm:h-10 sm:w-10 rounded-xl p-0 text-sm font-medium aria-selected:opacity-100 hover:bg-accent/70"
        ),
        day_range_end: "day-range-end",
        day_selected:
          "bg-primary text-primary-foreground shadow-[0_14px_26px_-16px_hsl(var(--primary)/0.7)] hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
        day_today: "bg-accent/70 text-accent-foreground ring-1 ring-border/60",
        day_outside:
          "day-outside text-muted-foreground opacity-50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground",
        day_disabled: "text-muted-foreground opacity-50",
        day_range_middle:
          "aria-selected:bg-accent aria-selected:text-accent-foreground",
        day_hidden: "invisible",
        ...classNames,
      }}
      components={{
        Caption: CustomCaption,
      }}
      fromYear={2000}
      toYear={2100}
      {...props}
    />
  )
}
Calendar.displayName = "Calendar"

export { Calendar }
