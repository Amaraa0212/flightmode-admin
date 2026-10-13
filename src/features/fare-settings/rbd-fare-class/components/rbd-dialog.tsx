import { z } from 'zod'
import { rbdService, type Rbd } from '@/services'
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
  description: z.string().max(255),
  is_active: z.boolean(),
})
type Form = z.infer<typeof schema>

export function RbdDialog({
  rbd,
  rbds,
  onClose,
}: {
  rbd?: Rbd
  rbds: Rbd[]
  onClose: () => void
}) {
  const save = useFareMutation((v: Form) => {
    const payload = {
      ...v,
      parent_id: v.parent_id === NONE ? null : Number(v.parent_id),
    }
    return rbd ? rbdService.update(rbd.id, payload) : rbdService.create(payload)
  }, onClose)

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
      label: 'Parent RBD',
      type: 'select',
      options: parents,
      gridCols: 2,
    },
    {
      name: 'description',
      label: 'Description',
      type: 'textarea',
      rows: 2,
      gridCols: 1,
    },
    { name: 'is_active', label: 'Active', type: 'checkbox', gridCols: 1 },
  ]

  const values: Form = rbd
    ? {
        code: rbd.code,
        cabin_class: rbd.cabin_class,
        rank: rbd.rank,
        parent_id: rbd.parent_id ? String(rbd.parent_id) : NONE,
        description: rbd.description ?? '',
        is_active: rbd.is_active,
      }
    : {
        code: '',
        cabin_class: 'Y',
        rank: 0,
        parent_id: NONE,
        description: '',
        is_active: true,
      }

  return (
    <ConfigFormDialog<Form>
      open
      onClose={onClose}
      schema={schema}
      fields={fields}
      data={rbd ? values : undefined}
      defaultValues={values}
      onSubmit={async (v) => {
        await save.mutateAsync(v)
      }}
      title={rbd ? `Edit RBD ${rbd.code}` : 'Add RBD'}
      description='Booking class letter inside a cabin. Rank sets the selling order.'
      submitButtonText={rbd ? 'Save' : 'Create'}
      isSubmitting={save.isPending}
      maxWidth='lg'
    />
  )
}
