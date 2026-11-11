import { agencyPortalService, type AgencyQuota } from '@/services'
import { brand, col, dateTime, mono } from '@/components/resource/columns'
import type { ResourcePageProps } from '@/components/resource/resource-page'
import { ScheduleChangeBadge } from '@/features/agency/schedule-change-badge'

export const pageConfig: Omit<ResourcePageProps<AgencyQuota, Record<string, never>>, 'search' | 'navigate'> = {
  title: 'Миний квот',
  description: 'Agency-д олгосон суудлын квот — нислэг, зарагдсан / hold / үлдсэн суудал, TKT deadline',
  queryKey: 'agency-quotas',
  list: agencyPortalService.quotas,
  searchPlaceholder: 'Нислэгийн дугаар эсвэл чиглэлээр хайх (OM225, PEK)',
  filters: [
    {
      columnId: 'status',
      title: 'Period',
      options: [{ label: 'Past (3 months)', value: 'past' }],
    },
  ],
  exportFileName: 'agency-quotas.xlsx',
  columns: [
    col<AgencyQuota>('flight_number', 'Flight', (r) => (
      <div className='flex flex-col items-start gap-1'>
        {brand(r.flight_number)}
        <ScheduleChangeBadge quotaId={r.id} changes={r.schedule_changes} />
      </div>
    )),
    // RT quota: the return flight under the outbound one, each with its own date
    col<AgencyQuota>('route', 'Route', (r) => (
      <div className='flex flex-col gap-1'>
        {mono(r.route)}
        {r.return_flight && <span className='text-muted-foreground font-mono text-xs'>↩ {r.return_flight}</span>}
      </div>
    )),
    col<AgencyQuota>('departure_at', 'Departure', (r) => (
      <div className='flex flex-col gap-1'>
        {dateTime(r.departure_at)}
        {r.return_departure_at && (
          <span className='text-muted-foreground text-xs'>↩ {dateTime(r.return_departure_at)}</span>
        )}
      </div>
    )),
    col<AgencyQuota>('cabins', 'Cabins', (r) => mono(r.cabins || '-')),
    // held seats count against the quota too — show them, or sold + left does not add up
    col<AgencyQuota>('seats', 'Суудал', (r) => (
      <span className='font-mono text-xs whitespace-nowrap' title={r.cabin_usage || undefined}>
        <b>{r.used}</b> зарагдсан
        {r.held > 0 && <span className='text-amber-600 dark:text-amber-400'> · {r.held} hold</span>}
        {' · '}
        <b>{r.remaining}</b> үлдсэн
        <span className='text-muted-foreground'> / {r.seats || '∞'}</span>
      </span>
    )),
    col<AgencyQuota>('names_deadline_at', 'TKT deadline', (r) => (
      <span className={r.is_open_for_names ? '' : 'text-rose-500'}>
        {r.names_deadline_at ? dateTime(r.names_deadline_at) : '-'}
        {!r.is_open_for_names && <span className='ms-1 text-xs'>(closed)</span>}
      </span>
    )),
  ],
}
