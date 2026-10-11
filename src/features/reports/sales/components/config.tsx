import { reportService, type SalesRow } from '@/services'
import {
  brand,
  col,
  dateTime,
  money,
  mono,
  muted,
} from '@/components/resource/columns'
import type { ResourcePageProps } from '@/components/resource/resource-page'

export const pageConfig: Omit<
  ResourcePageProps<SalesRow>,
  'search' | 'navigate'
> = {
  title: 'Sales report',
  description: 'Issued tickets — fare and tax per passenger by agent',
  queryKey: 'admin-report-sales',
  list: reportService.sales,
  searchPlaceholder: 'PNR, name, route or agent',
  exportFileName: 'sales-report.xlsx',
  defaultPageSize: 50,
  columns: [
    col<SalesRow>('pnr', 'PNR', (r) => brand(r.pnr)),
    col<SalesRow>('name', 'Full name', (r) => (
      <span className='font-medium'>{r.name}</span>
    )),
    col<SalesRow>('route', 'Route', (r) => r.route),
    col<SalesRow>('departure_at', 'Departure', (r) =>
      dateTime(r.departure_at, 'YYYY-MM-DD')
    ),
    col<SalesRow>('rbd', 'RBD', (r) => mono(r.rbd)),
    col<SalesRow>('issued_at', 'Issued', (r) =>
      dateTime(r.issued_at, 'YYYY-MM-DD')
    ),
    col<SalesRow>('agency', 'Agent', (r) => muted(r.agency)),
    col<SalesRow>('fare', 'Fare', (r) => money(r.fare)),
    col<SalesRow>('tax', 'Tax', (r) => money(r.tax)),
  ],
}
