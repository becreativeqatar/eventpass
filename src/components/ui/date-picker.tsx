"use client"

import { format } from "date-fns"
import { CalendarIcon } from "lucide-react"
import { useState } from "react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface DatePickerProps {
  value?: Date | string | null
  onChange: (date: Date | undefined) => void
  placeholder?: string
  disabled?: boolean
  id?: string
  className?: string
  minDate?: Date | string | null
  maxDate?: Date | string | null
}

function toDate(value: Date | string | null | undefined): Date | undefined {
  if (!value) return undefined
  if (value instanceof Date) return value
  // Parse YYYY-MM-DD as local date (not UTC) to avoid off-by-one timezone issues
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (match) {
    return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
  }
  const parsed = new Date(value)
  return isNaN(parsed.getTime()) ? undefined : parsed
}

export function DatePicker({
  value,
  onChange,
  placeholder = "Pick a date",
  disabled = false,
  id,
  className,
  minDate,
  maxDate,
}: DatePickerProps) {
  const [open, setOpen] = useState(false)
  const selected = toDate(value)
  const fromDate = toDate(minDate)
  const untilDate = toDate(maxDate)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          variant="outline"
          disabled={disabled}
          className={cn(
            "w-full justify-start text-left font-normal h-9",
            !selected && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {selected ? format(selected, "PPP") : <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start" side="bottom" avoidCollisions>
        <Calendar
          mode="single"
          selected={selected}
          onSelect={(date) => {
            onChange(date)
            setOpen(false)
          }}
          disabled={(date) => {
            if (fromDate && date < fromDate) return true
            if (untilDate && date > untilDate) return true
            return false
          }}
          defaultMonth={selected || fromDate}
          autoFocus
        />
      </PopoverContent>
    </Popover>
  )
}
