import { z } from 'zod'
import {
  airportOptions,
  fareClassOptions,
  fareEntryService,
  type FareEntry,
} from '@/services'
import {
  ConfigFormDialog,
  type FormFieldConfig,
} from '@/components/ui/config-form-dialog'
import { useFareMutation } from '../../shared'

const schema = z
  .object({
    fare_class_id: z.string().min(1, 'Select a fare class'),
    origin_airport_id: z.string().min(1, 'Select the origin'),
    destination_airport_id: z.string().min(1, 'Select the destination'),
    base_amount: z.number().min(0),
    currency: z.string().trim().length(3),
    valid_from: z.string().min(1),
    valid_to: z.string().min(1),
    is_active: z.boolean(),
  })
  .refine((v) => v.origin_airport_id !== v.destination_airport_id, {
    message: 'Destination must differ from origin',
    path: ['destination_airport_id'],
  })
  .refine((v) => v.valid_to >= v.valid_from, {
    message: 'Must be on or after valid from',
    path: ['valid_to'],
  })
type Form = z.infer<typeof schema>

const FIELDS: FormFieldConfig<Form>[] = [
  {
    name: 'fare_class_id',
    label: 'Fare class',
    type: 'select',
    required: true,
    loadOptions: fareClassOptions,
    gridCols: 1,
  },
  {
    name: 'origin_airport_id',
    label: 'Route 1 (from)',
    type: 'select',
    required: true,
    loadOptions: airportOptions,
    gridCols: 2,
  },
  {
    name: 'destination_airport_id',
    label: 'Route 2 (to)',
    type: 'select',
    required: true,
    loadOptions: airportOptions,
    gridCols: 2,
  },
  {
    name: 'base_amount',
    label: 'Amount',
    type: 'number',
    required: true,
    gridCols: 2,
  },
  { name: 'currency', label: 'Currency', type: 'text', gridCols: 2 },
  {
    name: 'valid_from',
    label: 'From date',
    type: 'date',
    required: true,
    gridCols: 2,
  },
  {
    name: 'valid_to',
    label: 'To date',
    type: 'date',
    required: true,
    gridCols: 2,
  },
  { name: 'is_active', label: 'Active', type: 'checkbox', gridCols: 1 },
]

export function FareDialog({
  fare,
  from,
  to,
  onClose,
}: {
  fare?: FareEntry
  from?: number
  to?: number
  onClose: () => void
}) {
  const save = useFareMutation((v: Form) => {
    const payload = {
      ...v,
      fare_class_id: Number(v.fare_class_id),
      origin_airport_id: Number(v.origin_airport_id),
      destination_airport_id: Number(v.destination_airport_id),
    }
    return fare
      ? fareEntryService.update(fare.id, payload)
      : fareEntryService.create(payload)
  }, onClose)

  const values: Form = fare
    ? {
        fare_class_id: fare.fare_class_id ? String(fare.fare_class_id) : '',
        origin_airport_id: String(fare.origin_airport_id),
        destination_airport_id: String(fare.destination_airport_id),
        base_amount: Number(fare.base_amount),
        currency: fare.currency,
        valid_from: fare.valid_from,
        valid_to: fare.valid_to,
        is_active: fare.is_active,
      }
    : {
        fare_class_id: '',
        origin_airport_id: from ? String(from) : '',
        destination_airport_id: to ? String(to) : '',
        base_amount: 0,
        currency: 'MNT',
        valid_from: '',
        valid_to: '',
        is_active: true,
      }

  return (
    <ConfigFormDialog<Form>
      open
      onClose={onClose}
      schema={schema}
      fields={FIELDS}
      data={fare ? values : undefined}
      defaultValues={values}
      onSubmit={async (v) => {
        await save.mutateAsync(v)
      }}
      title={fare ? 'Edit fare' : 'Add fare'}
      description='Base fare of a fare class on a route. Discounts come from the fare class, taxes from Fare Tax.'
      submitButtonText={fare ? 'Save' : 'Create'}
      isSubmitting={save.isPending}
      maxWidth='lg'
    />
  )
}
