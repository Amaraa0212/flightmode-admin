import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { Calendar as CalendarIcon, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Input } from '@/components/ui/input'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

type DateTimePickerProps = {
  selected: Date | undefined
  onSelect: (date: Date | undefined) => void
  placeholder?: string
  disabled?: boolean
}

export function DateTimePicker({
  selected,
  onSelect,
  placeholder = 'Pick a date and time',
  disabled = false,
}: DateTimePickerProps) {
  const [open, setOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(selected)
  const [timeValue, setTimeValue] = useState<string>(
    selected
      ? `${String(selected.getHours()).padStart(2, '0')}:${String(selected.getMinutes()).padStart(2, '0')}`
      : ''
  )

  // Initialize state from selected prop
  useEffect(() => {
    setSelectedDate(selected)
    if (selected) {
      setTimeValue(
        `${String(selected.getHours()).padStart(2, '0')}:${String(selected.getMinutes()).padStart(2, '0')}`
      )
    } else {
      setTimeValue('')
    }
  }, [selected])

  const handleDateSelect = (date: Date | undefined) => {
    if (!date) {
      setSelectedDate(undefined)
      setTimeValue('')
      onSelect(undefined)
      return
    }

    // If we have a time value, apply it to the selected date
    if (timeValue) {
      const [hours, minutes] = timeValue.split(':').map(Number)
      const newDate = new Date(date)
      newDate.setHours(hours || 0, minutes || 0, 0, 0)
      setSelectedDate(newDate)
      onSelect(newDate)
    } else {
      // If no time selected yet, use midnight as default
      const newDate = new Date(date)
      newDate.setHours(0, 0, 0, 0)
      setSelectedDate(newDate)
      setTimeValue('00:00')
      onSelect(newDate)
    }
  }

  const handleTimeChange = (value: string) => {
    setTimeValue(value)

    if (value) {
      const [hours, minutes] = value.split(':').map(Number)
      if (!isNaN(hours) && !isNaN(minutes)) {
        const dateToUse = selectedDate || new Date()
        const newDate = new Date(dateToUse)
        newDate.setHours(hours, minutes, 0, 0)
        setSelectedDate(newDate)
        onSelect(newDate)
      }
    }
  }

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen)
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant='outline'
          data-empty={!selected}
          disabled={disabled}
          className='data-[empty=true]:text-muted-foreground w-full justify-start text-start font-normal'
        >
          {selected ? (
            format(selected, 'MMM d, yyyy HH:mm')
          ) : (
            <span>{placeholder}</span>
          )}
          <CalendarIcon className='ms-auto h-4 w-4 opacity-50' />
        </Button>
      </PopoverTrigger>
      <PopoverContent className='w-auto p-0' align='start'>
        <div className='flex flex-col gap-3 p-3'>
          <Calendar
            mode='single'
            captionLayout='dropdown'
            selected={selectedDate}
            onSelect={handleDateSelect}
            disabled={(date: Date) => date < new Date('1900-01-01')}
            fromYear={1900}
            toYear={2100}
          />
          <div className='flex items-center gap-2 border-t pt-3'>
            <Clock className='text-muted-foreground h-4 w-4' />
            <Input
              type='time'
              value={timeValue}
              onChange={(e) => handleTimeChange(e.target.value)}
              className='w-full'
              placeholder='HH:mm'
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
