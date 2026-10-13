import { z } from 'zod'
import { fareClassService, type FareClass, type FareDiscount } from '@/services'
import {
  ConfigFormDialog,
  type FormFieldConfig,
} from '@/components/ui/config-form-dialog'
import { PAX_OPTIONS, useFareMutation } from '../../shared'

const schema = z
  .object({
    passenger_type: z.enum(['ADT', 'CHD', 'INF']),
    age_from: z.number().int().min(0).max(120),
    age_to: z.number().int().min(0).max(120),
    percentage: z.number().int().min(0).max(100),
  })
  .refine((v) => v.age_to >= v.age_from, {
    message: 'Age to must be ≥ age from',
    path: ['age_to'],
  })
type Form = z.infer<typeof schema>

const DEFAULT_AGES: Record<Form['passenger_type'], [number, number]> = {
  ADT: [12, 120],
  CHD: [2, 11],
  INF: [0, 1],
}

export function DiscountDialog({
  fareClass,
  discount,
  onClose,
}: {
  fareClass: FareClass
  discount?: FareDiscount
  onClose: () => void
}) {
  const save = useFareMutation(
    (v: Form) =>
      discount
        ? fareClassService.updateDiscount(fareClass.id, discount.id, v)
        : fareClassService.createDiscount(fareClass.id, v),
    onClose
  )

  // one discount per passenger type: offer the free ones first
  const used = fareClass.discounts
    .filter((d) => d.id !== discount?.id)
    .map((d) => d.passenger_type)
  const free = PAX_OPTIONS.filter(
    (o) => !used.includes(o.value as Form['passenger_type'])
  )
  const type = (discount?.passenger_type ??
    free[0]?.value ??
    'CHD') as Form['passenger_type']

  const fields: FormFieldConfig<Form>[] = [
    {
      name: 'passenger_type',
      label: 'Passenger type',
      type: 'select',
      options: free,
      gridCols: 2,
    },
    {
      name: 'percentage',
      label: 'Discount %',
      type: 'number',
      required: true,
      gridCols: 2,
    },
    { name: 'age_from', label: 'Age from', type: 'number', gridCols: 2 },
    { name: 'age_to', label: 'Age to', type: 'number', gridCols: 2 },
  ]

  const values: Form = discount
    ? {
        passenger_type: discount.passenger_type,
        age_from: discount.age_from ?? 0,
        age_to: discount.age_to ?? 120,
        percentage: discount.percentage,
      }
    : {
        passenger_type: type,
        age_from: DEFAULT_AGES[type][0],
        age_to: DEFAULT_AGES[type][1],
        percentage: 0,
      }

  return (
    <ConfigFormDialog<Form>
      open
      onClose={onClose}
      schema={schema}
      fields={fields}
      data={discount ? values : undefined}
      defaultValues={values}
      onSubmit={async (v) => {
        await save.mutateAsync(v)
      }}
      title={`${discount ? 'Edit' : 'Add'} fare discount · ${fareClass.booking_code}`}
      description='Passenger pays base fare × (100 − discount) %.'
      submitButtonText={discount ? 'Save' : 'Create'}
      isSubmitting={save.isPending}
      maxWidth='md'
    />
  )
}
