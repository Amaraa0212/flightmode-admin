import { z } from 'zod'
import { airlineSsrService, type AirlineSsr } from '@/services'
import { brand, col, money, muted } from '@/components/resource/columns'
import type { ResourcePageProps } from '@/components/resource/resource-page'

const schema = z.object({
  code: z.string().trim().length(4, '4 letters'),
  name: z.string().trim().min(2),
  category: z.string().min(1),
  price: z.number().min(0),
})
type Form = z.infer<typeof schema>

const CATEGORIES = ['Medical', 'Meal', 'Passenger', 'Baggage'].map((c) => ({
  label: c,
  value: c,
}))

export const pageConfig: Omit<
  ResourcePageProps<AirlineSsr, Form>,
  'search' | 'navigate'
> = {
  title: 'SSR',
  description:
    'Special service requests the airline offers (check-in, booking, online)',
  queryKey: 'admin-ssr',
  list: airlineSsrService.list,
  searchPlaceholder: 'Code or name',
  filters: [{ columnId: 'category', title: 'Category', options: CATEGORIES }],
  columns: [
    col<AirlineSsr>('code', 'Code', (r) => brand(r.code)),
    col<AirlineSsr>('name', 'Name', (r) => (
      <span className='font-medium'>{r.name}</span>
    )),
    col<AirlineSsr>('category', 'Category', (r) => muted(r.category)),
    col<AirlineSsr>('price', 'Price', (r) =>
      r.price ? money(r.price) : muted('Free')
    ),
  ],
  form: {
    entity: 'SSR',
    schema,
    empty: { code: '', name: '', category: 'Passenger', price: 0 },
    fromRow: (r) => ({
      code: r.code,
      name: r.name,
      category: r.category,
      price: r.price ?? 0,
    }),
    fields: [
      {
        name: 'code',
        label: 'Code',
        type: 'text',
        required: true,
        gridCols: 1,
      },
      {
        name: 'category',
        label: 'Category',
        type: 'select',
        options: CATEGORIES,
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
        name: 'price',
        label: 'Price (MNT, 0 = free)',
        type: 'number',
        gridCols: 2,
      },
    ],
    create: (v) => airlineSsrService.create(v),
    update: (row, v) => airlineSsrService.update(row.id, v),
  },
  remove: { run: (r) => airlineSsrService.remove(r.id), label: (r) => r.code },
}
