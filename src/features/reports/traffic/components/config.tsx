import { reportService, type TrafficRow } from '@/services'
import { SERVICE_TYPE, SERVICE_TYPE_OPTIONS } from '@/constants/status'
import { Progress } from '@/components/progress-bar'
import { brand, chip, col, dateTime, mono } from '@/components/resource/columns'
import type { ResourcePageProps } from '@/components/resource/resource-page'

export const pageConfig: Omit<
  ResourcePageProps<TrafficRow>,
  'search' | 'navigate'
> = {
  title: 'Traffic & PAX summary',
  description:
    'Operated flights — flown passengers, online check-in, go-show / no-show, baggage. Amber: checked-in passengers not scanned at the gate are counted as flown',
  queryKey: 'admin-report-traffic',
  list: reportService.traffic,
  searchPlaceholder: 'Flight, route or tail',
  filters: [
    { columnId: 'service_type', title: 'Type', options: SERVICE_TYPE_OPTIONS },
  ],
  exportFileName: 'traffic-summary.xlsx',
  defaultPageSize: 50,
  columns: [
    col<TrafficRow>('flight_number', 'Flight', (r) => brand(r.flight_number)),
    col<TrafficRow>('service_type', 'Type', (r) =>
      chip(r.service_type, SERVICE_TYPE)
    ),
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
        {r.not_scanned > 0 && (
          <p className='text-[11px] font-medium text-amber-600 dark:text-amber-300'>
            {r.not_scanned} check-in, gate-д уншаагүй
          </p>
        )}
      </div>
    )),
  ],
}
