import { useState } from 'react'
import { useFieldArray, useForm, type UseFormReturn } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Baby, Loader2, Plus, Search, Trash2, UserPlus, X } from 'lucide-react'
import { toast } from 'sonner'
import { z } from 'zod'
import { agencyPortalService, type AgencyHold, type AgencyQuota } from '@/services'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

/** Names as in the passport: Latin letters only (tickets, APIS and the DCS cannot take Cyrillic) */
export const latinName = (required: string) =>
  z
    .string()
    .trim()
    .min(1, required)
    .regex(/^[A-Za-z][A-Za-z '-]*$/, 'Латин үсгээр бичнэ үү (кирилл үсэг, тэмдэгт болохгүй)')
export const passportNumber = z
  .string()
  .trim()
  .min(3, 'Паспортын дугаар оруулна уу')
  .regex(/^[A-Za-z0-9]+$/, 'Зөвхөн латин үсэг, тоо')

const infant = z.object({
  last_name: latinName('Овог оруулна уу'),
  first_name: latinName('Нэр оруулна уу'),
  gender: z.enum(['M', 'F']),
  date_of_birth: z.string().min(1, 'Төрсөн огноо оруулна уу'),
  document_number: passportNumber,
  document_expires_at: z.string().min(1, 'Дуусах огноо оруулна уу'),
})

const passenger = z.object({
  last_name: latinName('Овог оруулна уу'),
  first_name: latinName('Нэр оруулна уу'),
  gender: z.enum(['M', 'F']),
  date_of_birth: z.string().min(1, 'Төрсөн огноо оруулна уу'),
  nationality: z
    .string()
    .trim()
    .min(2, 'Иргэншил (MN)')
    .max(3)
    .regex(/^[A-Za-z]+$/, 'Латин үсгээр (MN)'),
  document_number: passportNumber,
  document_expires_at: z.string().min(1, 'Дуусах огноо оруулна уу'),
  phone: z.string(),
  email: z.union([z.literal(''), z.email('И-мэйл буруу')]),
  cabin_class: z.string().min(1),
  infant: infant.nullable(),
})

export const schema = z.object({
  passengers: z.array(passenger).min(1),
  contact_phone: z.string().trim().min(6, 'Холбоо барих утас оруулна уу'),
  contact_email: z.union([z.literal(''), z.email('И-мэйл буруу')]),
})
export type Form = z.infer<typeof schema>
type PassengerForm = Form['passengers'][number]

export const blank = (cabin: string): PassengerForm => ({
  last_name: '',
  first_name: '',
  gender: 'M',
  date_of_birth: '',
  nationality: 'MN',
  document_number: '',
  document_expires_at: '',
  phone: '',
  email: '',
  cabin_class: cabin,
  infant: null,
})

const blankInfant = (): NonNullable<PassengerForm['infant']> => ({
  last_name: '',
  first_name: '',
  gender: 'M',
  date_of_birth: '',
  document_number: '',
  document_expires_at: '',
})

/** Labelled field with its error underneath */
export function Field({ label, error, children, className }: { label: string; error?: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`grid content-start gap-1.5 ${className ?? ''}`}>
      <span className='text-muted-foreground text-xs font-medium'>{label}</span>
      {children}
      {error && <span className='text-destructive text-[11px]'>{error}</span>}
    </label>
  )
}

/**
 * Agency agent: add passengers on a quota — one booking (PNR) for everyone in the form.
 * A returning passenger is found by passport (this agency's earlier bookings) and filled in.
 * The API checks the remaining seats and the names deadline; the seats are taken from the quota.
 */
export function BookingDialog({
  quota,
  hold,
  onClose,
}: {
  quota: AgencyQuota | null
  /** names entered on the seats of this hold (its cabin and fare are fixed) */
  hold?: AgencyHold | null
  onClose: () => void
}) {
  const queryClient = useQueryClient()
  const cabins = hold ? [hold.cabin_class] : quota?.cabin_classes.length ? quota.cabin_classes : ['Y']
  const form = useForm<Form>({
    resolver: zodResolver(schema),
    values: { passengers: [blank(cabins[0])], contact_phone: '', contact_email: '' },
  })
  const rows = useFieldArray({ control: form.control, name: 'passengers' })
  // pay later: seats kept without tickets until the fare's time limit (TL)
  const [onHold, setOnHold] = useState(false)

  const book = useMutation({
    mutationFn: (v: Form) =>
      agencyPortalService.book(
        quota!.id,
        v.passengers,
        { phone: v.contact_phone, email: v.contact_email },
        hold ? { id: hold.id, allocation_fare_id: hold.allocation_fare_id } : undefined,
        onHold && !waitlist,
        waitlist
      ),
    onSuccess: (res) => {
      toast.success(res.message)
      queryClient.invalidateQueries({ queryKey: ['agency-quotas'] })
      queryClient.invalidateQueries({ queryKey: ['agency-holds'] })
      queryClient.invalidateQueries({ queryKey: ['agency-flights'] })
      queryClient.invalidateQueries({ queryKey: ['agency-accounts'] })
      queryClient.invalidateQueries({ queryKey: ['agency-quota-passengers', quota?.id] })
      onClose()
    },
    onError: (error: Error) => toast.error(error.message),
  })

  const remaining = hold ? hold.usage.remaining : (quota?.remaining ?? 0)
  // a full quota waitlists (WL) when the airline allows it — the agent cannot opt out, and a WL booking is not held
  const full = rows.fields.length > remaining
  const canWaitlist = !hold && !!quota?.is_waitlist
  const waitlist = full && canWaitlist
  const tooMany = full && !canWaitlist
  const errors = form.formState.errors

  return (
    <Dialog open={!!quota} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className='flex max-h-[92vh] flex-col gap-5 sm:max-w-3xl'>
        <DialogHeader>
          <DialogTitle>
            Зорчигч нэмэх — {quota?.flight_number} {quota?.route}
          </DialogTitle>
          <DialogDescription>
            Үлдсэн суудал: <b>{remaining}</b> / {quota?.seats || '∞'}. Бүх зорчигч нэг захиалга (PNR) дор орно. Өмнө нь
            захиалга хийсэн зорчигчийг паспортоор нь хайж мэдээллийг автоматаар бөглөнө.
          </DialogDescription>
        </DialogHeader>

        <form
          id='agency-booking'
          onSubmit={form.handleSubmit((v) => book.mutate(v))}
          className='-mx-1 min-h-0 flex-1 space-y-4 overflow-y-auto px-1'
        >
          {rows.fields.map((row, i) => (
            <PassengerCard
              key={row.id}
              index={i}
              form={form}
              cabins={cabins}
              canRemove={rows.fields.length > 1}
              onRemove={() => rows.remove(i)}
            />
          ))}

          <Button
            type='button'
            variant='outline'
            className='w-full gap-1.5 border-dashed'
            disabled={rows.fields.length >= remaining && !canWaitlist}
            onClick={() => rows.append(blank(cabins[0]))}
          >
            <Plus className='size-4' />
            Дахин зорчигч нэмэх
          </Button>

          <fieldset className='rounded-xl border p-4'>
            <legend className='px-1 text-sm font-semibold'>Холбоо барих</legend>
            <div className='grid gap-4 sm:grid-cols-2'>
              <Field label='Утас *' error={errors.contact_phone?.message}>
                <Input className='h-10' {...form.register('contact_phone')} placeholder='+976 9911 2233' />
              </Field>
              <Field label='И-мэйл' error={errors.contact_email?.message}>
                <Input className='h-10' type='email' {...form.register('contact_email')} placeholder='name@example.mn' />
              </Field>
            </div>
          </fieldset>
        </form>

        <DialogFooter className='items-center gap-2'>
          {tooMany && <span className='text-destructive me-auto text-xs'>Квот дүүрсэн: {remaining} суудал л үлдсэн.</span>}
          <div className='me-auto flex flex-wrap items-center gap-4 text-xs'>
            <label
              className={`flex items-center gap-2 ${waitlist ? 'opacity-50' : ''}`}
              title='Тийзийг тарифын TL хугацаанд бичнэ, түүнээс өмнө данснаас хасахгүй (HK)'
            >
              <Checkbox checked={onHold && !waitlist} disabled={waitlist} onCheckedChange={(v) => setOnHold(v === true)} />
              TL-HOLD
            </label>
            {!hold && (
              <label
                className='flex items-center gap-2 opacity-80'
                title={
                  waitlist
                    ? 'Квот дүүрсэн: захиалга хүлээлгийн жагсаалтад (WL) орно'
                    : canWaitlist
                      ? 'Квот дүүрээгүй үед WL сонгох боломжгүй'
                      : 'Энэ квот хүлээлгийн жагсаалт зөвшөөрөөгүй'
                }
              >
                <Checkbox checked={waitlist} disabled />
                Waitlist (WL)
              </label>
            )}
          </div>
          <Button type='button' variant='outline' onClick={onClose}>
            Болих
          </Button>
          <Button type='submit' form='agency-booking' className='gap-2' disabled={book.isPending || tooMany}>
            {book.isPending ? <Loader2 className='size-4 animate-spin' /> : <UserPlus className='size-4' />}
            {waitlist ? 'WL-д бүртгэх' : 'Захиалга үүсгэх'} ({rows.fields.length} зорчигч)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function PassengerCard({
  index,
  form,
  cabins,
  canRemove,
  onRemove,
}: {
  index: number
  form: UseFormReturn<Form>
  cabins: string[]
  canRemove: boolean
  onRemove: () => void
}) {
  const [searching, setSearching] = useState(false)
  const name = <K extends keyof PassengerForm>(k: K) => `passengers.${index}.${k}` as const
  const error = (k: Exclude<keyof PassengerForm, 'infant'>) => form.formState.errors.passengers?.[index]?.[k]?.message
  const infantError = (k: keyof NonNullable<PassengerForm['infant']>) =>
    form.formState.errors.passengers?.[index]?.infant?.[k]?.message

  /** Fill the card from this agency's earlier booking of the same passport */
  const lookup = async () => {
    const doc = form.getValues(name('document_number')).trim()
    if (doc.length < 3) return toast.info('Паспортын дугаараа оруулаад хайна уу.')
    setSearching(true)
    try {
      const found = await agencyPortalService.lookup(doc)
      if (!found) return toast.info(`${doc.toUpperCase()} — өмнө нь бүртгэгдээгүй зорчигч. Мэдээллээ бөглөнө үү.`)
      const set = (k: keyof PassengerForm, v: string | null | undefined) =>
        v && form.setValue(name(k), v as never, { shouldValidate: true })
      set('last_name', found.last_name)
      set('first_name', found.first_name)
      set('gender', found.gender)
      set('date_of_birth', found.date_of_birth)
      set('nationality', found.nationality)
      set('document_expires_at', found.document_expires_at)
      set('phone', found.phone)
      set('email', found.email)
      toast.success(`${found.last_name}/${found.first_name} — мэдээлэл бөглөгдлөө`)
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setSearching(false)
    }
  }

  return (
    <section className='bg-card/40 rounded-xl border p-4'>
      <div className='mb-4 flex items-center justify-between'>
        <p className='text-sm font-semibold'>Зорчигч {index + 1}</p>
        {canRemove && (
          <Button type='button' variant='ghost' size='sm' className='h-7 gap-1 text-xs' onClick={onRemove}>
            <Trash2 className='size-3.5' />
            Хасах
          </Button>
        )}
      </div>

      {/* passport first: a returning passenger is filled in from it */}
      <Field label='Паспортын дугаар *' error={error('document_number')} className='mb-4'>
        <div className='flex gap-2'>
          <Input
            className='h-10 font-mono uppercase'
            placeholder='E1234567'
            {...form.register(name('document_number'))}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                void lookup()
              }
            }}
          />
          <Button type='button' variant='secondary' className='h-10 gap-1.5' disabled={searching} onClick={lookup}>
            {searching ? <Loader2 className='size-4 animate-spin' /> : <Search className='size-4' />}
            Хайх
          </Button>
        </div>
      </Field>

      <div className='grid gap-4 sm:grid-cols-2'>
        <Field label='Овог *' error={error('last_name')}>
          <Input className='h-10 uppercase' placeholder='BATTULGA' {...form.register(name('last_name'))} />
        </Field>
        <Field label='Нэр *' error={error('first_name')}>
          <Input className='h-10 uppercase' placeholder='ANU' {...form.register(name('first_name'))} />
        </Field>
      </div>

      <div className='mt-4 grid gap-4 sm:grid-cols-4'>
        <Field label='Хүйс'>
          <Select
            value={form.watch(name('gender'))}
            onValueChange={(v) => form.setValue(name('gender'), v as 'M' | 'F')}
          >
            <SelectTrigger className='h-10 w-full'>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='M'>Эрэгтэй (M)</SelectItem>
              <SelectItem value='F'>Эмэгтэй (F)</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label='Төрсөн огноо *' error={error('date_of_birth')}>
          <Input className='h-10' type='date' {...form.register(name('date_of_birth'))} />
        </Field>
        <Field label='Иргэншил *' error={error('nationality')}>
          <Input className='h-10 uppercase' maxLength={3} {...form.register(name('nationality'))} />
        </Field>
        <Field label='Паспорт дуусах *' error={error('document_expires_at')}>
          <Input className='h-10' type='date' {...form.register(name('document_expires_at'))} />
        </Field>
      </div>

      <div className='mt-4 grid gap-4 sm:grid-cols-[1fr_1fr_120px]'>
        <Field label='Утас'>
          <Input className='h-10' placeholder='+976 9…' {...form.register(name('phone'))} />
        </Field>
        <Field label='И-мэйл' error={error('email')}>
          <Input className='h-10' type='email' {...form.register(name('email'))} />
        </Field>
        <Field label='Cabin'>
          <Select value={form.watch(name('cabin_class'))} onValueChange={(v) => form.setValue(name('cabin_class'), v)}>
            <SelectTrigger className='h-10 w-full'>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {cabins.map((c) => (
                <SelectItem key={c} value={c}>
                  {c === 'C' ? 'Business (C)' : c === 'Y' ? 'Economy (Y)' : c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>

      {/* infant on the lap: its own ticket, no seat — the adult must be 12+, the infant under 2 on the flight date */}
      {form.watch(name('infant')) ? (
        <div className='mt-4 rounded-lg border border-dashed p-3'>
          <div className='mb-3 flex items-center justify-between'>
            <p className='flex items-center gap-1.5 text-sm font-semibold'>
              <Baby className='size-4' />
              Нярай (INF, 2 хүртэлх насны)
            </p>
            <Button
              type='button'
              variant='ghost'
              size='sm'
              className='h-7 gap-1 text-xs'
              onClick={() => form.setValue(name('infant'), null)}
            >
              <X className='size-3.5' />
              Хасах
            </Button>
          </div>
          <div className='grid gap-4 sm:grid-cols-3'>
            <Field label='Овог *' error={infantError('last_name')}>
              <Input className='h-10 uppercase' {...form.register(`passengers.${index}.infant.last_name`)} />
            </Field>
            <Field label='Нэр *' error={infantError('first_name')}>
              <Input className='h-10 uppercase' {...form.register(`passengers.${index}.infant.first_name`)} />
            </Field>
            <Field label='Хүйс'>
              <Select
                value={form.watch(`passengers.${index}.infant.gender`)}
                onValueChange={(v) => form.setValue(`passengers.${index}.infant.gender`, v as 'M' | 'F')}
              >
                <SelectTrigger className='h-10 w-full'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='M'>Эрэгтэй (M)</SelectItem>
                  <SelectItem value='F'>Эмэгтэй (F)</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label='Төрсөн огноо *' error={infantError('date_of_birth')}>
              <Input className='h-10' type='date' {...form.register(`passengers.${index}.infant.date_of_birth`)} />
            </Field>
            <Field label='Паспортын дугаар *' error={infantError('document_number')}>
              <Input className='h-10 font-mono uppercase' {...form.register(`passengers.${index}.infant.document_number`)} />
            </Field>
            <Field label='Паспорт дуусах *' error={infantError('document_expires_at')}>
              <Input className='h-10' type='date' {...form.register(`passengers.${index}.infant.document_expires_at`)} />
            </Field>
          </div>
        </div>
      ) : (
        <Button
          type='button'
          variant='ghost'
          size='sm'
          className='mt-3 h-8 gap-1.5 text-xs'
          onClick={() => form.setValue(name('infant'), blankInfant())}
        >
          <Baby className='size-4' />
          Нярай нэмэх
        </Button>
      )}
    </section>
  )
}
