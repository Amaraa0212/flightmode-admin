import { z } from 'zod'
import {
  baggageRuleGroupService,
  type BaggageRuleGroup,
  type BaggageRuleGroupPayload,
  type BaggageSsrRow,
} from '@/services'
import {
  ACTIVE_OPTIONS,
  BAGGAGE_RULE_TYPE,
  BAGGAGE_RULE_TYPE_OPTIONS,
} from '@/constants/status'
import { chip, col, muted } from '@/components/resource/columns'
import type { ResourcePageProps } from '@/components/resource/resource-page'
import { ActiveBadge } from '@/components/status-badge'

const SSR_OPTIONS = [
  { label: 'FBAG — free allowance', value: 'FBAG' },
  { label: 'XBAG — prepaid extra bag', value: 'XBAG' },
  { label: 'EBAG — excess', value: 'EBAG' },
]

const optionalNumber = z.number().min(0).optional()

const ssrRow = z.object({
  rule_id: z.number().optional(),
  ssr_code: z.enum(['FBAG', 'XBAG', 'EBAG'], { message: 'Select an SSR' }),
  pieces: optionalNumber,
  weight_kg: optionalNumber,
  price: optionalNumber,
})

const schema = z.object({
  name: z.string().trim().min(2),
  type: z.enum(['piece', 'weight', 'combined']),
  cabin_class: z.string(),
  max_quantity: z.number().int().min(0),
  is_active: z.boolean(),
  rules: z
    .array(ssrRow)
    .min(1, 'Add at least one SSR (FBAG, XBAG or EBAG)')
    // each SSR once per bag (the select already hides the ones taken)
    .superRefine((rows, ctx) => {
      const seen = new Set<string>()
      rows.forEach((r, i) => {
        if (seen.has(r.ssr_code)) {
          ctx.addIssue({ code: 'custom', path: [i, 'ssr_code'], message: `${r.ssr_code} is already added` })
        }
        seen.add(r.ssr_code)
      })
    }),
})
type Form = z.infer<typeof schema>

const CABINS = [
  { label: 'All cabins', value: 'ALL' },
  { label: 'Business (C)', value: 'C' },
  { label: 'Economy (Y)', value: 'Y' },
]

const SSR_TONE: Record<string, string> = {
  FBAG: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400',
  XBAG: 'border-cyan-500/40 bg-cyan-500/10 text-cyan-400',
  EBAG: 'border-amber-500/40 bg-amber-500/10 text-amber-400',
}

/** "FBAG 1pc · 23kg", "EBAG 1kg · 10,000₮" (FBAG is free: no price) */
const rowText = (r: BaggageSsrRow) =>
  [
    r.pieces ? `${r.pieces}pc` : null,
    r.weight_kg ? `${r.weight_kg}kg` : null,
    r.price && r.ssr_code !== 'FBAG' ? `${r.price.toLocaleString()}₮` : null,
  ]
    .filter(Boolean)
    .join(' · ')

export const pageConfig: Omit<
  ResourcePageProps<BaggageRuleGroup, Form>,
  'search' | 'navigate'
