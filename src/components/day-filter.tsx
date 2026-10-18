import { addDays, format, parseISO } from 'date-fns'
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import type { NavigateFn } from '@/hooks/use-table-url-state'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const today = () => format(new Date(), 'yyyy-MM-dd')

/** One day in the URL (`start_day`) with previous / next / today — boards that show a single day. */
export function DayFilter({
  search,
  navigate,
}: {
  search: { start_day?: string }
  navigate: NavigateFn
}) {
  const day = search.start_day || today()
  const set = (value?: string) =>
    navigate({
      search: (prev) => ({
        ...prev,
        start_day: value && value !== today() ? value : undefined,
        page: undefined,
      }),
    })
  const shift = (days: number) =>
    set(format(addDays(parseISO(day), days), 'yyyy-MM-dd'))

  return (
    <div className='flex items-center gap-1'>
      <CalendarDays className='text-muted-foreground size-4' />
      <Button
        variant='ghost'
        size='icon'
        className='size-8'
        onClick={() => shift(-1)}
        aria-label='Previous day'
      >
        <ChevronLeft className='size-4' />
      </Button>
      <Input
        type='date'
        value={day}
        min='2000-01-01'
        max='2099-12-31'
        onChange={(e) => set(e.target.value || undefined)}
        className='h-8 w-36 font-mono text-xs'
        aria-label='Day'
      />
      <Button
        variant='ghost'
        size='icon'
        className='size-8'
        onClick={() => shift(1)}
        aria-label='Next day'
      >
        <ChevronRight className='size-4' />
      </Button>
      {day !== today() && (
        <Button
          variant='outline'
          size='sm'
          className='h-8 text-xs'
          onClick={() => set(undefined)}
        >
          Today
        </Button>
      )}
    </div>
  )
}
