import { z } from 'zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { seatMapService, type SeatBlock } from '@/services'
import { toast } from 'sonner'
import {
  ConfigFormDialog,
  type FormFieldConfig,
} from '@/components/ui/config-form-dialog'

const schema = z.object({
  row_from: z.number().int().min(1),
  row_to: z.number().int().min(1),
  cabin_class: z.enum(['F', 'C', 'W', 'Y']),
  left: z
    .string()
    .trim()
    .regex(/^[A-Za-z]*$/, 'Letters only'),
  middle: z
    .string()
    .trim()
    .regex(/^[A-Za-z]*$/, 'Letters only'),
  right: z
    .string()
    .trim()
    .regex(/^[A-Za-z]*$/, 'Letters only'),
  zone: z.string().trim().min(1).max(2),
  exit_rows: z.string(),
})
type Form = z.infer<typeof schema>

const FIELDS: FormFieldConfig<Form>[] = [
  {
    name: 'row_from',
    label: 'Row start',
    type: 'number',
    required: true,
    gridCols: 1,
  },
  {
    name: 'row_to',
    label: 'Row end',
    type: 'number',
    required: true,
    gridCols: 1,
  },
  {
    name: 'left',
    label: 'Left seats',
    type: 'text',
    placeholder: 'ABC',
    gridCols: 1,
  },
  {
    name: 'middle',
    label: 'Mid seats',
    type: 'text',
    placeholder: 'DEF (wide body)',
    gridCols: 1,
  },
  {
    name: 'right',
    label: 'Right seats',
    type: 'text',
    placeholder: 'HJK',
    gridCols: 1,
  },
  {
    name: 'cabin_class',
    label: 'Cabin',
    type: 'select',
    options: [
      { label: 'First (F)', value: 'F' },
      { label: 'Business (C)', value: 'C' },
      { label: 'Premium (W)', value: 'W' },
      { label: 'Economy (Y)', value: 'Y' },
    ],
    gridCols: 1,
  },
  { name: 'zone', label: 'Zone', type: 'text', placeholder: 'A', gridCols: 1 },
  {
    name: 'exit_rows',
    label: 'Exit rows',
    type: 'text',
    placeholder: '14, 15',
    gridCols: 1,
  },
]

export function BlockDialog({
  aircraftId,
  block,
  onClose,
}: {
  aircraftId: number
  block?: SeatBlock
  onClose: () => void
}) {
  const queryClient = useQueryClient()
  const save = useMutation({
    mutationFn: async (v: Form) =>
      seatMapService.saveBlock(aircraftId, v, block),
    onSuccess: (res) => {
      toast.success(res.message)
      queryClient.invalidateQueries({ queryKey: ['admin-seat-map'] })
      onClose()
    },
    onError: (error: Error) => toast.error(error.message),
  })
  const values: Form = block
    ? { ...block, exit_rows: block.exit_rows.join(', ') }
    : {
        row_from: 1,
        row_to: 1,
        cabin_class: 'Y',
        left: 'ABC',
        middle: '',
        right: 'DEF',
        zone: 'A',
        exit_rows: '',
      }

  return (
    <ConfigFormDialog<Form>
      open
      onClose={onClose}
      schema={schema}
      fields={FIELDS}
      data={block ? values : undefined}
      defaultValues={values}
      onSubmit={async (v) => {
        await save.mutateAsync(v)
      }}
      title={block ? 'Edit seat configuration' : 'Add seat configuration'}
      description='Rows in a block share the same seat letters, cabin and zone.'
      isSubmitting={save.isPending}
      maxWidth='lg'
    />
  )
}
