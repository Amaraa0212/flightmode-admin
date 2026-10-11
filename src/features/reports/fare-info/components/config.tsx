import { fareService, type Fare } from '@/services'
import { CABIN_CLASS } from '@/constants/status'
import {
  brand,
  chip,
  col,
  money,
  mono,
  muted,
} from '@/components/resource/columns'
import type { ResourcePageProps } from '@/components/resource/resource-page'

const CABINS = [
  { label: 'Business (C)', value: 'C' },
  { label: 'Economy (Y)', value: 'Y' },
]

export const pageConfig: Omit<
  ResourcePageProps<Fare>,
  'search' | 'navigate'
> = {
  title: 'Fare info',
  description: 'Active fares per route and RBD with child / infant prices',
  queryKey: 'admin-report-fare-info',
  list: (params) => fareService.list({ ...params, is_active: 'true' }),
  searchPlaceholder: 'Route or RBD',
  filters: [{ columnId: 'cabin_class', title: 'Cabin', options: CABINS }],
  exportFileName: 'fare-info.xlsx',
  columns: [
    col<Fare>('route', 'Route', (r) => brand(`${r.origin}-${r.destination}`), {
      accessor: (r) => `${r.origin}-${r.destination}`,
    }),
    col<Fare>('trip_type', 'OW/RT', (r) => mono(r.trip_type)),
    col<Fare>('cabin_class', 'Cabin', (r) => chip(r.cabin_class, CABIN_CLASS)),
    col<Fare>('fare_class', 'Fare class', (r) => mono(r.fare_class)),
    col<Fare>('base_amount', 'Fare', (r) => money(r.base_amount)),
    col<Fare>('tax_amount', 'Tax', (r) => money(r.tax_amount)),
    col<Fare>('total_amount', 'Total', (r) => <b>{money(r.total_amount)}</b>),
    col<Fare>(
      'chd',
      'CHD',
      (r) =>
        money(
          r.base_amount * (1 - r.child_discount_percent / 100) + r.tax_amount
        ),
      { accessor: (r) => r.child_discount_percent }
    ),
    col<Fare>(
      'inf',
      'INF',
      (r) => money(r.base_amount * (1 - r.infant_discount_percent / 100)),
      { accessor: (r) => r.infant_discount_percent }
    ),
    col<Fare>('valid_to', 'Valid to', (r) => muted(r.valid_to)),
  ],
}
