import { bagTagLayoutService, type BagTagLayout } from '@/services'
import { col, dateTime, muted } from '@/components/resource/columns'
import type { ResourcePageProps } from '@/components/resource/resource-page'

export const FIELD_LABELS: Record<string, string> = {
  airline_logo: 'Airline logo',
  origin: 'Origin',
  destination_code: 'Destination code',
  destination_city: 'Destination city',
  flight_number: 'Flight number',
  date: 'Date',
  passenger_name: 'Passenger name',
  pnr: 'PNR',
  tag_number: 'Tag number',
  barcode: 'Barcode (CODE128)',
  piece: 'Piece n/N',
  weight_kg: 'Weight',
}

export const pageConfig: Omit<
  ResourcePageProps<BagTagLayout>,
  'search' | 'navigate'
> = {
  title: 'Pag tag position',
  description:
    'Bag tag print layout — which fields are printed and in what order',
  queryKey: 'admin-bag-tag',
  list: bagTagLayoutService.list,
  searchPlaceholder: 'Layout name',
  columns: [
    col<BagTagLayout>('name', 'Name', (r) => (
      <span className='font-medium'>{r.name}</span>
    )),
    col<BagTagLayout>(
      'positions',
      'Positions',
      (r) => muted(r.positions.map((p) => FIELD_LABELS[p] ?? p).join(' → ')),
      { accessor: (r) => r.positions.join(',') }
    ),
    col<BagTagLayout>('airline', 'Airline', (r) => muted(r.airline)),
    col<BagTagLayout>('created_at', 'Created at', (r) =>
      dateTime(r.created_at)
    ),
  ],
  remove: {
    run: (r) => bagTagLayoutService.remove(r.id),
    label: (r) => r.name,
  },
}
