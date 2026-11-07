import { useMutation, useQueryClient } from '@tanstack/react-query'
import { CalendarClock, Check } from 'lucide-react'
import { toast } from 'sonner'
import { agencyPortalService, type AgencyScheduleChanges } from '@/services'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { formatDateTime } from '@/features/agency/transactions/transactions-table'

const FIELD: Record<string, string> = {
  scheduled_departure_at: 'Хөөрөх',
  scheduled_arrival_at: 'Буух',
  flight_number: 'Нислэгийн дугаар',
  origin_airport_id: 'Хаанаас',
  destination_airport_id: 'Хаашаа',
  aircraft_id: 'Онгоц',
}

const show = (field: string, value: string | null) =>
  value === null ? '—' : field.startsWith('scheduled_') ? formatDateTime(value) : value

/**
 * Orange "schedule changed" badge of a quota whose flights were retimed (or renumbered / rerouted) after the quota
 * was given: old → new in a popover, "Танилцсан" hides the badge until the next change.
 */
export function ScheduleChangeBadge({ quotaId, changes }: { quotaId: number; changes: AgencyScheduleChanges }) {
  const queryClient = useQueryClient()
  const seen = useMutation({
    mutationFn: () => agencyPortalService.scheduleChangesSeen(quotaId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agency-quotas'] })
      queryClient.invalidateQueries({ queryKey: ['agency-flights'] })
    },
    onError: (error: Error) => toast.error(error.message),
  })
  if (!changes.changes.length) return null
  const unseen = changes.unseen > 0

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type='button'
          onClick={(e) => e.stopPropagation()}
          className={
            unseen
              ? 'inline-flex items-center gap-1 rounded border border-orange-500/50 bg-orange-500/15 px-1.5 py-0.5 text-[11px] font-semibold text-orange-700 dark:text-orange-300'
              : 'text-muted-foreground inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[11px]'
          }
          title='Нислэгийн хуваарь өөрчлөгдсөн'
        >
          <CalendarClock className='size-3.5' />
          {unseen ? 'Хуваарь өөрчлөгдсөн' : 'Хуваарь'}
        </button>
      </PopoverTrigger>
      <PopoverContent align='start' className='w-80 p-3' onClick={(e) => e.stopPropagation()}>
        <p className='mb-2 text-sm font-semibold'>Хуваарийн өөрчлөлт</p>
        <div className='flex max-h-72 flex-col gap-2 overflow-y-auto'>
          {[...changes.changes].reverse().map((c) => (
            <div key={c.id} className={`rounded-md border p-2 text-xs ${c.seen ? 'opacity-60' : 'border-orange-500/40'}`}>
              <p className='text-muted-foreground mb-1'>
                {c.flight_number} {c.leg === 'return' && '(буцах)'} · {formatDateTime(c.changed_at)}
              </p>
              {[...c.changes]
                .sort((a, b) => Object.keys(FIELD).indexOf(a.field) - Object.keys(FIELD).indexOf(b.field))
                .map((f) => (
                <p key={f.field} className='font-mono'>
                  <span className='text-muted-foreground font-sans'>{FIELD[f.field] ?? f.field}: </span>
                  <s className='text-muted-foreground'>{show(f.field, f.from)}</s> → <b>{show(f.field, f.to)}</b>
                </p>
              ))}
            </div>
          ))}
        </div>
        {unseen && (
          <Button size='sm' className='mt-3 h-7 w-full gap-1 text-xs' disabled={seen.isPending} onClick={() => seen.mutate()}>
            <Check className='size-3.5' />
            Танилцсан
          </Button>
        )}
      </PopoverContent>
    </Popover>
  )
}
