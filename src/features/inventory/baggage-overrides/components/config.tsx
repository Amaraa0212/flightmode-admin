import { z } from 'zod'
import { baggageOverrideService, type BaggageOverride } from '@/services'
import {
  brand,
  col,
  dateTime,
  mono,
  muted,
} from '@/components/resource/columns'
import type { ResourcePageProps } from '@/components/resource/resource-page'

const schema = z.object({
  pnr: z.string().trim().length(6, '6 characters'),
  passenger: z.string().trim().min(3, 'LAST/FIRST'),
  flight_number: z.string().trim().min(3),
  pieces: z.number().int().min(1).max(10),
  weight_kg: z.number().min(1),
})
type Form = z.infer<typeof schema>

export const pageConfig: Omit<
  ResourcePageProps<BaggageOverride, Form>,
  'search' | 'navigate'
> = {
  title: 'Override baggage allowance',
  description:
    'Extra prepaid (XBAG) pieces per passenger — used by the DCS piece limit',
  queryKey: 'admin-baggage-overrides',
  list: baggageOverrideService.list,
  searchPlaceholder: 'PNR, passenger, flight or agency',
  exportFileName: 'baggage-overrides.xlsx',
  columns: [
    col<BaggageOverride>('pnr', 'PNR', (r) => brand(r.pnr)),
    col<BaggageOverride>('passenger', 'Passenger', (r) => (
      <span className='font-medium'>{r.passenger}</span>
    )),
    col<BaggageOverride>('flight_number', 'Flight', (r) =>
      mono(r.flight_number)
    ),
    col<BaggageOverride>('departure_at', 'Departure', (r) =>
      dateTime(r.departure_at)
    ),
    col<BaggageOverride>('agency', 'Agent', (r) => muted(r.agency ?? 'Direct')),
    col<BaggageOverride>('weight_kg', 'KG', (r) => mono(`${r.weight_kg} kg`)),
    col<BaggageOverride>('pieces', 'Piece', (r) => mono(r.pieces)),
  ],
  form: {
    entity: 'allowance',
    schema,
    empty: {
      pnr: '',
      passenger: '',
      flight_number: '',
      pieces: 1,
      weight_kg: 23,
    },
    fromRow: (r) => ({
      pnr: r.pnr,
      passenger: r.passenger,
      flight_number: r.flight_number,
      pieces: r.pieces,
      weight_kg: r.weight_kg,
    }),
    fields: [
      { name: 'pnr', label: 'PNR', type: 'text', required: true, gridCols: 1 },
      {
        name: 'flight_number',
        label: 'Flight',
        type: 'text',
        required: true,
        gridCols: 1,
      },
      {
        name: 'passenger',
        label: 'Passenger (LAST/FIRST)',
        type: 'text',
        required: true,
        gridCols: 2,
      },
      { name: 'pieces', label: 'Pieces', type: 'number', gridCols: 1 },
      { name: 'weight_kg', label: 'Total kg', type: 'number', gridCols: 1 },
    ],
    create: (v) => baggageOverrideService.create(v),
    update: (row, v) => baggageOverrideService.update(row.id, v),
  },
  remove: {
    run: (r) => baggageOverrideService.remove(r.id),
    label: (r) => `${r.pnr} ${r.passenger}`,
  },
}
