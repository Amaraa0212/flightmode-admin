import { z } from 'zod'
import { fareClassService, type FareClass, type Rbd } from '@/services'
import {
  ConfigFormDialog,
  type FormFieldConfig,
} from '@/components/ui/config-form-dialog'
import { useFareMutation } from '../../shared'

const schema = z
  .object({
    rbd_id: z.string().min(1, 'Select an RBD'),
    booking_code: z
      .string()
      .trim()
      .regex(/^[A-Za-z0-9]{1,10}$/, 'A-Z / 0-9, no spaces, max 10'),
    description: z.string().max(100),
    status: z.enum(['HK', 'SA']),
    trip_type: z.enum(['OW', 'RT']),
    waitlist: z.boolean(),
    is_visible: z.boolean(),
    is_group: z.boolean(),
    group_min: z.number().int().min(0),
    group_max: z.number().int().min(0),
    rule: z.string(),
    is_active: z.boolean(),
  })
  .refine(
    (v) => !v.is_group || (v.group_min >= 1 && v.group_max >= v.group_min),
    {
      message: 'Group max must be ≥ group min (min ≥ 1)',
      path: ['group_max'],
    }
  )
type Form = z.infer<typeof schema>

export function FareClassDialog({
  fareClass,
  rbds,
  rbdId,
  onClose,
}: {
  fareClass?: FareClass
  rbds: Rbd[]
  rbdId?: number
  onClose: () => void
}) {
  const save = useFareMutation((v: Form) => {
    const payload = {
      ...v,
      rbd_id: Number(v.rbd_id),
      group_min: v.is_group ? v.group_min : null,
      group_max: v.is_group ? v.group_max : null,
    }
    return fareClass
      ? fareClassService.update(fareClass.id, payload)
      : fareClassService.create(payload)
  }, onClose)

  const fields: FormFieldConfig<Form>[] = [
    {
      name: 'rbd_id',
      label: 'RBD',
      type: 'select',
      required: true,
      options: rbds.map((r) => ({
        label: `${r.code} · ${r.cabin_class}`,
        value: String(r.id),
      })),
      gridCols: 2,
    },
    {
      name: 'booking_code',
      label: 'Booking code',
      type: 'text',
      required: true,
      placeholder: 'YOW',
      gridCols: 2,
    },
    {
      name: 'description',
      label: 'Description',
      type: 'text',
      placeholder: 'max 100 characters',
      gridCols: 1,
    },
    {
      name: 'status',
      label: 'Status',
      type: 'select',
      options: [
        { label: 'HK - Confirmed', value: 'HK' },
        { label: 'SA - Stand-by', value: 'SA' },
      ],
      gridCols: 2,
    },
    {
      name: 'trip_type',
      label: 'Trip',
      type: 'select',
      options: [
        { label: 'OW - One way', value: 'OW' },
        { label: 'RT - Round trip', value: 'RT' },
      ],
      gridCols: 2,
    },
    { name: 'waitlist', label: 'Waitlist (HL)', type: 'checkbox', gridCols: 4 },
    { name: 'is_visible', label: 'Visible', type: 'checkbox', gridCols: 4 },
    { name: 'is_group', label: 'Group fare', type: 'checkbox', gridCols: 4 },
    { name: 'is_active', label: 'Active', type: 'checkbox', gridCols: 4 },
    {
      name: 'group_min',
      label: 'Group min',
      type: 'number',
      gridCols: 2,
      showWhen: { field: 'is_group', value: true },
    },
    {
      name: 'group_max',
      label: 'Group max',
      type: 'number',
      gridCols: 2,
      showWhen: { field: 'is_group', value: true },
    },
    { name: 'rule', label: 'Rule', type: 'textarea', rows: 3, gridCols: 1 },
  ]

  const values: Form = fareClass
    ? {
        rbd_id: String(fareClass.rbd_id),
        booking_code: fareClass.booking_code,
        description: fareClass.description ?? '',
        status: fareClass.status,
        trip_type: fareClass.trip_type,
        waitlist: fareClass.waitlist,
        is_visible: fareClass.is_visible,
        is_group: fareClass.is_group,
        group_min: fareClass.group_min ?? 0,
        group_max: fareClass.group_max ?? 0,
        rule: fareClass.rule ?? '',
        is_active: fareClass.is_active,
      }
    : {
        rbd_id: rbdId ? String(rbdId) : '',
        booking_code: '',
        description: '',
        status: 'HK',
        trip_type: 'OW',
        waitlist: false,
        is_visible: true,
        is_group: false,
        group_min: 0,
        group_max: 0,
        rule: '',
        is_active: true,
      }

  return (
    <ConfigFormDialog<Form>
      open
      onClose={onClose}
      schema={schema}
      fields={fields}
      data={fareClass ? values : undefined}
      defaultValues={values}
      onSubmit={async (v) => {
        await save.mutateAsync(v)
      }}
      title={
        fareClass
          ? `Edit fare class ${fareClass.booking_code}`
          : 'Add fare class'
      }
      submitButtonText={fareClass ? 'Save' : 'Create'}
      isSubmitting={save.isPending}
      maxWidth='xl'
    />
  )
}
