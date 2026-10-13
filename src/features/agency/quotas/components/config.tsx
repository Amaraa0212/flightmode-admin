import { agencyPortalService, type AgencyQuota } from '@/services'
import { brand, col, dateTime, mono } from '@/components/resource/columns'
import type { ResourcePageProps } from '@/components/resource/resource-page'

export const pageConfig: Omit<ResourcePageProps<AgencyQuota, Record<string, never>>, 'search' | 'navigate'> = {
  title: 'Миний квот',
  description: 'Agency-д олгосон суудлын квот — нислэг, зарсан / үлдсэн суудал, нэрс оруулах хугацаа',
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
    col<AgencyQuota>('flight_number', 'Flight', (r) => brand(r.flight_number)),
    col<AgencyQuota>('route', 'Route', (r) => mono(r.route)),
    col<AgencyQuota>('departure_at', 'Departure', (r) => dateTime(r.departure_at)),
    col<AgencyQuota>('cabins', 'Cabins', (r) => mono(r.cabins || '-')),
    col<AgencyQuota>('seats', 'Sold / quota', (r) => (
      <span className='font-mono'>
        <b>{r.used}</b> / {r.seats}
        <span className='text-muted-foreground ms-1 text-xs'>({r.remaining} left)</span>
      </span>
    )),
    col<AgencyQuota>('names_deadline_at', 'Names until', (r) => (
      <span className={r.is_open_for_names ? '' : 'text-rose-500'}>
        {r.names_deadline_at ? dateTime(r.names_deadline_at) : '-'}
        {!r.is_open_for_names && <span className='ms-1 text-xs'>(closed)</span>}
      </span>
    )),
  ],
}
