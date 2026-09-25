"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";
import "react-day-picker/src/style.css";

import { cn } from "./utils";
import { buttonVariants } from "./button";

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: React.ComponentProps<typeof DayPicker>) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3.5 bg-white dark:bg-gray-950 rounded-2xl select-none", className)}
      classNames={{
        months: "flex flex-col sm:flex-row gap-6",
        month: "flex flex-col gap-3",
        month_caption: "flex justify-center pt-1 relative items-center w-full mb-1",
        caption_label: "text-sm font-semibold text-gray-900 dark:text-gray-100",
        nav: "flex items-center justify-between w-full absolute top-1 px-1 z-10 pointer-events-none",
        button_previous: cn(
          buttonVariants({ variant: "outline" }),
          "size-7 bg-white dark:bg-gray-900 p-0 opacity-70 hover:opacity-100 rounded-lg pointer-events-auto shadow-2xs border-gray-200 dark:border-gray-800"
        ),
        button_next: cn(
          buttonVariants({ variant: "outline" }),
          "size-7 bg-white dark:bg-gray-900 p-0 opacity-70 hover:opacity-100 rounded-lg pointer-events-auto shadow-2xs border-gray-200 dark:border-gray-800"
        ),
        month_grid: "w-full border-collapse space-y-1",
        weekdays: "flex justify-between mb-1",
        weekday: "text-gray-400 dark:text-gray-500 rounded-md w-9 font-medium text-[0.8rem] text-center",
        week: "flex justify-between w-full mt-1.5",
        day: "size-9 p-0 text-center text-xs relative [&:has([aria-selected])]:bg-transparent focus-within:relative focus-within:z-20",
        day_button: cn(
          buttonVariants({ variant: "ghost" }),
          "size-9 p-0 font-normal rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        ),
        range_start: "!bg-black !text-white dark:!bg-white dark:!text-black !rounded-md font-bold shadow-xs",
        range_end: "!bg-black !text-white dark:!bg-white dark:!text-black !rounded-md font-bold shadow-xs",
        selected: "!bg-black !text-white dark:!bg-white dark:!text-black !rounded-md font-bold shadow-xs",
        range_middle: "!bg-gray-100 !text-gray-900 dark:!bg-gray-800 dark:!text-gray-100 !rounded-none",
        today: "font-bold text-blue-600 dark:text-blue-400",
        outside: "text-gray-300 dark:text-gray-600 opacity-50",
        disabled: "text-gray-300 dark:text-gray-700 opacity-40 pointer-events-none",
        hidden: "invisible",
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation, className: chevronClass, ...chevronProps }) =>
          orientation === "left" ? (
            <ChevronLeft className={cn("size-4", chevronClass)} {...chevronProps} />
          ) : (
            <ChevronRight className={cn("size-4", chevronClass)} {...chevronProps} />
          ),
      }}
      {...props}
    />
  );
}

export { Calendar };
