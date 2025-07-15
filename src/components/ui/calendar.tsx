
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
  const months = Array.from({ length: 12 }, (_, i) => new Date(new Date().getFullYear(), i, 1));
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
    <div className="flex items-center justify-between px-2 py-1.5">
      <div className="flex items-center gap-1">
        <button 
            onClick={() => previousMonth && goToMonth(previousMonth)}
            disabled={!previousMonth}
            className={cn(buttonVariants({ variant: "outline" }), "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100")}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
      </div>
      <div className="flex justify-center gap-2">
        <Select
          value={String(props.displayMonth.getMonth())}
          onValueChange={handleMonthChange}
        >
          <SelectTrigger className="w-[120px] focus:ring-0">
            <SelectValue>{format(props.displayMonth, 'MMMM')}</SelectValue>
          </SelectTrigger>
          <SelectContent>
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
          <SelectTrigger className="w-[80px] focus:ring-0">
            <SelectValue>{props.displayMonth.getFullYear()}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {years.map((year) => (
              <SelectItem key={year} value={String(year)}>
                {year}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-center gap-1">
        <button 
            onClick={() => nextMonth && goToMonth(nextMonth)}
            disabled={!nextMonth}
            className={cn(buttonVariants({ variant: "outline" }), "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100")}
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
      className={cn("p-3", className)}
      classNames={{
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
        month: "space-y-4",
        caption: "hidden", // We use a fully custom caption
        table: "w-full border-collapse space-y-1",
        head_row: "flex",
        head_cell:
          "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]",
        row: "flex w-full mt-2",
        cell: "h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
        day: cn(
          buttonVariants({ variant: "ghost" }),
          "h-9 w-9 p-0 font-normal aria-selected:opacity-100"
        ),
        day_range_end: "day-range-end",
        day_selected:
          "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
        day_today: "bg-accent text-accent-foreground",
        day_outside:
          "day-outside text-muted-foreground aria-selected:bg-accent/50 aria-selected:text-muted-foreground",
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
