import { z } from 'zod'
import { baggageRuleService, type BaggageRule } from '@/services'
import {
  ACTIVE_OPTIONS,
  BAGGAGE_RULE_TYPE,
  BAGGAGE_RULE_TYPE_OPTIONS,
} from '@/constants/status'
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
  name: z.string().trim().min(2),
  type: z.enum(['free', 'prepaid', 'excess']),
  ssr_code: z.string().trim().max(8),
  cabin_class: z.string(),
  pieces: z.number().int().min(0),
  weight_kg: z.number().min(0),
  price: z.number().min(0),
  is_active: z.boolean(),
})
type Form = z.infer<typeof schema>

const CABINS = [
  { label: 'All cabins', value: 'ALL' },
  { label: 'Business (C)', value: 'C' },
  { label: 'Economy (Y)', value: 'Y' },
]

export const pageConfig: Omit<
  ResourcePageProps<BaggageRule, Form>,
  'search' | 'navigate'
> = {
  title: 'Baggage rules',
  description: 'Free allowance, prepaid (XBAG) and excess baggage products',
  queryKey: 'admin-baggage-rules',
  list: baggageRuleService.list,
  searchPlaceholder: 'Bag name or SSR',
  filters: [
    { columnId: 'type', title: 'Type', options: BAGGAGE_RULE_TYPE_OPTIONS },
    { columnId: 'cabin_class', title: 'Cabin', options: CABINS },
    { columnId: 'is_active', title: 'Status', options: ACTIVE_OPTIONS },
  ],
  columns: [
    col<BaggageRule>('name', 'Bag name', (r) => (
      <span className='font-medium'>{r.name}</span>
    )),
    col<BaggageRule>('type', 'Type', (r) => chip(r.type, BAGGAGE_RULE_TYPE)),
    col<BaggageRule>(
      'allowance',
      'Pieces, KG',
      (r) => mono(`${r.pieces} pc · ${r.weight_kg} kg`),
      { accessor: (r) => r.pieces }
    ),
    col<BaggageRule>(
      'cabin_class',
      'Cabin',
      (r) => muted(r.cabin_class ?? 'All'),
      { accessor: (r) => r.cabin_class ?? 'ALL' }
    ),
    col<BaggageRule>('ssr_code', 'SSR', (r) =>
      r.ssr_code ? brand(r.ssr_code) : muted('-')
    ),
    col<BaggageRule>('price', 'Price', (r) => money(r.price)),
    col<BaggageRule>(
      'is_active',
      'Status',
      (r) => <ActiveBadge active={r.is_active} />,
      { accessor: (r) => String(r.is_active) }
    ),
  ],
  form: {
    entity: 'baggage rule',
    schema,
    empty: {
      name: '',
      type: 'free',
      ssr_code: '',
      cabin_class: 'ALL',
      pieces: 1,
      weight_kg: 23,
      price: 0,
      is_active: true,
    },
    fromRow: (r) => ({
      name: r.name,
      type: r.type,
      ssr_code: r.ssr_code ?? '',
      cabin_class: r.cabin_class ?? 'ALL',
      pieces: r.pieces,
      weight_kg: r.weight_kg,
      price: r.price,
      is_active: r.is_active,
    }),
    fields: [
      {
        name: 'name',
        label: 'Bag name',
        type: 'text',
        required: true,
        gridCols: 2,
      },
      {
        name: 'type',
        label: 'Type',
        type: 'select',
        options: BAGGAGE_RULE_TYPE_OPTIONS,
        required: true,
        gridCols: 1,
      },
      {
        name: 'cabin_class',
        label: 'Cabin',
        type: 'select',
        options: CABINS,
        gridCols: 1,
      },
      { name: 'pieces', label: 'Pieces', type: 'number', gridCols: 1 },
      { name: 'weight_kg', label: 'Weight (kg)', type: 'number', gridCols: 1 },
      {
        name: 'ssr_code',
        label: 'SSR code',
        type: 'text',
        placeholder: 'XBAG',
        gridCols: 1,
      },
      { name: 'price', label: 'Price (MNT)', type: 'number', gridCols: 1 },
      { name: 'is_active', label: 'Active', type: 'checkbox', gridCols: 2 },
    ],
    create: (v) => baggageRuleService.create(v),
    update: (row, v) => baggageRuleService.update(row.id, v),
  },
  remove: { run: (r) => baggageRuleService.remove(r.id), label: (r) => r.name },
}
