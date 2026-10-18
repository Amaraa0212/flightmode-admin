import { z } from 'zod'
import { airportOptions, fareService, type Fare } from '@/services'
import { ACTIVE_OPTIONS, CABIN_CLASS } from '@/constants/status'
import {
  brand,
  chip,
  col,
  money,
  mono,
  muted,
} from '@/components/resource/columns'
import type { ResourcePageProps } from '@/components/resource/resource-page'
import { ActiveBadge } from '@/components/status-badge'

const schema = z.object({
  origin_airport_id: z.string().min(1, 'Required'),
  destination_airport_id: z.string().min(1, 'Required'),
  trip_type: z.enum(['OW', 'RT']),
  cabin_class: z.enum(['C', 'Y', 'W', 'F']),
  fare_class: z.string().trim().length(1, 'RBD letter'),
  valid_from: z.string().min(1),
  valid_to: z.string().min(1),
  base_amount: z.number().min(0),
  tax_amount: z.number().min(0),
  child_discount_percent: z.number().min(0).max(100),
  infant_discount_percent: z.number().min(0).max(100),
  is_active: z.boolean(),
})
type Form = z.infer<typeof schema>

const CABINS = [
  { label: 'Business (C)', value: 'C' },
  { label: 'Economy (Y)', value: 'Y' },
]
const TRIPS = [
  { label: 'One way', value: 'OW' },
  { label: 'Round trip', value: 'RT' },
]

export const pageConfig: Omit<
  ResourcePageProps<Fare, Form>,
  'search' | 'navigate'
> = {
  title: 'Fare and pricing',
  description:
    'Route fares per cabin / RBD with tax and child / infant discounts',
  queryKey: 'admin-fares',
  list: fareService.list,
  searchPlaceholder: 'Route (UBN-PQC), airport or RBD',
  filters: [
    { columnId: 'cabin_class', title: 'Cabin', options: CABINS },
    { columnId: 'trip_type', title: 'OW/RT', options: TRIPS },
    { columnId: 'is_active', title: 'Status', options: ACTIVE_OPTIONS },
  ],
  exportFileName: 'fares.xlsx',
  columns: [
    col<Fare>('route', 'Route', (r) => brand(`${r.origin}-${r.destination}`), {
      accessor: (r) => `${r.origin}-${r.destination}`,
    }),
    col<Fare>('cabin_class', 'Cabin', (r) => chip(r.cabin_class, CABIN_CLASS)),
    col<Fare>('fare_class', 'RBD', (r) => mono(r.fare_class)),
    col<Fare>('trip_type', 'OW/RT', (r) => mono(r.trip_type)),
    col<Fare>('base_amount', 'Fare', (r) => money(r.base_amount)),
    col<Fare>('tax_amount', 'Tax', (r) => money(r.tax_amount)),
    col<Fare>('total_amount', 'Total', (r) => <b>{money(r.total_amount)}</b>),
    col<Fare>(
      'discounts',
      'CHD / INF',
      (r) =>
        muted(`-${r.child_discount_percent}% / -${r.infant_discount_percent}%`),
      { accessor: (r) => r.child_discount_percent }
    ),
    col<Fare>(
      'valid',
      'Valid',
      (r) => mono(`${r.valid_from} → ${r.valid_to}`),
      { accessor: (r) => r.valid_from }
    ),
    col<Fare>(
      'is_active',
      'Status',
      (r) => <ActiveBadge active={r.is_active} />,
      { accessor: (r) => String(r.is_active) }
    ),
  ],
  form: {
    entity: 'fare',
    schema,
    maxWidth: 'xl',
    empty: {
      origin_airport_id: '',
      destination_airport_id: '',
      trip_type: 'OW',
      cabin_class: 'Y',
      fare_class: 'Y',
      valid_from: '',
      valid_to: '',
      base_amount: 0,
      tax_amount: 95000,
      child_discount_percent: 25,
      infant_discount_percent: 90,
      is_active: true,
    },
    fromRow: (r) => ({
      origin_airport_id: String(r.origin_airport_id),
      destination_airport_id: String(r.destination_airport_id),
      trip_type: r.trip_type,
      cabin_class: r.cabin_class,
      fare_class: r.fare_class,
      valid_from: r.valid_from,
      valid_to: r.valid_to,
      base_amount: r.base_amount,
      tax_amount: r.tax_amount,
      child_discount_percent: r.child_discount_percent,
      infant_discount_percent: r.infant_discount_percent,
      is_active: r.is_active,
    }),
    fields: [
      {
        name: 'origin_airport_id',
        label: 'Origin',
        type: 'select',
        loadOptions: airportOptions,
        required: true,
        gridCols: 1,
      },
      {
        name: 'destination_airport_id',
        label: 'Destination',
        type: 'select',
        loadOptions: airportOptions,
        required: true,
        gridCols: 1,
      },
      {
        name: 'trip_type',
        label: 'OW / RT',
        type: 'select',
        options: TRIPS,
        gridCols: 1,
      },
      {
        name: 'cabin_class',
        label: 'Cabin',
        type: 'select',
        options: CABINS,
        gridCols: 1,
      },
      {
        name: 'fare_class',
        label: 'RBD',
        type: 'text',
        required: true,
        gridCols: 1,
      },
      {
        name: 'base_amount',
        label: 'Fare (MNT)',
        type: 'number',
        required: true,
        gridCols: 1,
      },
      { name: 'tax_amount', label: 'Tax (MNT)', type: 'number', gridCols: 1 },
      {
        name: 'child_discount_percent',
        label: 'CHD discount %',
        type: 'number',
        gridCols: 1,
      },
      {
        name: 'infant_discount_percent',
        label: 'INF discount %',
        type: 'number',
        gridCols: 1,
      },
      {
        name: 'valid_from',
        label: 'Valid from',
        type: 'date',
        required: true,
        gridCols: 1,
      },
      {
        name: 'valid_to',
        label: 'Valid to',
        type: 'date',
        required: true,
        gridCols: 1,
      },
      { name: 'is_active', label: 'Active', type: 'checkbox', gridCols: 2 },
    ],
    create: (v) => fareService.create(v),
    update: (row, v) => fareService.update(row.id, v),
  },
  remove: {
    run: (r) => fareService.remove(r.id),
    label: (r) => `${r.origin}-${r.destination} ${r.fare_class}`,
  },
}