> = {
  title: 'Baggage rules',
  description:
    'One bag: its name, limit and cabin, with an SSR row each for FBAG (free allowance), XBAG (prepaid extra bag) and EBAG (excess) — each SSR once. PC: free pieces, each up to its kg — a piece more is charged at the piece EBAG price, kg over at the kg EBAG price. KG: one free kg total — kg over at the kg EBAG price.',
  queryKey: 'admin-baggage-rule-groups',
  list: baggageRuleGroupService.list,
  searchPlaceholder: 'Bag name or SSR',
  filters: [
    { columnId: 'ssr', title: 'SSR', options: SSR_OPTIONS.map((o) => ({ label: o.value, value: o.value })) },
    { columnId: 'type', title: 'Limit by', options: BAGGAGE_RULE_TYPE_OPTIONS },
    { columnId: 'cabin_class', title: 'Cabin', options: CABINS },
    { columnId: 'is_active', title: 'Status', options: ACTIVE_OPTIONS },
  ],
  columns: [
    col<BaggageRuleGroup>('name', 'Bag name', (r) => (
      <span className='font-medium'>{r.name}</span>
    )),
    col<BaggageRuleGroup>('type', 'Limit by', (r) => chip(r.type, BAGGAGE_RULE_TYPE)),
    col<BaggageRuleGroup>(
      'ssr',
      'SSR',
      (g) => (
        <div className='flex flex-wrap gap-1.5'>
          {g.rules.map((r) => (
            <span
              key={r.ssr_code}
              className={`rounded-md border px-1.5 py-0.5 font-mono text-[11px] ${SSR_TONE[r.ssr_code] ?? ''}`}
            >
              <b>{r.ssr_code}</b>
              {rowText(r) && <span className='opacity-80'> {rowText(r)}</span>}
            </span>
          ))}
        </div>
      ),
      { accessor: (g) => g.rules.map((r) => r.ssr_code).join(' ') }
    ),
    col<BaggageRuleGroup>(
      'max_quantity',
      'Max pieces',
      (r) => muted(r.max_quantity ? String(r.max_quantity) : '∞'),
      { accessor: (r) => r.max_quantity ?? 0 }
    ),
    col<BaggageRuleGroup>(
      'cabin_class',
      'Cabin',
      (r) => muted(r.cabin_class ?? 'All'),
      { accessor: (r) => r.cabin_class ?? 'ALL' }
    ),
    col<BaggageRuleGroup>(
      'is_active',
      'Status',
      (r) => <ActiveBadge active={r.is_active} />,
      { accessor: (r) => String(r.is_active) }
    ),
  ],
  form: {
    entity: 'baggage rule',
    schema,
    maxWidth: '2xl',
    empty: {
      name: '',
      type: 'piece',
      cabin_class: 'ALL',
      max_quantity: 0,
      is_active: true,
      rules: [{ ssr_code: 'FBAG', pieces: 1, weight_kg: 23 }],
    },
    fromRow: (r) => ({
      name: r.name,
      type: r.type,
      cabin_class: r.cabin_class ?? 'ALL',
      max_quantity: r.max_quantity ?? 0,
      is_active: r.is_active,
      rules: r.rules.map((row) => ({ ...row, ssr_code: row.ssr_code as Form['rules'][number]['ssr_code'] })),
    }),
    fields: [
      {
        name: 'name',
        label: 'Bag name',
        type: 'text',
        required: true,
        gridCols: 1,
      },
      {
        name: 'type',
        label: 'Limit by',
        type: 'select',
        options: BAGGAGE_RULE_TYPE_OPTIONS,
        required: true,
        gridCols: 2,
      },
      {
        name: 'cabin_class',
        label: 'Cabin',
        type: 'select',
        options: CABINS,
        gridCols: 2,
      },
      {
        name: 'max_quantity',
        label: 'Max pieces (0 = no limit)',
        type: 'number',
        gridCols: 2,
      },
      { name: 'is_active', label: 'Active', type: 'checkbox', gridCols: 2 },
      {
        name: 'rules',
        label: 'SSR',
        type: 'array',
        gridCols: 1,
        addButtonLabel: 'Add SSR',
        showArrayItemMax: SSR_OPTIONS.length,
        // an SSR taken by another row is not offered again
        uniqueOptionValuesInArray: true,
        arrayItemFields: [
          { name: 'ssr_code', label: 'SSR code', type: 'select', options: SSR_OPTIONS, required: true },
          { name: 'pieces', label: 'Pieces (FBAG: free pieces · XBAG: prepaid pieces)', type: 'number' },
          // PC: kg of each piece; KG: the free kg in total; EBAG per kg: 1
          { name: 'weight_kg', label: 'Kg (PC: per piece · KG: total)', type: 'number', step: '0.1' },
          // EBAG: price of an extra piece (Limit by piece) or of a kg (Limit by kg)
          // FBAG is the free allowance: no price
          {
            name: 'price',
            label: 'Price (MNT) — EBAG: per piece / per kg',
            type: 'number',
            showWhen: { field: 'ssr_code', notValue: 'FBAG' },
          },
        ],
      },
    ],
    create: (v) => baggageRuleGroupService.create(v as BaggageRuleGroupPayload),
    update: (row, v) => baggageRuleGroupService.update(row.id, v as BaggageRuleGroupPayload),
  },
  remove: { run: (r) => baggageRuleGroupService.remove(r.id), label: (r) => r.name },
}
