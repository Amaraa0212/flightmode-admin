import { z } from 'zod'
import {
  fareTaxService,
  taxCodeOptions,
  type FareEntry,
  type FareTax,
} from '@/services'
import {
  ConfigFormDialog,
  type FormFieldConfig,
} from '@/components/ui/config-form-dialog'
import { BOUND_OPTIONS, PAX_OPTIONS, useFareMutation } from '../../shared'

const schema = z.object({
  tax_code_id: z.string().min(1, 'Select a tax code'),
  airport_id: z.string(),
  bound: z.enum(['OUT', 'IN']),
  passenger_type: z.enum(['ADT', 'CHD', 'INF']),
  amount: z.number().min(0),
  currency: z.string().trim().length(3),
  refundable: z.boolean(),
})
type Form = z.infer<typeof schema>

/**
 * Default tax of a route airport (from = OUT, to = IN), or — with `fare` — an override saved on that fare only.
 */
export function TaxDialog({
  tax,
  fare,
  airports,
  onClose,
}: {
  tax?: FareTax
  fare?: FareEntry
  /** The selected route: [from, to] airport options */
  airports: { label: string; value: string }[]
  onClose: () => void
}) {
  const save = useFareMutation((v: Form) => {
    const payload = {
      ...v,
      tax_code_id: Number(v.tax_code_id),
      airport_id: fare ? null : Number(v.airport_id),
      fare_id: fare?.id ?? tax?.fare_id ?? null,
    }
    return tax
      ? fareTaxService.update(tax.id, payload)
      : fareTaxService.create(payload)
  }, onClose)

  const fields: FormFieldConfig<Form>[] = [
    {
      name: 'tax_code_id',
      label: 'Tax code',
      type: 'select',
      required: true,
      loadOptions: taxCodeOptions,
      gridCols: 2,
    },
    {
      name: 'passenger_type',
      label: 'Type',
      type: 'select',
      options: PAX_OPTIONS,
      gridCols: 2,
    },
    ...(fare
      ? []
      : ([
          {
            name: 'airport_id',
            label: 'Route',
            type: 'select',
            required: true,
            options: airports,
            gridCols: 2,
          },
          {
            name: 'bound',
            label: 'In / Out bound',
            type: 'select',
            options: BOUND_OPTIONS,
            gridCols: 2,
          },
        ] as FormFieldConfig<Form>[])),
    {
      name: 'amount',
      label: 'Amount',
      type: 'number',
      required: true,
      gridCols: 2,
    },
    { name: 'currency', label: 'Currency', type: 'text', gridCols: 2 },
    { name: 'refundable', label: 'Refundable', type: 'checkbox', gridCols: 1 },
  ]

  const values: Form = tax
    ? {
        tax_code_id: String(tax.tax_code_id),
        airport_id: tax.airport_id ? String(tax.airport_id) : '',
        bound: tax.bound,
        passenger_type: tax.passenger_type,
        amount: Number(tax.amount),
        currency: tax.currency,
        refundable: tax.refundable,
      }
    : {
        tax_code_id: '',
        airport_id: airports[0]?.value ?? '',
        bound: 'OUT',
        passenger_type: 'ADT',
        amount: 0,
        currency: fare?.currency ?? 'MNT',
        refundable: true,
      }

  return (
    <ConfigFormDialog<Form>
      open
      onClose={onClose}
      schema={schema}
      fields={fields}
      data={tax ? values : undefined}
      defaultValues={values}
      onSubmit={async (v) => {
        await save.mutateAsync(v)
      }}
      title={`${tax ? 'Edit' : 'Add'} ${fare ? `tax override · fare #${fare.id}` : 'fare tax'}`}
      description={
        fare
          ? 'Replaces the route default of the same tax code for this fare only.'
          : 'OUT is charged on fares departing the airport, IN on fares arriving there.'
      }
      submitButtonText={tax ? 'Save' : 'Create'}
      isSubmitting={save.isPending}
      maxWidth='lg'
    />
  )
}
