"use client";

import * as React from "react";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, subDays } from "date-fns";
import { Calendar as CalendarIcon, X } from "lucide-react";
import type { DateRange } from "react-day-picker";

import { cn } from "./utils";
import { Button } from "./button";
import { Calendar } from "./calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "./popover";

export interface DatePickerWithRangeProps {
  className?: string;
  date?: DateRange;
  setDate: (date: DateRange | undefined) => void;
  placeholder?: string;
  align?: "center" | "start" | "end";
  showPresets?: boolean;
}

export function DatePickerWithRange({
  className,
  date,
  setDate,
  placeholder = "Pick a date range",
  align = "end",
  showPresets = true,
}: DatePickerWithRangeProps) {
  const [open, setOpen] = React.useState(false);

  const handlePreset = (type: "today" | "this_week" | "this_month" | "this_year" | "last_30_days") => {
    const now = new Date();
    if (type === "today") {
      setDate({ from: now, to: now });
    } else if (type === "this_week") {
      setDate({
        from: startOfWeek(now, { weekStartsOn: 1 }),
        to: endOfWeek(now, { weekStartsOn: 1 }),
      });
    } else if (type === "this_month") {
      setDate({
        from: startOfMonth(now),
        to: endOfMonth(now),
      });
    } else if (type === "this_year") {
      setDate({
        from: startOfYear(now),
        to: endOfYear(now),
      });
    } else if (type === "last_30_days") {
      setDate({
        from: subDays(now, 30),
        to: now,
      });
    }
    setOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDate(undefined);
  };

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant="outline"
            className={cn(
              "h-9 justify-start text-left font-normal bg-white dark:bg-gray-950 border-gray-200 dark:border-gray-800 rounded-xl px-3 shadow-2xs hover:bg-gray-50 dark:hover:bg-gray-900 text-xs sm:text-sm gap-2 shrink-0 transition-colors",
              !date?.from && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="h-4 w-4 text-blue-600 shrink-0" />
            <span className="font-semibold text-gray-900 dark:text-gray-100">
              {date?.from ? (
                date.to ? (
                  <>
                    {format(date.from, "LLL dd, y")} - {format(date.to, "LLL dd, y")}
                  </>
                ) : (
                  format(date.from, "LLL dd, y")
                )
              ) : (
                <span>{placeholder}</span>
              )}
            </span>
            {date?.from && (
              <span
                role="button"
                tabIndex={0}
                onClick={handleClear}
                className="ml-1 p-0.5 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-700 transition-colors"
                title="Clear date range"
              >
                <X className="w-3.5 h-3.5" />
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-auto p-0 z-50 bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-2xl overflow-hidden"
          align={align}
        >
          {showPresets && (
            <div className="flex items-center gap-1.5 p-2.5 border-b border-gray-100 dark:border-gray-800 bg-gray-50/70 dark:bg-gray-900/40 overflow-x-auto text-xs">
              <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider px-1">Presets:</span>
              <button
                type="button"
                onClick={() => handlePreset("today")}
                className="px-2 py-1 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors font-medium"
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => handlePreset("this_week")}
                className="px-2 py-1 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors font-medium"
              >
                This Week
              </button>
              <button
                type="button"
                onClick={() => handlePreset("this_month")}
                className="px-2 py-1 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors font-medium"
              >
                This Month
              </button>
              <button
                type="button"
                onClick={() => handlePreset("this_year")}
                className="px-2 py-1 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors font-medium"
              >
                This Year
              </button>
              {date?.from && (
                <button
                  type="button"
                  onClick={() => {
                    setDate(undefined);
                    setOpen(false);
                  }}
                  className="px-2 py-1 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors font-medium ml-auto"
                >
                  Clear
                </button>
              )}
            </div>
          )}
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={date?.from || new Date()}
            selected={date}
            onSelect={setDate}
            numberOfMonths={2}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
