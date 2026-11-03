import { z } from 'zod'
import { useQuery } from '@tanstack/react-query'
import { fareFamilyService, rbdService, type Rbd } from '@/services'
import {
  ConfigFormDialog,
  type FormFieldConfig,
} from '@/components/ui/config-form-dialog'
import { CABIN_OPTIONS, useFareMutation } from '../../shared'

const NONE = 'none'

const schema = z.object({
  code: z
    .string()
    .trim()
    .regex(/^[A-Za-z]{1,2}$/, 'A-Z letter'),
  cabin_class: z.enum(['F', 'C', 'W', 'Y']),
  rank: z.number().int().min(0).max(999),
  parent_id: z.string(),
  fare_family_id: z.string(),
  // 0 = can be booked any time
  advance_booking_days: z.number().int().min(0).max(365),
  is_upgrade: z.boolean(),
  description: z.string().max(255),
  is_active: z.boolean(),
})
type Form = z.infer<typeof schema>

export function RbdDialog({
  rbd,
  rbds,
  airlineId,
  onClose,
}: {
  rbd?: Rbd
  /** booking classes of the same airline */
  rbds: Rbd[]
  /** system administrators: the airline a new booking class is created for */
  airlineId?: number
  onClose: () => void
}) {
  // a letter is used once per airline: refuse it here instead of after saving
  const taken = new Set(rbds.filter((r) => r.id !== rbd?.id).map((r) => r.code))
  const formSchema = schema.refine(
    (v) => !taken.has(v.code.trim().toUpperCase()),
    {
      message: 'Энэ booking class аль хэдийн бүртгэгдсэн байна',
      path: ['code'],
    }
  )

  const save = useFareMutation((v: Form) => {
    const payload = {
      ...v,
      airline_id: rbd ? undefined : airlineId,
      parent_id: v.parent_id === NONE ? null : Number(v.parent_id),
      fare_family_id:
        v.fare_family_id === NONE ? null : Number(v.fare_family_id),
      advance_booking_days: v.advance_booking_days || null,
    }
    return rbd ? rbdService.update(rbd.id, payload) : rbdService.create(payload)
  }, onClose)

  const { data: families = [] } = useQuery({
    queryKey: ['fare-settings', 'fare-families'],
    queryFn: async () => (await fareFamilyService.all()).body.items ?? [],
  })

  const parents = [
    { label: '— none —', value: NONE },
    ...rbds
      .filter((r) => r.id !== rbd?.id)
      .map((r) => ({
        label: `${r.code} · ${r.cabin_class}`,
        value: String(r.id),
      })),
  ]

  const fields: FormFieldConfig<Form>[] = [
    {
      name: 'code',
      label: 'Code',
      type: 'text',
      required: true,
      placeholder: 'Y',
      gridCols: 2,
    },
    {
      name: 'cabin_class',
      label: 'Cabin',
      type: 'select',
      options: CABIN_OPTIONS,
      gridCols: 2,
    },
    {
      name: 'rank',
      label: 'Rank',
      type: 'number',
      required: true,
      gridCols: 2,
    },
    {
      name: 'parent_id',
      label: 'Parent booking class',
      type: 'select',
      options: parents,
      gridCols: 2,
    },
    {
      name: 'fare_family_id',
      label: 'Fare family',
      type: 'select',
      options: [
        { label: '— none —', value: NONE },
        ...families
          .filter((f) => f.is_active || f.id === rbd?.fare_family_id)
          .map((f) => ({
            label: `${f.code} · ${f.name}`,
            value: String(f.id),
          })),
      ],
      gridCols: 2,
    },
    {
      name: 'advance_booking_days',
      label: 'Advance booking days (0 = none)',
      type: 'number',
      min: '0',
      gridCols: 2,
    },
    {
      name: 'description',
      label: 'Description',
      type: 'textarea',
      rows: 2,
      gridCols: 1,
    },
    { name: 'is_upgrade', label: 'Upgrade', type: 'checkbox', gridCols: 2 },
    { name: 'is_active', label: 'Active', type: 'checkbox', gridCols: 2 },
  ]

  const values: Form = rbd
    ? {
        code: rbd.code,
        cabin_class: rbd.cabin_class,
        rank: rbd.rank,
        parent_id: rbd.parent_id ? String(rbd.parent_id) : NONE,
        fare_family_id: rbd.fare_family_id ? String(rbd.fare_family_id) : NONE,
        advance_booking_days: rbd.advance_booking_days ?? 0,
        is_upgrade: rbd.is_upgrade,
        description: rbd.description ?? '',
        is_active: rbd.is_active,
      }
    : {
        code: '',
        cabin_class: 'Y',
        rank: 0,
        parent_id: NONE,
        fare_family_id: NONE,
        advance_booking_days: 0,
        is_upgrade: false,
        description: '',
        is_active: true,
      }

  return (
    <ConfigFormDialog<Form>
      open
      onClose={onClose}
      schema={formSchema}
      fields={fields}
      data={rbd ? values : undefined}
      defaultValues={values}
      onSubmit={async (v) => {
        await save.mutateAsync(v)
      }}
      title={rbd ? `Edit booking class ${rbd.code}` : 'Add Booking Class'}
      description='Booking class (RBD) letter inside a cabin. Rank sets the selling order.'
      submitButtonText={rbd ? 'Save' : 'Create'}
      isSubmitting={save.isPending}
      maxWidth='lg'
    />
  )
}
