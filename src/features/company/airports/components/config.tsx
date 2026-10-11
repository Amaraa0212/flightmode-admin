import { z } from 'zod'
import { airportService, type Airport } from '@/services'
import { ACTIVE_OPTIONS } from '@/constants/status'
import { brand, col, mono, muted } from '@/components/resource/columns'
import type { ResourcePageProps } from '@/components/resource/resource-page'
import { ActiveBadge } from '@/components/status-badge'

const schema = z.object({
  iata_code: z.string().trim().length(3, '3 letters'),
  icao_code: z.string().trim().length(4, '4 letters'),
  name: z.string().trim().min(2),
  city: z.string().trim().min(2),
  city_code: z.string().trim().length(3),
  country_id: z.string().min(1, 'Country is required'),
  timezone: z.string().trim().min(3),
  is_active: z.boolean(),
})
type Form = z.infer<typeof schema>

const COUNTRIES = [
  { label: 'Mongolia', value: '1' },
  { label: 'China', value: '2' },
  { label: 'South Korea', value: '3' },
  { label: 'Japan', value: '4' },
  { label: 'Thailand', value: '5' },
]

export const pageConfig: Omit<
  ResourcePageProps<Airport, Form>,
  'search' | 'navigate'
> = {
  title: 'Airports',
  description:
    'Stations and destinations (IATA / ICAO, timezone for local times)',
  queryKey: 'admin-airports',
  list: airportService.list,
  searchPlaceholder: 'IATA, ICAO, name or city',
  filters: [
    { columnId: 'is_active', title: 'Status', options: ACTIVE_OPTIONS },
  ],
  exportFileName: 'airports.xlsx',
  columns: [
    col<Airport>('iata_code', 'IATA', (r) => brand(r.iata_code)),
    col<Airport>('icao_code', 'ICAO', (r) => mono(r.icao_code)),
    col<Airport>('name', 'Name', (r) => (
      <span className='font-medium'>{r.name}</span>
    )),
    col<Airport>('city', 'City', (r) => `${r.city} (${r.city_code})`),
    col<Airport>('country', 'Country', (r) => r.country?.name ?? '-', {
      accessor: (r) => r.country?.name,
    }),
    col<Airport>('timezone', 'Timezone', (r) => muted(r.timezone)),
    col<Airport>(
      'is_active',
      'Status',
      (r) => <ActiveBadge active={r.is_active} />,
      { accessor: (r) => String(r.is_active) }
    ),
  ],
  form: {
    entity: 'airport',
    schema,
    empty: {
      iata_code: '',
      icao_code: '',
      name: '',
      city: '',
      city_code: '',
      country_id: '1',
      timezone: 'Asia/Ulaanbaatar',
      is_active: true,
    },
    fromRow: (r) => ({
      iata_code: r.iata_code,
      icao_code: r.icao_code,
      name: r.name,
      city: r.city,
      city_code: r.city_code,
      country_id: String(r.country_id),
      timezone: r.timezone,
      is_active: r.is_active,
    }),
    fields: [
      {
        name: 'iata_code',
        label: 'IATA code',
        type: 'text',
        required: true,
        gridCols: 1,
      },
      {
        name: 'icao_code',
        label: 'ICAO code',
        type: 'text',
        required: true,
        gridCols: 1,
      },
      {
        name: 'name',
        label: 'Name',
        type: 'text',
        required: true,
        gridCols: 2,
      },
      {
        name: 'city',
        label: 'City',
        type: 'text',
        required: true,
        gridCols: 1,
      },
      {
        name: 'city_code',
        label: 'City code',
        type: 'text',
        required: true,
        gridCols: 1,
      },
      {
        name: 'country_id',
        label: 'Country',
        type: 'select',
        options: COUNTRIES,
        required: true,
        gridCols: 1,
      },
      {
        name: 'timezone',
        label: 'Timezone (IANA)',
        type: 'text',
        required: true,
        gridCols: 1,
      },
      { name: 'is_active', label: 'Active', type: 'checkbox', gridCols: 2 },
    ],
    create: (v) =>
      airportService.create({ ...v, country_id: Number(v.country_id) }),
    update: (row, v) =>
      airportService.update(row.id, { ...v, country_id: Number(v.country_id) }),
  },
  remove: {
    run: (r) => airportService.remove(r.id),
    label: (r) => `${r.iata_code} ${r.name}`,
  },
}
