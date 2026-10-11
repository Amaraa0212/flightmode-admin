import { reportService, type TrafficRow } from '@/services'
import { Progress } from '@/components/progress-bar'
import { brand, col, dateTime, mono } from '@/components/resource/columns'
import type { ResourcePageProps } from '@/components/resource/resource-page'

export const pageConfig: Omit<
  ResourcePageProps<TrafficRow>,
  'search' | 'navigate'
> = {
  title: 'Traffic & PAX summary',
  description:
    'Operated flights — flown passengers, online check-in, go-show / no-show, baggage',
  queryKey: 'admin-report-traffic',
  list: reportService.traffic,
  searchPlaceholder: 'Flight, route or tail',
  exportFileName: 'traffic-summary.xlsx',
  defaultPageSize: 50,
  columns: [
    col<TrafficRow>('flight_number', 'Flight', (r) => brand(r.flight_number)),
    col<TrafficRow>('date', 'Date', (r) => dateTime(r.date)),
    col<TrafficRow>('route', 'Route', (r) => r.route),
    col<TrafficRow>('tail', 'Tail', (r) => mono(r.tail)),
    col<TrafficRow>('oci', 'OCI', (r) => mono(r.oci)),
    col<TrafficRow>(
      'gs_ns',
      'GS / NS',
      (r) => mono(`${r.go_show} / ${r.no_show}`),
      { accessor: (r) => r.no_show }
    ),
    col<TrafficRow>('bags', 'KG / PC', (r) => mono(`${r.bag_kg} / ${r.bags}`), {
      accessor: (r) => r.bag_kg,
    }),
    col<TrafficRow>('flown', 'Flown PAX', (r) => (
      <div className='w-32 space-y-1'>
        {mono(`${r.flown} / ${r.capacity}`)}
        <Progress value={r.capacity ? r.flown / r.capacity : 0} />
      </div>
    )),
  ],
}
