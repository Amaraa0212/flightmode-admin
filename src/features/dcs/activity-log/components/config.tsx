import { activityLogService, type ActivityLog } from '@/services'
import { ACTIVITY_CHANNEL, ACTIVITY_CHANNEL_OPTIONS } from '@/constants/status'
import { chip, col, dateTime, mono, muted } from '@/components/resource/columns'
import type { ResourcePageProps } from '@/components/resource/resource-page'

export const pageConfig: Omit<
  ResourcePageProps<ActivityLog>,
  'search' | 'navigate'
> = {
  title: 'DCS history log',
  description:
    'Activity log — check-in, baggage, boarding, bookings and admin changes. Filter by flight and passenger.',
  queryKey: 'admin-activity-log',
  list: activityLogService.list,
  searchPlaceholder: 'Event, description, user or IP',
  filters: [
    {
      columnId: 'channel',
      title: 'Channel',
      options: ACTIVITY_CHANNEL_OPTIONS,
    },
  ],
  exportFileName: 'activity-log.xlsx',
  defaultPageSize: 50,
  columns: [
    col<ActivityLog>('created_at', 'Time', (r) =>
      dateTime(r.created_at, 'MM-DD HH:mm:ss')
    ),
    col<ActivityLog>('channel', 'Channel', (r) =>
      chip(r.channel, ACTIVITY_CHANNEL)
    ),
    col<ActivityLog>('event', 'Event', (r) => mono(r.event)),
    col<ActivityLog>('description', 'Log', (r) => r.description),
    col<ActivityLog>(
      'flight',
      'Flight',
      (r) =>
        r.flight ? (
          <div>
            {mono(r.flight.flight_number)}
            {r.flight.scheduled_departure_at && (
              <div className='text-muted-foreground text-xs'>
                {dateTime(r.flight.scheduled_departure_at, 'MM-DD')}
              </div>
            )}
          </div>
        ) : (
          muted('-')
        ),
      { accessor: (r) => r.flight?.flight_number }
    ),
    col<ActivityLog>(
      'passenger',
      'Passenger',
      (r) =>
        r.passenger ? (
          <div>
            <span className='font-medium'>{r.passenger.name}</span>
            {r.passenger.pnr && (
              <div className='text-muted-foreground font-mono text-xs'>
                {r.passenger.pnr}
              </div>
            )}
          </div>
        ) : (
          muted('-')
        ),
      { accessor: (r) => r.passenger?.name }
    ),
    col<ActivityLog>(
      'subject',
      'Subject',
      (r) => muted(`${r.subject_type} #${r.subject_id}`),
      { accessor: (r) => r.subject_type }
    ),
    col<ActivityLog>(
      'user',
      'User',
      (r) => muted(r.user?.name ?? 'Online / system'),
      { accessor: (r) => r.user?.name }
    ),
    col<ActivityLog>('ip_address', 'IP', (r) => mono(r.ip_address)),
  ],
}
