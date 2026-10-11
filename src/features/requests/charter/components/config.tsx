import {
  charterRequestService,
  type CharterRequest,
  type CharterRequestStatus,
} from '@/services'
import { CHARTER_STATUS, CHARTER_STATUS_OPTIONS } from '@/constants/status'
import {
  brand,
  chip,
  col,
  dateTime,
  mono,
  muted,
} from '@/components/resource/columns'
import type { ResourcePageProps } from '@/components/resource/resource-page'

export const pageConfig: Omit<
  ResourcePageProps<CharterRequest>,
  'search' | 'navigate'
> = {
  title: 'Requests from agencies',
  description: 'Charter requests — review, set pending, approve or reject',
  queryKey: 'admin-charter-requests',
  list: charterRequestService.list,
  searchPlaceholder: 'Agency user, email or route',
  filters: [
    { columnId: 'status', title: 'Status', options: CHARTER_STATUS_OPTIONS },
  ],
  columns: [
    col<CharterRequest>(
      'requested_by',
      'Requested by',
      (r) => (
        <div>
          <p className='font-medium'>{r.requested_by.name}</p>
          {muted(r.requested_by.email)}
        </div>
      ),
      { accessor: (r) => r.requested_by.name }
    ),
    col<CharterRequest>(
      'route',
      'Route',
      (r) => brand(`${r.origin}-${r.destination}`),
      { accessor: (r) => `${r.origin}-${r.destination}` }
    ),
    col<CharterRequest>(
      'dates',
      'Dates',
      (r) =>
        mono(
          `${r.departure_date}${r.return_date ? ` → ${r.return_date}` : ''}`
        ),
      { accessor: (r) => r.departure_date }
    ),
    col<CharterRequest>('pax_count', 'PAX', (r) => mono(r.pax_count)),
    col<CharterRequest>(
      'airlines',
      'Airlines',
      (r) => muted(r.airlines.map((a) => a.name).join(', ')),
      { accessor: (r) => r.airlines.length }
    ),
    col<CharterRequest>('notes', 'Notes', (r) => muted(r.notes ?? '-')),
    col<CharterRequest>('status', 'Status', (r) =>
      chip(r.status, CHARTER_STATUS)
    ),
    col<CharterRequest>('created_at', 'Requested', (r) =>
      dateTime(r.created_at)
    ),
  ],
}

export const NEXT_ACTIONS: Record<
  CharterRequestStatus,
  CharterRequestStatus[]
> = {
  requested: ['pending', 'approved', 'rejected'],
  pending: ['approved', 'rejected'],
  approved: [],
  rejected: [],
}
