import { z } from 'zod'
import { useForm, useFieldArray, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { agencyPortalService, type AgencyQuota } from '@/services'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'
import { BaseDialog } from '@/components/ui/base-dialog'
import { Button } from '@/components/ui/button'
import { blank, PassengerCard, schema, type Form } from './booking-dialog'

// no contact here: the booking has one
const addSchema = schema.extend({
  contact_phone: z.string(),
  contact_email: z.string(),
}) as unknown as typeof schema

/**
 * More passengers in an existing PNR: the same flights and quota (its seats and the aircraft's infant limit apply),
 * the cabin and fare of the booking. On an open-jaw trip they go on the linked PNR too.
 */
export function AddToBookingDialog({
  booking,
  quota,
  onClose,
}: {
  booking: { id: number; pnr: string }
  quota: AgencyQuota
  onClose: () => void
}) {
  const queryClient = useQueryClient()
  const cabin = quota.cabin_classes[0] ?? 'Y'
  const form = useForm<Form>({
    resolver: zodResolver(addSchema) as Resolver<Form>,
    defaultValues: {
      passengers: [blank(cabin)],
      contact_phone: '',
      contact_email: '',
    },
  })
  const rows = useFieldArray({ control: form.control, name: 'passengers' })
  const save = useMutation({
    mutationFn: (v: Form) =>
      agencyPortalService.addToBooking(booking.id, v.passengers),
    onSuccess: (res) => {
      toast.success(res.message)
      queryClient.invalidateQueries({ queryKey: ['agency-quota-passengers'] })
      queryClient.invalidateQueries({ queryKey: ['agency-quotas'] })
      onClose()
    },
    onError: (error: Error) => toast.error(error.message),
  })
  const tooMany = rows.fields.length > quota.remaining

  return (
    <BaseDialog
      open
      onOpenChange={(open) => !open && onClose()}
      title={`PNR ${booking.pnr} — зорчигч нэмэх`}
      description={`Ижил нислэг, квот, cabin. Квотод ${quota.remaining} суудал үлдсэн${
        quota.infants_left !== null && quota.infants_left !== undefined
          ? `, INF ${quota.infants_left}`
          : ''
      }.`}
      maxWidth='3xl'
      submitButton={{
        text: `Нэмэх (${rows.fields.length} зорчигч)`,
        onClick: form.handleSubmit((v) => save.mutate(v)),
        loading: save.isPending,
        disabled: tooMany,
      }}
    >
      <div className='grid gap-4'>
        {rows.fields.map((row, i) => (
          <PassengerCard
            key={row.id}
            index={i}
            form={form}
            cabins={[cabin]}
            canRemove={rows.fields.length > 1}
            onRemove={() => rows.remove(i)}
            quotaId={quota.id}
            infantsLeft={quota.infants_left}
            hideCabin
          />
        ))}
        <Button
          type='button'
          variant='outline'
          className='w-full gap-1.5 border-dashed'
          disabled={rows.fields.length >= quota.remaining}
          onClick={() => rows.append(blank(cabin))}
        >
          <Plus className='size-4' />
          Дахин зорчигч нэмэх
        </Button>
        {tooMany && (
          <p className='text-destructive text-xs'>
            Квот дүүрсэн: {quota.remaining} суудал л үлдсэн.
          </p>
        )}
      </div>
    </BaseDialog>
  )
}
