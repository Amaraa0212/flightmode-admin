import { reportService, type StationRow } from '@/services'
import {
  brand,
  col,
  dateTime,
  mono,
  muted,
} from '@/components/resource/columns'
import type { ResourcePageProps } from '@/components/resource/resource-page'

const time = (iso: string | null) => mono(iso ? iso.slice(11, 16) : '-')

export const pageConfig: Omit<
  ResourcePageProps<StationRow>,
  'search' | 'navigate'
> = {
  title: 'Station report',
  description:
    'Departures with off-block, takeoff and arrival times, delays, passengers and baggage',
  queryKey: 'admin-report-station',
  list: reportService.station,
  searchPlaceholder: 'Flight, route or delay reason',
  exportFileName: 'station-report.xlsx',
  defaultPageSize: 50,
  columns: [
    col<StationRow>('date', 'Date', (r) => dateTime(r.date, 'YYYY-MM-DD')),
    col<StationRow>('flight_number', 'Flight', (r) => brand(r.flight_number)),
    col<StationRow>('route', 'Route', (r) => r.route),
    col<StationRow>(
      'bags',
      'KG / count',
      (r) => mono(`${r.bag_kg} / ${r.bags}`),
      { accessor: (r) => r.bag_kg }
    ),
    col<StationRow>('off_block_at', 'OBT', (r) => time(r.off_block_at)),
    col<StationRow>('takeoff_at', 'TT', (r) => time(r.takeoff_at)),
    col<StationRow>('estimated_arrival_at', 'ET', (r) =>
      time(r.estimated_arrival_at)
    ),
    col<StationRow>('delay_reason', 'Reason for delay', (r) =>
      r.delay_reason ? (
        <span className='text-amber-500'>{r.delay_reason}</span>
      ) : (
        muted('On time')
      )
    ),
    col<StationRow>('pax', 'PAX', (r) => mono(r.pax)),
  ],
}
