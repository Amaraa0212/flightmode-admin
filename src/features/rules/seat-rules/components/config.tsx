import { z } from 'zod'
import { seatPriceService, type SeatPrice } from '@/services'
import { ACTIVE_OPTIONS, CABIN_CLASS } from '@/constants/status'
import { chip, col, money, mono, muted } from '@/components/resource/columns'
import type { ResourcePageProps } from '@/components/resource/resource-page'
import { ActiveBadge } from '@/components/status-badge'

const schema = z.object({
  name: z.string().trim().min(2),
  cabin_class: z.enum(['C', 'Y', 'W', 'F']),
  seat_type: z.string(),
  rows: z.string().trim(),
  zone: z.string().trim().max(2),
  position: z.number().int().min(1),
  price: z.number().min(0),
  is_active: z.boolean(),
})
type Form = z.infer<typeof schema>

const CABINS = [
  { label: 'Business (C)', value: 'C' },
  { label: 'Economy (Y)', value: 'Y' },
]
const SEAT_TYPES = [
  { label: 'Any', value: '' },
  { label: 'Window', value: 'window' },
  { label: 'Aisle', value: 'aisle' },
  { label: 'Middle', value: 'middle' },
]

export const pageConfig: Omit<
  ResourcePageProps<SeatPrice, Form>,
  'search' | 'navigate'
> = {
  title: 'Seat rules',
  description:
    'Paid seats by cabin, rows, zone or seat type (first matching position wins)',
  queryKey: 'admin-seat-prices',
  list: seatPriceService.list,
  searchPlaceholder: 'Rule name, rows or zone',
  filters: [
    { columnId: 'cabin_class', title: 'Cabin', options: CABINS },
    { columnId: 'is_active', title: 'Status', options: ACTIVE_OPTIONS },
  ],
  columns: [
    col<SeatPrice>('position', '#', (r) => mono(r.position)),
    col<SeatPrice>('name', 'Rule', (r) => (
      <span className='font-medium'>{r.name}</span>
    )),
    col<SeatPrice>('cabin_class', 'Cabin', (r) =>
      chip(r.cabin_class, CABIN_CLASS)
    ),
    col<SeatPrice>('seat_type', 'Seat type', (r) =>
      muted(r.seat_type ?? 'Any')
    ),
    col<SeatPrice>('rows', 'Rows', (r) => mono(r.rows || 'All')),
    col<SeatPrice>('zone', 'Zone', (r) => mono(r.zone ?? '-')),
    col<SeatPrice>('aircraft', 'Aircraft', (r) => muted(r.aircraft ?? 'All')),
    col<SeatPrice>('price', 'Price', (r) => money(r.price)),
    col<SeatPrice>(
      'is_active',
      'Status',
      (r) => <ActiveBadge active={r.is_active} />,
      { accessor: (r) => String(r.is_active) }
    ),
  ],
  form: {
    entity: 'seat rule',
    schema,
    empty: {
      name: '',
      cabin_class: 'Y',
      seat_type: '',
      rows: '',
      zone: '',
      position: 10,
      price: 0,
      is_active: true,
    },
    fromRow: (r) => ({
      name: r.name,
      cabin_class: r.cabin_class,
      seat_type: r.seat_type ?? '',
      rows: r.rows,
      zone: r.zone ?? '',
      position: r.position,
      price: r.price,
      is_active: r.is_active,
    }),
    fields: [
      {
        name: 'name',
        label: 'Rule name',
        type: 'text',
        required: true,
        gridCols: 2,
      },
      {
        name: 'cabin_class',
        label: 'Cabin',
        type: 'select',
        options: CABINS,
        gridCols: 1,
      },
      {
        name: 'seat_type',
        label: 'Seat type',
        type: 'select',
        options: SEAT_TYPES,
        gridCols: 1,
      },
      {
        name: 'rows',
        label: 'Rows',
        type: 'text',
        placeholder: '14-15',
        gridCols: 1,
      },
      {
        name: 'zone',
        label: 'Zone',
        type: 'text',
        placeholder: 'B',
        gridCols: 1,
      },
      {
        name: 'position',
        label: 'Priority position',
        type: 'number',
        gridCols: 1,
      },
      { name: 'price', label: 'Price (MNT)', type: 'number', gridCols: 1 },
      { name: 'is_active', label: 'Active', type: 'checkbox', gridCols: 2 },
    ],
    create: (v) => seatPriceService.create(v),
    update: (row, v) => seatPriceService.update(row.id, v),
  },
  remove: { run: (r) => seatPriceService.remove(r.id), label: (r) => r.name },
}
