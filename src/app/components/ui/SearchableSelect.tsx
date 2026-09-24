import React, { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from './popover';
import { ChevronDown, Search, Check, X } from 'lucide-react';
import { cn } from './utils';

export interface SearchableSelectOption {
  value: string;
  label: string;
  sublabel?: string;
}

interface SearchableSelectProps {
  options: SearchableSelectOption[];
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  className?: string;
  popoverClassName?: string;
  disabled?: boolean;
  icon?: React.ReactNode;
}

export const SearchableSelect: React.FC<SearchableSelectProps> = ({
  options,
  value,
  onValueChange,
  placeholder = "Select...",
  searchPlaceholder = "Search...",
  className,
  popoverClassName,
  disabled = false,
  icon,
}) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const selectedOption = options.find((opt) => String(opt.value) === String(value));

  const filteredOptions = options.filter((opt) =>
    opt.label.toLowerCase().includes(search.toLowerCase()) ||
    (opt.sublabel && opt.sublabel.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild disabled={disabled}>
        <button
          type="button"
          className={cn(
            "flex h-9 items-center justify-between gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 shadow-sm transition-colors hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-200 dark:hover:border-gray-700",
            disabled && "cursor-not-allowed opacity-50",
            className
          )}
        >
          <div className="flex items-center gap-2 truncate">
            {icon}
            <span className="truncate">
              {selectedOption ? selectedOption.label : placeholder}
            </span>
          </div>
          <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent className={cn("w-[220px] p-2 dark:bg-gray-900 dark:border-gray-800", popoverClassName)} align="start">
        <div className="relative mb-2">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-gray-400" />
          <input
            type="text"
            className="w-full rounded-md border border-gray-200 bg-gray-50 pl-8 pr-7 py-1.5 text-xs text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:bg-white focus:outline-none dark:border-gray-800 dark:bg-gray-950 dark:text-gray-100 dark:focus:bg-gray-900"
            placeholder={searchPlaceholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-2 top-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="max-h-56 overflow-y-auto space-y-0.5">
          {filteredOptions.length > 0 ? (
            filteredOptions.map((opt) => {
              const isSelected = String(opt.value) === String(value);
              return (
                <div
                  key={opt.value}
                  onClick={() => {
                    onValueChange(opt.value);
                    setOpen(false);
                    setSearch("");
                  }}
                  className={cn(
                    "flex cursor-pointer items-center justify-between rounded-md px-2.5 py-1.5 text-xs transition-colors",
                    isSelected
                      ? "bg-blue-50 text-blue-700 font-semibold dark:bg-blue-950/60 dark:text-blue-300"
                      : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
                  )}
                >
                  <div className="flex flex-col truncate">
                    <span className="truncate">{opt.label}</span>
                    {opt.sublabel && (
                      <span className="text-[10px] text-gray-400">{opt.sublabel}</span>
                    )}
                  </div>
                  {isSelected && <Check className="h-3.5 w-3.5 text-blue-600 shrink-0" />}
                </div>
              );
            })
          ) : (
            <div className="py-4 text-center text-xs text-gray-400">
              No matching options
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};
