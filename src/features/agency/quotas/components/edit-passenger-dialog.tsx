import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Loader2, UserPlus } from 'lucide-react'
import { toast } from 'sonner'
import { z } from 'zod'
import { agencyPortalService, type AgencyPassengerEdit, type AgencyQuota } from '@/services'
import { Button } from '@/components/ui/button'
import { AddToBookingDialog } from './add-to-booking-dialog'
import { BaseDialog } from '@/components/ui/base-dialog'
import { Input } from '@/components/ui/input'
import { infant, InfantSection, latinName } from './booking-dialog'
import { SsrPicker } from './ssr-picker'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const schema = z.object({
  last_name: latinName('Овог оруулна уу'),
  first_name: latinName('Нэр оруулна уу'),
  gender: z.enum(['M', 'F']),
  date_of_birth: z.string(),
  nationality: z.string().trim().max(3).regex(/^[A-Za-z]*$/, 'Латин үсгээр (MN)'),
  document_number: z.string().trim().regex(/^[A-Za-z0-9]*$/, 'Зөвхөн латин үсэг, тоо'),
  document_expires_at: z.string(),
  phone: z.string(),
  email: z.union([z.literal(''), z.email('И-мэйл буруу')]),
  ssr_codes: z.array(z.string()),
  infant: infant.nullable(),
})
type EditForm = z.infer<typeof schema>

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <label className='grid content-start gap-1.5'>
      <span className='text-muted-foreground text-xs font-medium'>{label}</span>
      {children}
      {error && <span className='text-destructive text-[11px]'>{error}</span>}
    </label>
  )
}

/** Agency agent: correct a booked passenger's name, passport and contact (not after check-in) */
export function EditPassengerDialog({
  passengerId,
  quotaId,
  onClose,
  booking,
  quota,
}: {
  passengerId: number
  quotaId: number
  onClose: () => void
  /** the passenger's PNR: more passengers can be added to it (within the quota) */
  booking?: { id: number; pnr: string } | null
  quota?: AgencyQuota | null
}) {
  const queryClient = useQueryClient()
  const [adding, setAdding] = useState(false)
  const { data } = useQuery({
    queryKey: ['agency-passenger', passengerId],
    queryFn: () => agencyPortalService.passenger(passengerId),
  })
  const form = useForm<EditForm>({
    resolver: zodResolver(schema),
    values: data && {
      last_name: data.last_name,
      first_name: data.first_name,
      gender: data.gender ?? 'M',
      date_of_birth: data.date_of_birth ?? '',
      nationality: data.nationality ?? '',
      document_number: data.document_number ?? '',
      document_expires_at: data.document_expires_at ?? '',
      phone: data.phone ?? '',
      email: data.email ?? '',
      ssr_codes: data.segments?.[0]?.ssr_codes ?? [],
      infant: data.infant
        ? {
            last_name: data.infant.last_name,
            first_name: data.infant.first_name,
            gender: data.infant.gender ?? 'M',
            date_of_birth: data.infant.date_of_birth ?? '',
            document_number: data.infant.document_number ?? '',
            document_expires_at: data.infant.document_expires_at ?? '',
          }
        : null,
    },
  })
  const save = useMutation({
    mutationFn: (v: AgencyPassengerEdit) => agencyPortalService.updatePassenger(passengerId, v),
    onSuccess: (res) => {
      toast.success(res.message)
      queryClient.invalidateQueries({ queryKey: ['agency-quota-passengers', quotaId] })
      queryClient.invalidateQueries({ queryKey: ['agency-passenger', passengerId] })
      onClose()
    },
    onError: (error: Error) => toast.error(error.message),
  })
  const errors = form.formState.errors

  return (
    <BaseDialog
      open
      onOpenChange={(open) => !open && onClose()}
      title='Зорчигч засах'
      description='Нэр, паспорт, холбоо барих мэдээлэл, нярай нэмэх / хасах. Check-in хийсэн зорчигчийг засах боломжгүй.'
      maxWidth='2xl'
      submitButton={{
        text: 'Хадгалах',
        onClick: form.handleSubmit((v) => save.mutate(v)),
        loading: save.isPending,
        disabled: !data,
      }}
    >
      {!data ? (
        <div className='text-muted-foreground flex justify-center py-10'>
          <Loader2 className='size-5 animate-spin' />
        </div>
      ) : (
        <div className='grid gap-4'>
          <div className='grid gap-4 sm:grid-cols-2'>
            <Field label='Овог *' error={errors.last_name?.message}>
              <Input className='h-10 uppercase' {...form.register('last_name')} />
            </Field>
            <Field label='Нэр *' error={errors.first_name?.message}>
              <Input className='h-10 uppercase' {...form.register('first_name')} />
            </Field>
          </div>
          <div className='grid gap-4 sm:grid-cols-3'>
            <Field label='Хүйс'>
              <Select value={form.watch('gender')} onValueChange={(v) => form.setValue('gender', v as 'M' | 'F')}>
                <SelectTrigger className='h-10 w-full'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='M'>Эрэгтэй (M)</SelectItem>
                  <SelectItem value='F'>Эмэгтэй (F)</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label='Төрсөн огноо'>
              <Input className='h-10' type='date' {...form.register('date_of_birth')} />
            </Field>
            <Field label='Иргэншил' error={errors.nationality?.message}>
              <Input className='h-10 uppercase' maxLength={3} {...form.register('nationality')} />
            </Field>
          </div>
          <div className='grid gap-4 sm:grid-cols-2'>
            <Field label='Паспортын дугаар' error={errors.document_number?.message}>
              <Input className='h-10 font-mono uppercase' {...form.register('document_number')} />
            </Field>
            <Field label='Паспорт дуусах'>
              <Input className='h-10' type='date' {...form.register('document_expires_at')} />
            </Field>
          </div>
          <div className='grid gap-4 sm:grid-cols-2'>
            <Field label='Утас'>
              <Input className='h-10' {...form.register('phone')} />
            </Field>
            <Field label='И-мэйл' error={errors.email?.message}>
              <Input className='h-10' type='email' {...form.register('email')} />
            </Field>
          </div>
          <SsrPicker
            quotaId={quotaId}
            value={form.watch('ssr_codes') ?? []}
            onChange={(codes) => form.setValue('ssr_codes', codes)}
          />
          <InfantSection
            form={form}
            base=''
            canAdd={quota?.infants_left === null || quota?.infants_left === undefined || quota.infants_left > 0 || !!data?.infant}
          />
          {booking && quota && (
            <div className='flex justify-end border-t pt-3'>
              <Button type='button' variant='outline' size='sm' className='gap-1.5' onClick={() => setAdding(true)}>
                <UserPlus className='size-4' />
                PNR {booking.pnr}-д зорчигч нэмэх
              </Button>
            </div>
          )}
          {adding && booking && quota && (
            <AddToBookingDialog booking={booking} quota={quota} onClose={() => setAdding(false)} />
          )}
        </div>
      )}
    </BaseDialog>
  )
}
