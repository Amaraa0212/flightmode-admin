import { CalendarRange, X } from 'lucide-react'
import type { NavigateFn } from '@/hooks/use-table-url-state'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

/** start_day / end_day in the URL (reports) */
export function DateRangeFilter({
  search,
  navigate,
}: {
  search: { start_day?: string; end_day?: string }
  navigate: NavigateFn
}) {
  const set = (patch: { start_day?: string; end_day?: string }) =>
    navigate({ search: (prev) => ({ ...prev, ...patch, page: undefined }) })

  return (
    <div className='flex items-center gap-1.5'>
      <CalendarRange className='text-muted-foreground size-4' />
      <Input
        type='date'
        value={search.start_day ?? ''}
        onChange={(e) => set({ start_day: e.target.value || undefined })}
        className='h-8 w-36 font-mono text-xs'
        aria-label='From'
      />
      <span className='text-muted-foreground text-xs'>→</span>
      <Input
        type='date'
        value={search.end_day ?? ''}
        onChange={(e) => set({ end_day: e.target.value || undefined })}
        className='h-8 w-36 font-mono text-xs'
        aria-label='To'
      />
      {(search.start_day || search.end_day) && (
        <Button
          variant='ghost'
          size='icon'
          className='size-8'
          onClick={() => set({ start_day: undefined, end_day: undefined })}
          aria-label='Clear dates'
        >
          <X className='size-4' />
        </Button>
      )}
    </div>
  )
}
