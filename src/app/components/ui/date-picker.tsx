"use client";

// The single app-wide date picker (same look as DatePickerWithRange in date-range-picker.tsx).
// Drop-in for a native date input: `value` is "yyyy-MM-dd" (or a Date) and `onChange`
// receives { target: { value: "yyyy-MM-dd" } }, so existing handlers keep working.

import * as React from "react";
import { format, isValid, parse, startOfDay } from "date-fns";
import { Calendar as CalendarIcon, X } from "lucide-react";

import { cn } from "./utils";
import { Button } from "./button";
import { Calendar } from "./calendar";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";

type DateInput = string | Date | null | undefined;

export interface DatePickerProps {
  value?: DateInput;
  /** input-compatible change event: e.target.value is "yyyy-MM-dd" ("" when cleared) */
  onChange?: (e: { target: { value: string; name?: string } }) => void;
  /** same value, without the event wrapper */
  onValueChange?: (value: string) => void;
  /** Date-based callback (for pages that keep Date objects) */
  onDateChange?: (date: Date | undefined) => void;
  min?: DateInput;
  max?: DateInput;
  name?: string;
  id?: string;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  align?: "center" | "start" | "end";
  side?: "top" | "bottom" | "left" | "right";
  /** keep the calendar on `side` instead of flipping when space is tight */
  lockSide?: boolean;
  /** "md" = form field (default), "sm" = compact toolbar control */
  size?: "sm" | "md";
  /** date-fns format for the trigger label */
  displayFormat?: string;
  clearable?: boolean;
  showToday?: boolean;
}

export const toDate = (v: DateInput): Date | undefined => {
  if (!v) return undefined;
  if (v instanceof Date) return isValid(v) ? v : undefined;
  const s = String(v).slice(0, 10);
  const d = parse(s, "yyyy-MM-dd", new Date());
  return isValid(d) ? d : undefined;
};

export function DatePicker({
  value,
  onChange,
  onValueChange,
  onDateChange,
  min,
  max,
  name,
  id,
  placeholder = "Pick a date",
  disabled,
  required,
  className,
  align = "start",
  side = "bottom",
  lockSide = false,
  size = "md",
  displayFormat = "dd MMM yyyy",
  clearable,
  showToday = true,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false);
  // supports uncontrolled use (no value prop)
  const [inner, setInner] = React.useState<Date | undefined>(undefined);
  const controlled = value !== undefined;
  const selected = controlled ? toDate(value) : inner;
  const minDate = toDate(min);
  const maxDate = toDate(max);
  const canClear = clearable ?? !required;

  const emit = (d: Date | undefined) => {
    const str = d ? format(d, "yyyy-MM-dd") : "";
    if (!controlled) setInner(d);
    onChange?.({ target: { value: str, name } });
    onValueChange?.(str);
    onDateChange?.(d);
  };

  const disabledDays: any[] = [];
  if (minDate) disabledDays.push({ before: startOfDay(minDate) });
  if (maxDate) disabledDays.push({ after: startOfDay(maxDate) });

  const now = new Date();
  const todayAllowed =
    (!minDate || startOfDay(now) >= startOfDay(minDate)) && (!maxDate || startOfDay(now) <= startOfDay(maxDate));

  return (
    <Popover open={open} onOpenChange={(o) => !disabled && setOpen(o)}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn(
            "justify-start text-left font-normal gap-2 bg-white dark:bg-gray-950 transition-colors",
            size === "sm"
              ? "h-9 rounded-xl px-3 text-xs sm:text-sm border-gray-200 dark:border-gray-800 shadow-2xs hover:bg-gray-50 dark:hover:bg-gray-900 shrink-0"
              : "h-10 w-full rounded-lg px-3 text-sm border-gray-300 dark:border-gray-700 shadow-xs hover:bg-gray-50 dark:hover:bg-gray-900",
            disabled && "opacity-60 cursor-not-allowed",
            className
          )}
        >
          <CalendarIcon className="h-4 w-4 text-blue-600 shrink-0" />
          <span className={cn("truncate", selected ? "font-semibold text-gray-900 dark:text-gray-100" : "text-gray-400")}>
            {selected ? format(selected, displayFormat) : placeholder}
          </span>
          {canClear && selected && !disabled && (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                emit(undefined);
              }}
              className="ml-auto p-0.5 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-700 transition-colors"
              title="Clear date"
            >
              <X className="w-3.5 h-3.5" />
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-auto p-0 z-50 bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-2xl overflow-hidden"
        align={align}
        side={side}
        sideOffset={6}
        avoidCollisions={!lockSide}
      >
        {showToday && todayAllowed && (
          <div className="flex items-center gap-1.5 p-2.5 border-b border-gray-100 dark:border-gray-800 bg-gray-50/70 dark:bg-gray-900/40 text-xs">
            <button
              type="button"
              onClick={() => {
                emit(new Date());
                setOpen(false);
              }}
              className="px-2 py-1 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors font-medium"
            >
              Today
            </button>
            {canClear && selected && (
              <button
                type="button"
                onClick={() => {
                  emit(undefined);
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
          mode="single"
          captionLayout="dropdown"
          startMonth={minDate || new Date(1950, 0)}
          endMonth={maxDate || new Date(now.getFullYear() + 10, 11)}
          defaultMonth={selected || (maxDate && maxDate < now ? maxDate : now)}
          selected={selected}
          onSelect={(d) => {
            emit(d || undefined);
            if (d) setOpen(false);
          }}
          disabled={disabledDays.length ? disabledDays : undefined}
          autoFocus
        />
      </PopoverContent>
    </Popover>
  );
}

export default DatePicker;
