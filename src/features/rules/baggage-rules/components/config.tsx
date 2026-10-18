import { z } from 'zod'
import { baggageRuleService, type BaggageRule } from '@/services'
import {
  ACTIVE_OPTIONS,
  BAGGAGE_RULE_TYPE,
  BAGGAGE_RULE_TYPE_OPTIONS,
  BAGGAGE_USAGE,
  BAGGAGE_USAGE_OPTIONS,
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
  type: z.enum(['piece', 'weight', 'combined']),
  ssr_code: z.string().trim().max(8),
  cabin_class: z.string(),
  pieces: z.number().int().min(0),
  weight_kg: z.number().min(0),
  max_quantity: z.number().int().min(0),
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
  description:
    'Free allowance, prepaid (XBAG) and excess (EBAG) baggage — limited by piece, by kg, or piece + kg',
  queryKey: 'admin-baggage-rules',
  list: baggageRuleService.list,
  searchPlaceholder: 'Bag name or SSR',
  filters: [
    { columnId: 'usage', title: 'Usage', options: BAGGAGE_USAGE_OPTIONS },
    { columnId: 'type', title: 'Limit by', options: BAGGAGE_RULE_TYPE_OPTIONS },
    { columnId: 'cabin_class', title: 'Cabin', options: CABINS },
    { columnId: 'is_active', title: 'Status', options: ACTIVE_OPTIONS },
  ],
  columns: [
    col<BaggageRule>('name', 'Bag name', (r) => (
      <span className='font-medium'>{r.name}</span>
    )),
    col<BaggageRule>('usage', 'Usage', (r) => chip(r.usage, BAGGAGE_USAGE)),
    col<BaggageRule>('type', 'Limit by', (r) => chip(r.type, BAGGAGE_RULE_TYPE)),
    col<BaggageRule>(
      'allowance',
      'Allowance',
      (r) =>
        mono(
          r.type === 'combined'
            ? `${r.weight_kg * Math.max(1, r.pieces)} kg total · max ${r.max_quantity ?? '∞'} pc`
            : `${r.pieces} pc · ${r.weight_kg} kg · max ${r.max_quantity ?? '∞'} pc`
        ),
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
      type: 'piece',
      ssr_code: '',
      cabin_class: 'ALL',
      pieces: 1,
      weight_kg: 23,
      max_quantity: 1,
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
      max_quantity: r.max_quantity ?? 0,
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
        label: 'Limit by',
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
      { name: 'pieces', label: 'Free pieces', type: 'number', gridCols: 1 },
      // Piece + kg: free kg pool = kg × free pieces (1 pc · 23 kg → 2 bags of 22 kg fit, 1 kg stays free)
      {
        name: 'weight_kg',
        label: 'Kg per piece',
        type: 'number',
        gridCols: 1,
        placeholder: 'Piece + kg: pool = kg × free pieces',
      },
      {
        name: 'max_quantity',
        label: 'Max pieces (0 = unlimited)',
        type: 'number',
        gridCols: 1,
      },
      {
        name: 'ssr_code',
        label: 'SSR code',
        type: 'text',
        placeholder: 'FBAG / XBAG / EBAG',
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
