import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { CalendarIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import type { DateRange as DayPickerDateRange } from 'react-day-picker'

type DateRange = {
  start_day?: string
  end_day?: string
}

type DateRangePickerProps = {
  value?: DateRange
  onChange: (range: DateRange) => void
  placeholder?: string
  className?: string
  allowClear?: boolean
}

function parseLocalDate(value?: string) {
  if (!value) return undefined

  const [year, month, day] = value.split('-').map(Number)
  if (!year || !month || !day) return undefined

  return new Date(year, month - 1, day)
}

export function DateRangePicker({
  value,
  onChange,
  placeholder = 'Огнооны хүрээ сонгох',
  className,
  allowClear = true,
}: DateRangePickerProps) {
  const [appliedStartDate, setAppliedStartDate] = useState<Date | undefined>(
    parseLocalDate(value?.start_day)
  )
  const [appliedEndDate, setAppliedEndDate] = useState<Date | undefined>(
    parseLocalDate(value?.end_day)
  )

  const [range, setRange] = useState<DayPickerDateRange | undefined>(
    appliedStartDate
      ? { from: appliedStartDate, to: appliedEndDate }
      : undefined
  )
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const start = parseLocalDate(value?.start_day)
    const end = parseLocalDate(value?.end_day)
    setAppliedStartDate(start)
    setAppliedEndDate(end)
    setRange(start ? { from: start, to: end } : undefined)
  }, [value?.start_day, value?.end_day])

  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen) {
      setRange(
        appliedStartDate
          ? { from: appliedStartDate, to: appliedEndDate }
          : undefined
      )
    }
    setOpen(isOpen)
  }

  const handleSelect = (selected: DayPickerDateRange | undefined) => {
    setRange(selected)

    if (selected?.from && selected?.to) {
      const newRange: DateRange = {
        start_day: format(selected.from, 'yyyy-MM-dd'),
        end_day: format(selected.to, 'yyyy-MM-dd'),
      }
      setAppliedStartDate(selected.from)
      setAppliedEndDate(selected.to)
      onChange(newRange)
    } else if (selected?.from) {
      // Эхний өдөр сонгогдсон, хоёр дахийг хүлээж байна
      const newRange: DateRange = {
        start_day: format(selected.from, 'yyyy-MM-dd'),
        end_day: undefined,
      }
      onChange(newRange)
    }
  }

  const handleClear = () => {
    setRange(undefined)
    setAppliedStartDate(undefined)
    setAppliedEndDate(undefined)
    onChange({ start_day: undefined, end_day: undefined })
    setOpen(false)
  }

  const formatDateRange = () => {
    if (appliedStartDate && appliedEndDate) {
      return `${format(appliedStartDate, 'yyyy.MM.dd')} - ${format(
        appliedEndDate,
        'yyyy.MM.dd'
      )}`
    }
    if (appliedStartDate) {
      return `${format(appliedStartDate, 'yyyy.MM.dd')} - ...`
    }
    if (appliedEndDate) {
      return `... - ${format(appliedEndDate, 'yyyy.MM.dd')}`
    }
    return placeholder
  }

  const hasValue = appliedStartDate || appliedEndDate

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant='outline'
          data-empty={!hasValue}
          className={cn(
            'data-[empty=true]:text-muted-foreground h-8 justify-start text-start font-normal',
            className
          )}
        >
          <CalendarIcon className='me-2 h-4 w-4 opacity-50' />
          {formatDateRange()}
        </Button>
      </PopoverTrigger>
      <PopoverContent className='w-auto p-0' align='start'>
        <div className='flex flex-col gap-2 p-3'>
          <Calendar
            mode='range'
            selected={range}
            onSelect={handleSelect}
            numberOfMonths={2}
          />
          {allowClear ? (
            <div className='flex justify-end gap-2 border-t px-3 pt-2'>
              <Button variant='outline' size='sm' onClick={handleClear}>
                Цэвэрлэх
              </Button>
            </div>
          ) : null}
        </div>
      </PopoverContent>
    </Popover>
  )
}
