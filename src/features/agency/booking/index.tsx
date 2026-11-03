import { useMemo, useState } from 'react'
import { useFieldArray, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getRouteApi, Link } from '@tanstack/react-router'
import {
  agencyAccountPortalService,
  agencyBookingService,
  agencyHoldService,
  agencyPortalService,
  type AgencyBooking,
  type AgencyFare,
  type AgencyFlight,
} from '@/services'
import { ApiError } from '@/services/api/shared/client'
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  Loader2,
  Mail,
  Plane,
  Printer,
  Search,
  Ticket,
  Wallet,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Main } from '@/components/layout/main'
import { PageHeader } from '@/components/page-header'
import {
  blank,
  Field,
  type Form,
  PassengerCard,
  schema,
} from '@/features/agency/quotas/components/booking-dialog'
import {
  formatDateTime,
  formatMoney,
} from '@/features/agency/transactions/transactions-table'
import { fareSeatsLabel } from '../shared/fare-seats'
import { FlowSteps, StatusPill, StepCard } from '../shared/flow'

const route = getRouteApi('/_authenticated/agency/booking/')

const CABIN: Record<string, string> = { F: 'First', C: 'Business', W: 'Premium', Y: 'Economy' }
const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']

const STEPS = [
  { n: 2, title: 'Хайлт' },
  { n: 3, title: 'Нислэг' },
  { n: 4, title: 'Анги, тариф' },
  { n: 5, title: 'Зорчигч' },
  { n: 6, title: 'Үнэ шалгах' },
  { n: 7, title: 'PNR' },
  { n: 8, title: 'Тийз' },
  { n: 9, title: 'Баталгаа' },
]

const today = () => new Date().toISOString().slice(0, 10)
const shift = (date: string, days: number) => {
  const d = new Date(`${date}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}
const time = (local: string | null) => local?.slice(11, 16) ?? '--:--'
const farePrice = (f: AgencyFare | null | undefined) =>
  f?.price ? { fare: Number(f.price.fare), tax: Number(f.price.tax) } : null
const lowestFare = (flight: AgencyFlight, cabin: string, pax: number) =>
  flight.fares
    .filter((f) => f.cabin_class === cabin && f.price && (f.remaining === null || f.remaining >= pax))
    .sort((a, b) => Number(a.price!.fare) + Number(a.price!.tax) - Number(b.price!.fare) - Number(b.price!.tax))[0] ?? null

type Criteria = { from: string; to: string; date: string; pax: number; cabin: string }

/** Command line search: UBNICN25DEC (+ optional /2 for passengers) → criteria; null when it does not parse */
export function parseCommand(input: string): Partial<Criteria> | null {
  const m = input.trim().toUpperCase().match(/^([A-Z]{3})([A-Z]{3})(\d{1,2})([A-Z]{3})(?:\/(\d))?$/)
  if (!m) return null
  const month = MONTHS.indexOf(m[4])
  if (month < 0) return null
  const now = new Date()
  let year = now.getFullYear()
  const candidate = new Date(Date.UTC(year, month, Number(m[3])))
  if (candidate.getTime() < Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())) year += 1
  const date = new Date(Date.UTC(year, month, Number(m[3]))).toISOString().slice(0, 10)
  return { from: m[1], to: m[2], date, ...(m[5] ? { pax: Number(m[5]) } : {}) }
}

const RECENT_KEY = 'agency-recent-searches'
const readRecent = (): Criteria[] => {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]') as Criteria[]
  } catch {
    return []
  }
}
const saveRecent = (c: Criteria) => {
  try {
    const key = (x: Criteria) => `${x.from}${x.to}${x.date}${x.pax}${x.cabin}`
    const list = [c, ...readRecent().filter((r) => key(r) !== key(c))].slice(0, 5)
    localStorage.setItem(RECENT_KEY, JSON.stringify(list))
  } catch {
    // private window: recent searches are only a convenience
  }
}

/**
 * Agency portal: guided reservation — search, select a flight, booking class, passengers, price review,
 * PNR (held until the fare's time limit), ticketing from the agency account and the confirmation.
 */
export function AgencyBooking() {
  const search = route.useSearch()
  const queryClient = useQueryClient()
  const fromCommand = search.cmd ? parseCommand(search.cmd) : null

  // a command typed on the home page goes straight to the results
  const [step, setStep] = useState(fromCommand ? 3 : 2)
  const [criteria, setCriteria] = useState<Criteria>({
    from: '',
    to: '',
    date: today(),
    pax: 1,
    cabin: 'Y',
    ...fromCommand,
  })
  const [flight, setFlight] = useState<AgencyFlight | null>(null)
  const [cabin, setCabin] = useState('Y')
  const [fareId, setFareId] = useState<number | null>(null)
  const [booking, setBooking] = useState<{ id: number; pnr: string } | null>(null)
  const [noTimeLimit, setNoTimeLimit] = useState(false)

  const form = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: { passengers: [blank('Y')], contact_phone: '', contact_email: '' },
  })
  const rows = useFieldArray({ control: form.control, name: 'passengers' })

  const fare = flight?.fares.find((f) => f.id === fareId) ?? null
  const pax = rows.fields.length

  const reset = () => {
    setStep(2)
    setFlight(null)
    setFareId(null)
    setBooking(null)
    setNoTimeLimit(false)
    form.reset({ passengers: [blank('Y')], contact_phone: '', contact_email: '' })
  }

  const pickFlight = (f: AgencyFlight) => {
    const c = f.cabins.find((x) => x.cabin_class === criteria.cabin && x.remaining >= criteria.pax)
      ? criteria.cabin
      : (f.cabins.find((x) => x.remaining >= criteria.pax)?.cabin_class ?? criteria.cabin)
    setFlight(f)
    setCabin(c)
    setFareId(lowestFare(f, c, criteria.pax)?.id ?? null)
    setStep(4)
  }

  const confirmItinerary = () => {
    // one passenger card per traveller searched for, all in the chosen cabin
    const current = form.getValues('passengers')
    form.setValue(
      'passengers',
      Array.from({ length: criteria.pax }, (_, i) => ({ ...(current[i] ?? blank(cabin)), cabin_class: cabin }))
    )
    setStep(5)
  }

  const invalidate = () => {
    for (const key of ['agency-flights', 'agency-quotas', 'agency-accounts', 'agency-bookings']) {
      queryClient.invalidateQueries({ queryKey: [key] })
    }
  }

  const create = useMutation({
    mutationFn: (onHold: boolean) => {
      const v = form.getValues()
      return agencyPortalService.book(
        flight!.id,
        v.passengers.map((p) => ({ ...p, cabin_class: cabin })),
        { phone: v.contact_phone, email: v.contact_email },
        // a published fare is a fare id, not a bucket of the allocation
        fare?.published ? { allocation_fare_id: null, fare_id: fareId } : { allocation_fare_id: fareId },
        onHold
      )
    },
    onSuccess: (res, onHold) => {
      toast.success(res.message)
      setBooking({ id: res.body.id, pnr: res.body.pnr })
      invalidate()
      // without a time limit the tickets are issued with the PNR: straight to the confirmation
      setStep(onHold && res.body.status === 'on_hold' ? 7 : 9)
    },
    onError: (error: Error) => {
      if (error instanceof ApiError && error.code === 'no_time_limit') return setNoTimeLimit(true)
      toast.error(error.message)
    },
  })

  return (
    <Main className='flex flex-1 flex-col gap-4 sm:gap-6'>
      <PageHeader
        title='Шинэ захиалга'
        description='Алхам бүрээр хөтлөгдөнө: хайлт → сонголт → зорчигч → үнэ → PNR → тийз → баталгаажуулалт.'
        actions={
          step > 2 && (
            <Button size='sm' variant='outline' className='h-8' onClick={reset}>
              Шинээр эхлэх
            </Button>
          )
        }
      />

      <FlowSteps steps={STEPS} current={step} onPick={booking ? undefined : setStep} />

      {step <= 3 && (
        <SearchStep
          criteria={criteria}
          onChange={setCriteria}
          showResults={step === 3}
          onSearch={(c) => {
            setCriteria(c)
            saveRecent(c)
            setStep(3)
          }}
          onSelect={pickFlight}
        />
      )}

      {step === 4 && flight && (
        <ItineraryStep
          flight={flight}
          pax={criteria.pax}
          cabin={cabin}
          fareId={fareId}
          onCabin={(c) => {
            setCabin(c)
            setFareId(lowestFare(flight, c, criteria.pax)?.id ?? null)
          }}
          onFare={setFareId}
          onBack={() => setStep(3)}
          onNext={confirmItinerary}
        />
      )}

      {step === 5 && flight && (
        <StepCard
          n={5}
          title='Зорчигч нэмэх'
          subtitle='Паспортын дугаараар хайвал өмнө нь захиалсан зорчигчийн мэдээлэл автоматаар бөглөгдөнө.'
          hints={[
            'Профайлаас автоматаар бөглөх (паспортоор)',
            'Нэр, төрсөн огноо, паспорт, иргэншил шалгана',
            'Олон улсын нислэгт паспорт 6+ сар хүчинтэй байх',
            'Нялх хүүхэд том хүнтэй хамт зорчино',
          ]}
        >
          <form
            id='agency-wizard-pax'
            className='grid gap-4'
            onSubmit={form.handleSubmit(() => setStep(6))}
          >
            {rows.fields.map((row, i) => (
              <PassengerCard
                key={row.id}
                index={i}
                form={form}
                cabins={[cabin]}
                canRemove={rows.fields.length > 1}
                onRemove={() => rows.remove(i)}
              />
            ))}
            <Button
              type='button'
              variant='outline'
              className='border-dashed'
              disabled={pax >= seatsLeft(flight, cabin, fare)}
              onClick={() => rows.append(blank(cabin))}
            >
              + Зорчигч нэмэх
            </Button>
            <fieldset className='rounded-xl border p-4'>
              <legend className='px-1 text-sm font-semibold'>Холбоо барих</legend>
              <div className='grid gap-4 sm:grid-cols-2'>
                <Field label='Утас *' error={form.formState.errors.contact_phone?.message}>
                  <Input className='h-10' placeholder='+976 9911 2233' {...form.register('contact_phone')} />
                </Field>
                <Field label='И-мэйл' error={form.formState.errors.contact_email?.message}>
                  <Input className='h-10' type='email' placeholder='name@example.mn' {...form.register('contact_email')} />
                </Field>
              </div>
            </fieldset>
          </form>
          <NavRow onBack={() => setStep(4)}>
            <Button type='submit' form='agency-wizard-pax' className='gap-1.5'>
              Үнэ шалгах
              <ArrowRight className='size-4' />
            </Button>
          </NavRow>
        </StepCard>
      )}

      {step === 6 && flight && (
        <ReviewStep
          flight={flight}
          cabin={cabin}
          fare={fare}
          values={form.getValues()}
          noTimeLimit={noTimeLimit}
          pending={create.isPending}
          onBack={() => setStep(5)}
          onCreate={(onHold) => create.mutate(onHold)}
        />
      )}

      {step >= 7 && booking && (
        <AfterPnr
          step={step}
          bookingId={booking.id}
          onStep={setStep}
          onIssued={() => {
            invalidate()
            setStep(9)
          }}
          onNew={reset}
        />
      )}
    </Main>
  )
}

/** Seats the agent may still add: the cabin of the allocation and the fare bucket */
const seatsLeft = (flight: AgencyFlight, cabin: string, fare: AgencyFare | null) =>
  Math.min(
    flight.remaining,
    flight.cabins.find((c) => c.cabin_class === cabin)?.remaining ?? 0,
    // a sold-out booking class with waitlist books as HL
    fare?.waitlist ? Number.MAX_SAFE_INTEGER : (fare?.remaining ?? Number.MAX_SAFE_INTEGER)
  )

/** Published fare rules shown on the fare: advance purchase, stay, ticket time limit */
function FareRules({ rules }: { rules: NonNullable<AgencyFare['rules']> }) {
  const parts = [
    rules.advance_booking_days ? `${rules.advance_booking_days}+ хоногийн өмнө` : null,
    rules.min_stay_days || rules.max_stay_days
      ? `байх ${rules.min_stay_days ?? 0}–${rules.max_stay_days ?? '∞'} хоног`
      : null,
    rules.ticket_time_limit_hours ? `TL ${rules.ticket_time_limit_hours}ц` : null,
  ].filter(Boolean)
  if (!parts.length && !rules.rule) return null
  return (
    <span className='text-[10px] opacity-75' title={rules.rule ?? undefined}>
      {parts.join(' · ') || 'дүрэм'}
    </span>
  )
}

function NavRow({ onBack, children }: { onBack?: () => void; children: React.ReactNode }) {
  return (
    <div className='flex flex-wrap items-center justify-between gap-2 border-t pt-4'>
      {onBack ? (
        <Button type='button' variant='outline' className='gap-1.5' onClick={onBack}>
          <ArrowLeft className='size-4' />
          Буцах
        </Button>
      ) : (
        <span />
      )}
      <div className='flex flex-wrap gap-2'>{children}</div>
    </div>
  )
}

// ─── 2 · 3  Search and select ───

function SearchStep({
  criteria,
  onChange,
  showResults,
  onSearch,
  onSelect,
}: {
  criteria: Criteria
  onChange: (c: Criteria) => void
  showResults: boolean
  onSearch: (c: Criteria) => void
  onSelect: (f: AgencyFlight) => void
}) {
  const [mode, setMode] = useState<'form' | 'command' | 'recent'>('form')
  const [command, setCommand] = useState('')
  const [sort, setSort] = useState<'price' | 'time'>('time')
  // re-read after each search (it saves the criteria)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const recent = useMemo(() => readRecent(), [showResults])
  const set = (patch: Partial<Criteria>) => onChange({ ...criteria, ...patch })

  const runCommand = () => {
    const parsed = parseCommand(command)
    if (!parsed) return toast.error('Командыг ингэж бичнэ: UBNICN25DEC эсвэл UBNICN25DEC/2')
    onSearch({ ...criteria, ...parsed })
  }

  const query = useQuery({
    queryKey: ['agency-flights', criteria.date],
    queryFn: async () => (await agencyHoldService.flights(criteria.date)).body,
    enabled: showResults,
  })

  const flights = useMemo(() => {
    const [from, to] = [criteria.from.trim().toUpperCase(), criteria.to.trim().toUpperCase()]
    const list = (query.data ?? []).filter((f) => {
      const [o, d] = f.route.split('-')
      return (!from || o === from) && (!to || d === to)
    })
    const price = (f: AgencyFlight) => {
      const p = farePrice(lowestFare(f, criteria.cabin, criteria.pax))
      return p ? p.fare + p.tax : Number.MAX_SAFE_INTEGER
    }
    return list.sort((a, b) =>
      sort === 'price' ? price(a) - price(b) : (a.departure_local ?? '').localeCompare(b.departure_local ?? '')
    )
  }, [query.data, criteria, sort])

  return (
    <>
      <StepCard
        n={2}
        title='Нислэг хайх'
        subtitle='Хамгийн тохиромжтой нислэгийг секундэд олно.'
        hints={['Форм эсвэл команд (UBNICN25DEC) ашиглах', 'Чиглэл, анги, зорчигчийн тоогоор шүүх', 'Сүүлийн хайлтууд хадгалагдана']}
      >
        <div className='flex gap-1 border-b'>
          {(
            [
              ['form', 'Нислэг хайх'],
              ['command', 'Команд'],
              ['recent', 'Сүүлийн'],
            ] as const
          ).map(([k, label]) => (
            <button
              key={k}
              type='button'
              onClick={() => setMode(k)}
              className={cn(
                '-mb-px border-b-2 px-3 py-2 text-sm font-medium',
                mode === k ? 'border-primary text-primary' : 'text-muted-foreground border-transparent'
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {mode === 'form' && (
          <form
            className='grid gap-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_120px_150px_auto]'
            onSubmit={(e) => {
              e.preventDefault()
              onSearch(criteria)
            }}
          >
            <Field label='Хаанаас'>
              <Input
                className='h-10 font-mono uppercase'
                maxLength={3}
                placeholder='UBN'
                value={criteria.from}
                onChange={(e) => set({ from: e.target.value.toUpperCase() })}
              />
            </Field>
            <Field label='Хаашаа'>
              <Input
                className='h-10 font-mono uppercase'
                maxLength={3}
                placeholder='ICN'
                value={criteria.to}
                onChange={(e) => set({ to: e.target.value.toUpperCase() })}
              />
            </Field>
            <Field label='Огноо'>
              <Input className='h-10' type='date' value={criteria.date} onChange={(e) => e.target.value && set({ date: e.target.value })} />
            </Field>
            <Field label='Зорчигч'>
              <Input
                className='h-10'
                type='number'
                min={1}
                max={9}
                value={criteria.pax}
                onChange={(e) => set({ pax: Math.max(1, Math.min(9, Number(e.target.value) || 1)) })}
              />
            </Field>
            <Field label='Анги'>
              <select
                className='border-input bg-background h-10 rounded-md border px-3 text-sm'
                value={criteria.cabin}
                onChange={(e) => set({ cabin: e.target.value })}
              >
                {Object.entries(CABIN).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v} ({k})
                  </option>
                ))}
              </select>
            </Field>
            <Button type='submit' className='h-10 gap-1.5 self-end'>
              <Search className='size-4' />
              Хайх
            </Button>
          </form>
        )}

        {mode === 'command' && (
          <div className='grid gap-2'>
            <div className='flex gap-2'>
              <Input
                autoFocus
                className='h-11 font-mono text-base uppercase'
                placeholder='UBNICN25DEC/2'
                value={command}
                onChange={(e) => setCommand(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && runCommand()}
              />
              <Button className='h-11 gap-1.5' onClick={runCommand}>
                <Search className='size-4' />
                Хайх
              </Button>
            </div>
            <p className='text-muted-foreground text-xs'>
              <b className='font-mono'>UBN</b> хаанаас · <b className='font-mono'>ICN</b> хаашаа ·{' '}
              <b className='font-mono'>25DEC</b> огноо · <b className='font-mono'>/2</b> зорчигчийн тоо (заавал биш)
            </p>
          </div>
        )}

        {mode === 'recent' && (
          <div className='flex flex-wrap gap-2'>
            {recent.map((r) => (
              <Button
                key={`${r.from}${r.to}${r.date}${r.pax}${r.cabin}`}
                variant='outline'
                size='sm'
                className='gap-2 font-mono'
                onClick={() => onSearch({ ...r, date: r.date < today() ? today() : r.date })}
              >
                {r.from || '***'} → {r.to || '***'} · {r.date} · {r.pax} pax · {r.cabin}
              </Button>
            ))}
            {!recent.length && <p className='text-muted-foreground text-sm'>Сүүлийн хайлт алга.</p>}
          </div>
        )}
      </StepCard>

      {showResults && (
        <StepCard
          n={3}
          title='Нислэг сонгох'
          subtitle={
            <span className='font-mono'>
              {criteria.from || 'Бүх'} → {criteria.to || 'Бүх'} · {criteria.date} · {criteria.pax} зорчигч ·{' '}
              {CABIN[criteria.cabin]}
            </span>
          }
          actions={
            <div className='flex items-center gap-1.5'>
              <Button size='icon' variant='outline' className='size-8' aria-label='Өмнөх өдөр' onClick={() => set({ date: shift(criteria.date, -1) })}>
                <ChevronLeft className='size-4' />
              </Button>
              <Button size='icon' variant='outline' className='size-8' aria-label='Дараагийн өдөр' onClick={() => set({ date: shift(criteria.date, 1) })}>
                <ChevronRight className='size-4' />
              </Button>
              <select
                aria-label='Эрэмбэ'
                className='border-input bg-background h-8 rounded-md border px-2 text-xs'
                value={sort}
                onChange={(e) => setSort(e.target.value as 'price' | 'time')}
              >
                <option value='time'>Цагаар</option>
                <option value='price'>Үнэ (бага → их)</option>
              </select>
            </div>
          }
          hints={['Нислэг, хугацаа, үлдсэн суудал, хамгийн бага үнэ', 'Сонгосон ангид хангалттай суудал байгаа эсэхийг шалгана']}
        >
          <div className='divide-y rounded-xl border'>
            {flights.map((f) => {
              const fare = lowestFare(f, criteria.cabin, criteria.pax)
              const p = farePrice(fare)
              const cabinLeft = f.cabins.find((c) => c.cabin_class === criteria.cabin)?.remaining ?? 0
              const blocked = !f.is_open_for_names || Math.min(cabinLeft, f.remaining) < criteria.pax
              return (
                <div key={f.id} className={cn('flex flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3', blocked && 'opacity-55')}>
                  <div className='flex w-28 items-center gap-2'>
                    <span className='bg-primary/10 text-primary flex size-8 items-center justify-center rounded-lg'>
                      <Plane className='size-4' />
                    </span>
                    <span>
                      <span className='block font-mono text-sm font-semibold'>{f.flight_number}</span>
                      <span className='text-muted-foreground block truncate text-[11px]'>{f.airline}</span>
                    </span>
                  </div>
                  <div className='min-w-36'>
                    <p className='font-mono text-base font-semibold'>
                      {time(f.departure_local)} – {time(f.arrival_local)}
                    </p>
                    <p className='text-muted-foreground font-mono text-xs'>{f.route.replace('-', ' → ')}</p>
                  </div>
                  <div className='text-xs'>
                    <p className='font-medium text-emerald-700 dark:text-emerald-400'>Шууд</p>
                    <p className='text-muted-foreground'>
                      {cabinLeft} суудал · {f.cabins.map((c) => c.cabin_class).join('/')}
                    </p>
                  </div>
                  <div className='text-muted-foreground hidden text-xs md:block'>
                    <Clock className='me-1 inline size-3' />
                    Нэр: {formatDateTime(f.names_deadline_at)}
                  </div>
                  <div className='ms-auto flex items-center gap-4'>
                    <span className='text-end'>
                      <span className='block font-mono text-lg font-semibold'>{p ? formatMoney(p.fare + p.tax) : '—'}</span>
                      <span className='text-muted-foreground block text-[11px]'>
                        {fare?.fare_class ? `${fare.fare_class} анги · ` : ''}1 зорчигч
                      </span>
                    </span>
                    <Button className='h-9 px-5' disabled={blocked} onClick={() => onSelect(f)}>
                      Сонгох
                    </Button>
                  </div>
                </div>
              )
            })}
            {!flights.length && (
              <div className='text-muted-foreground flex flex-col items-center gap-2 px-4 py-14 text-center text-sm'>
                {query.isLoading ? (
                  <Loader2 className='size-5 animate-spin' />
                ) : (
                  <>
                    <Plane className='size-6' />
                    Энэ өдөр тохирох нислэг алга — огноо, чиглэлээ өөрчилж үзнэ үү.
                  </>
                )}
              </div>
            )}
          </div>
        </StepCard>
      )}
    </>
  )
}

// ─── 4  Itinerary: cabin and booking class ───

function ItineraryStep({
  flight,
  pax,
  cabin,
  fareId,
  onCabin,
  onFare,
  onBack,
  onNext,
}: {
  flight: AgencyFlight
  pax: number
  cabin: string
  fareId: number | null
  onCabin: (c: string) => void
  onFare: (id: number) => void
  onBack: () => void
  onNext: () => void
}) {
  // published fares: grouped by fare family (its rank), cheapest first inside a family
  const fares = flight.fares
    .filter((f) => f.cabin_class === cabin)
    .sort((a, b) => (a.fare_family?.rank ?? 0) - (b.fare_family?.rank ?? 0))
  const fare = fares.find((f) => f.id === fareId) ?? null
  const needsFare = flight.uses_fare_quotas || flight.uses_published_fares || flight.fares.length > 0
  const enough = seatsLeft(flight, cabin, fare) >= pax
  const p = farePrice(fare)

  return (
    <div className='grid gap-4 lg:grid-cols-[1fr_320px]'>
      <StepCard
        n={4}
        title='Маршрут бүрдүүлэх'
        subtitle='Нислэг, анги, тарифаа баталгаажуулна.'
        hints={['Нислэг, анги, тарифын төрлийг баталгаажуулах', 'Систем суудлын үлдэгдлийг дахин шалгана']}
      >
        <div className='flex flex-wrap items-center gap-4 rounded-xl border p-3'>
          <span className='bg-primary/10 text-primary flex size-9 items-center justify-center rounded-lg'>
            <Plane className='size-4' />
          </span>
          <span className='font-mono font-semibold'>{flight.flight_number}</span>
          <span className='font-mono'>{flight.route.replace('-', ' → ')}</span>
          <span className='text-muted-foreground font-mono text-sm'>
            {flight.departure_local?.slice(0, 10)} · {time(flight.departure_local)} – {time(flight.arrival_local)}
          </span>
          {flight.return_flight && <span className='text-muted-foreground text-xs'>Буцах: {flight.return_flight}</span>}
        </div>

        <div className='grid gap-2'>
          <Label>Үйлчилгээний анги</Label>
          <div className='flex flex-wrap gap-2'>
            {flight.cabins.map((c) => (
              <Button
                key={c.cabin_class}
                type='button'
                variant={cabin === c.cabin_class ? 'default' : 'outline'}
                disabled={c.remaining < pax}
                onClick={() => onCabin(c.cabin_class)}
                className='h-10'
              >
                {CABIN[c.cabin_class] ?? c.cabin_class} ({c.cabin_class}) · {c.remaining} суудал
              </Button>
            ))}
          </div>
        </div>

        {needsFare && (
          <div className='grid gap-2'>
            <Label>Захиалгын анги (тариф)</Label>
            <div className='flex flex-wrap gap-2'>
              {fares.map((f) => {
                const fp = farePrice(f)
                const out = !f.waitlist && f.remaining !== null && f.remaining < pax
                return (
                  <button
                    key={f.id}
                    type='button'
                    disabled={out}
                    aria-pressed={f.id === fareId}
                    onClick={() => onFare(f.id)}
                    className='aria-pressed:border-primary aria-pressed:bg-primary aria-pressed:text-primary-foreground hover:bg-muted/50 flex min-w-24 flex-col items-center rounded-xl border px-4 py-2 disabled:opacity-40'
                  >
                    {f.fare_family && (
                      <span className='text-[10px] font-semibold tracking-wide uppercase opacity-80'>{f.fare_family.name}</span>
                    )}
                    <span className='font-mono text-lg font-bold'>{f.fare_class ?? '—'}</span>
                    <span className='font-mono text-xs'>{fp ? formatMoney(fp.fare + fp.tax) : '—'}</span>
                    <span className='text-[10px] opacity-75'>
                      {fareSeatsLabel(flight, f)}
                    </span>
                    {f.rules && <FareRules rules={f.rules} />}
                  </button>
                )
              })}
              {!fares.length && <p className='text-muted-foreground text-sm'>Энэ ангид тариф алга.</p>}
            </div>
          </div>
        )}

        <NavRow onBack={onBack}>
          {!enough && <span className='text-destructive self-center text-xs'>{pax} зорчигчид суудал хүрэлцэхгүй</span>}
          <Button className='gap-1.5' disabled={!enough || (needsFare && !fare)} onClick={onNext}>
            Маршрутад нэмэх
            <ArrowRight className='size-4' />
          </Button>
        </NavRow>
      </StepCard>

      <aside className='fm-panel flex h-fit flex-col gap-3 p-4'>
        <p className='text-sm font-semibold'>Маршрутын хураангуй</p>
        <div className='rounded-xl border p-3 text-sm'>
          <p className='font-mono font-semibold'>1. {flight.route.replace('-', ' → ')}</p>
          <p className='text-muted-foreground font-mono text-xs'>
            {flight.flight_number} · {flight.departure_local?.slice(0, 16)}
          </p>
          <p className='mt-1 text-xs'>
            {CABIN[cabin]} ({fare?.fare_class ?? cabin})
          </p>
        </div>
        <dl className='grid grid-cols-2 gap-y-1 text-sm'>
          <dt className='text-muted-foreground'>Зорчигч</dt>
          <dd className='text-end'>{pax}</dd>
          <dt className='text-muted-foreground'>1 хүний үнэ</dt>
          <dd className='text-end font-mono'>{p ? formatMoney(p.fare + p.tax) : '—'}</dd>
          <dt className='font-semibold'>Нийт</dt>
          <dd className='text-end font-mono font-semibold'>{p ? formatMoney((p.fare + p.tax) * pax) : '—'}</dd>
        </dl>
        <p className='text-muted-foreground text-xs'>Нэр оруулах хугацаа: {formatDateTime(flight.names_deadline_at)}</p>
      </aside>
    </div>
  )
}

// ─── 6  Price & review ───

function ReviewStep({
  flight,
  cabin,
  fare,
  values,
  noTimeLimit,
  pending,
  onBack,
  onCreate,
}: {
  flight: AgencyFlight
  cabin: string
  fare: AgencyFare | null
  values: Form
  noTimeLimit: boolean
  pending: boolean
  onBack: () => void
  onCreate: (onHold: boolean) => void
}) {
  const accounts = useQuery({
    queryKey: ['agency-accounts'],
    queryFn: async () => (await agencyAccountPortalService.accounts()).body,
  })
  const account = accounts.data?.find((a) => a.airline?.name === flight.airline) ?? null
  const p = farePrice(fare)
  const pax = values.passengers.length
  const total = p ? (p.fare + p.tax) * pax : null
  const short = account && total !== null && Number(account.balance) < total

  return (
    <StepCard
      n={6}
      title='Үнэ шалгах'
      subtitle='Үргэлжлүүлэхээс өмнө тарифын бүрэн задаргааг шалгана уу.'
      hints={['Тариф, татвар, нийт дүнг харах', 'Тарифын нөхцөл, ачааг шалгах', 'Тийз бичих үед данснаас хасагдана']}
    >
      <div className='grid gap-4 lg:grid-cols-[1fr_340px]'>
        <div className='grid gap-3'>
          <div className='rounded-xl border p-4'>
            <p className='mb-3 text-sm font-semibold'>Тарифын хураангуй</p>
            <dl className='grid grid-cols-[1fr_auto] gap-y-1.5 text-sm'>
              <dt className='text-muted-foreground'>
                Үндсэн тариф {p && `(${formatMoney(p.fare)} × ${pax})`}
              </dt>
              <dd className='font-mono'>{p ? formatMoney(p.fare * pax) : '—'}</dd>
              <dt className='text-muted-foreground'>Татвар, хураамж {p && `(${formatMoney(p.tax)} × ${pax})`}</dt>
              <dd className='font-mono'>{p ? formatMoney(p.tax * pax) : '—'}</dd>
              <dt className='border-t pt-2 text-base font-semibold'>Нийт</dt>
              <dd className='border-t pt-2 font-mono text-xl font-bold'>{total !== null ? formatMoney(total, account?.currency) : '—'}</dd>
            </dl>
            {!p && (
              <p className='text-muted-foreground mt-2 text-xs'>
                Энэ квотод тариф тохируулаагүй — үнийг airline-ий тарифаар PNR үүсгэхэд тооцно.
              </p>
            )}
          </div>

          <Rule title='Тарифын нөхцөл'>
            {CABIN[cabin]} ангийн <b>{fare?.fare_class ?? cabin}</b> тариф. Hold хийсэн PNR-ийн тийзийг тарифын TL (ticket
            time limit) дуусахаас өмнө бичнэ, эс бөгөөс захиалга автоматаар цуцлагдана.
          </Rule>
          <Rule title='Цуцлалт / өөрчлөлт'>
            Нэр оруулах хугацаа ({formatDateTime(flight.names_deadline_at)}) дуусахаас өмнө зорчигчийг цуцлах боломжтой — тийзийн
            үнэ дансанд буцаж орно. Түүнээс хойш airline-тай холбогдоно.
          </Rule>
          <Rule title='Ачаа'>Ачааны эрх нь нислэгийн ачааны дүрмээр тогтоогдоно (e-ticket дээр харагдана).</Rule>
        </div>

        <div className='grid h-fit gap-3'>
          <div className='rounded-xl border p-4 text-sm'>
            <p className='mb-2 font-semibold'>Зорчигчид ({pax})</p>
            <ul className='grid gap-1'>
              {values.passengers.map((x, i) => (
                <li key={i} className='flex justify-between gap-2'>
                  <span className='font-medium uppercase'>
                    {x.last_name}/{x.first_name}
                  </span>
                  <span className='text-muted-foreground font-mono text-xs'>{x.document_number.toUpperCase()}</span>
                </li>
              ))}
            </ul>
            <p className='text-muted-foreground mt-2 text-xs'>
              {values.contact_phone} {values.contact_email && `· ${values.contact_email}`}
            </p>
          </div>
          {account && (
            <div className={cn('flex items-center gap-3 rounded-xl border p-3 text-sm', short && 'border-red-500/40 bg-red-500/5')}>
              <Wallet className='text-muted-foreground size-5' />
              <span>
                <span className='text-muted-foreground block text-xs'>{account.airline?.iata_code} дансны үлдэгдэл</span>
                <b className='font-mono'>{formatMoney(account.balance, account.currency)}</b>
                {short && <span className='block text-xs text-red-600'>Тийз бичихэд үлдэгдэл хүрэлцэхгүй</span>}
              </span>
            </div>
          )}
        </div>
      </div>

      {noTimeLimit && (
        <div className='rounded-xl border border-amber-500/40 bg-amber-500/5 p-4 text-sm'>
          <p className='font-medium'>Энэ тарифт тийз бичих хугацаа (TL) байхгүй тул PNR-ийг hold хийх боломжгүй.</p>
          <p className='text-muted-foreground text-xs'>
            PNR-ийг тийзтэй нь шууд үүсгэнэ — {total !== null ? formatMoney(total, account?.currency) : 'тийзийн үнэ'} данснаас
            хасагдана.
          </p>
        </div>
      )}

      <NavRow onBack={onBack}>
        {noTimeLimit ? (
          <Button className='gap-1.5' disabled={pending} onClick={() => onCreate(false)}>
            {pending ? <Loader2 className='size-4 animate-spin' /> : <Ticket className='size-4' />}
            PNR үүсгээд тийз бичих
          </Button>
        ) : (
          <Button className='gap-1.5' disabled={pending} onClick={() => onCreate(true)}>
            {pending ? <Loader2 className='size-4 animate-spin' /> : <ArrowRight className='size-4' />}
            Үргэлжлүүлэх — PNR үүсгэх
          </Button>
        )}
      </NavRow>
    </StepCard>
  )
}

function Rule({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <details className='group rounded-xl border px-4 py-2.5 text-sm'>
      <summary className='flex cursor-pointer list-none items-center justify-between font-medium'>
        {title}
        <ChevronDown className='size-4 transition-transform group-open:rotate-180' />
      </summary>
      <p className='text-muted-foreground mt-2 text-xs leading-relaxed'>{children}</p>
    </details>
  )
}

// ─── 7 · 8 · 9  PNR, ticketing, confirmation ───

function AfterPnr({
  step,
  bookingId,
  onStep,
  onIssued,
  onNew,
}: {
  step: number
  bookingId: number
  onStep: (n: number) => void
  onIssued: () => void
  onNew: () => void
}) {
  const query = useQuery({
    queryKey: ['agency-bookings', 'show', bookingId],
    queryFn: async () => (await agencyBookingService.show(bookingId)).body,
  })
  const b = query.data
  if (!b) {
    return (
      <div className='fm-panel text-muted-foreground flex justify-center py-16'>
        <Loader2 className='size-5 animate-spin' />
      </div>
    )
  }
  if (step === 7) return <PnrStep booking={b} onTicket={() => onStep(8)} />
  if (step === 8) return <TicketStep booking={b} onBack={() => onStep(7)} onIssued={onIssued} />
  return <ConfirmStep booking={b} onNew={onNew} />
}

const bookingTotal = (b: AgencyBooking) =>
  b.passengers.flatMap((p) => p.segments).reduce((sum, s) => sum + Number(s.total_amount ?? 0), 0)
const currencyOf = (b: AgencyBooking) => b.passengers[0]?.segments[0]?.currency ?? ''

function PnrStep({ booking: b, onTicket }: { booking: AgencyBooking; onTicket: () => void }) {
  return (
    <StepCard
      n={7}
      title='PNR үүслээ'
      subtitle='Захиалга хадгалагдлаа — одоо тийзээ бичих эсвэл дараа үргэлжлүүлж болно.'
      hints={['Систем PNR-ийг автоматаар үүсгэнэ', 'TL хүртэл суудал хадгалагдана, мөнгө хасагдахгүй', '“Захиалга удирдах”-аас дахин нээх боломжтой']}
    >
      <div className='flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/5 px-4 py-2.5 text-sm font-medium text-emerald-700 dark:text-emerald-400'>
        <CheckCircle2 className='size-4' />
        PNR амжилттай үүслээ
      </div>
      <div className='flex flex-wrap items-end gap-x-10 gap-y-3'>
        <div>
          <p className='text-muted-foreground text-xs'>PNR</p>
          <p className='text-brand font-mono text-3xl font-bold tracking-wider'>{b.pnr}</p>
        </div>
        <div>
          <p className='text-muted-foreground mb-1 text-xs'>Төлөв</p>
          <StatusPill status={b.status} />
        </div>
        {b.ticketing_deadline_at && (
          <div>
            <p className='text-muted-foreground text-xs'>Тийз бичих хугацаа (TL)</p>
            <p className='font-mono font-semibold text-amber-700 dark:text-amber-400'>{formatDateTime(b.ticketing_deadline_at)}</p>
          </div>
        )}
        <div>
          <p className='text-muted-foreground text-xs'>Дүн</p>
          <p className='font-mono font-semibold'>{formatMoney(bookingTotal(b), currencyOf(b))}</p>
        </div>
      </div>
      <NavRow>
        <Button asChild variant='outline'>
          <Link to='/agency/bookings' search={{ q: b.pnr }}>
            Дараа хадгалах — PNR харах
          </Link>
        </Button>
        <Button className='gap-1.5' onClick={onTicket}>
          <Ticket className='size-4' />
          Тийз бичих
        </Button>
      </NavRow>
    </StepCard>
  )
}

function TicketStep({ booking: b, onBack, onIssued }: { booking: AgencyBooking; onBack: () => void; onIssued: () => void }) {
  const [phase, setPhase] = useState<'payment' | 'verify'>('payment')
  const accounts = useQuery({
    queryKey: ['agency-accounts'],
    queryFn: async () => (await agencyAccountPortalService.accounts()).body,
  })
  const total = bookingTotal(b)
  const currency = currencyOf(b)
  const account = accounts.data?.find((a) => a.currency === currency) ?? accounts.data?.[0] ?? null
  const short = account ? Number(account.balance) < total : false

  const issue = useMutation({
    mutationFn: () => agencyPortalService.issue(b.id),
    onSuccess: (res) => {
      toast.success(res.message)
      onIssued()
    },
    onError: (error: Error) => toast.error(error.message),
  })

  const sub = ['Төлбөр', 'Шалгах', 'Тийз бичих', 'Баталгаа']
  const at = phase === 'payment' ? 0 : 1

  return (
    <StepCard
      n={8}
      title='Тийз бичих'
      subtitle='Төлбөрөө баталгаажуулж, e-ticket гаргана.'
      hints={['Төлбөрийн хэлбэр, дүнг баталгаажуулах', 'Систем тийз бичих дүрэм, эрхийг шалгана', 'Тийз бичигдэж e-ticket дугаар олгоно']}
    >
      <ol className='flex flex-wrap items-center gap-2 text-xs'>
        {sub.map((s, i) => (
          <li key={s} className='flex items-center gap-2'>
            <span
              className={cn(
                'flex size-6 items-center justify-center rounded-full border font-semibold',
                i <= at ? 'border-primary bg-primary text-primary-foreground' : 'text-muted-foreground'
              )}
            >
              {i + 1}
            </span>
            <span className={i <= at ? 'font-medium' : 'text-muted-foreground'}>{s}</span>
            {i < sub.length - 1 && <span className='bg-border h-px w-6' />}
          </li>
        ))}
      </ol>

      {phase === 'payment' ? (
        <div className='grid gap-4 md:grid-cols-2'>
          <div className='grid gap-2'>
            <Label>Төлбөрийн хэлбэр</Label>
            <label className='border-primary bg-primary/5 flex items-center gap-3 rounded-xl border p-3 text-sm'>
              <input type='radio' checked readOnly className='accent-primary' />
              <Wallet className='size-4' />
              <span className='flex-1'>Агентын данс</span>
              {account && <b className='font-mono'>{formatMoney(account.balance, account.currency)}</b>}
            </label>
            {['Карт', 'Бусад'].map((m) => (
              <label key={m} className='text-muted-foreground flex items-center gap-3 rounded-xl border p-3 text-sm opacity-60'>
                <input type='radio' disabled />
                {m} <span className='ms-auto text-xs'>удахгүй</span>
              </label>
            ))}
          </div>
          <div className='grid h-fit gap-2 rounded-xl border p-4 text-sm'>
            <p className='font-semibold'>Төлбөрийн мэдээлэл</p>
            <div className='flex justify-between'>
              <span className='text-muted-foreground'>PNR</span>
              <b className='font-mono'>{b.pnr}</b>
            </div>
            <div className='flex justify-between'>
              <span className='text-muted-foreground'>Зорчигч</span>
              <span>{b.passengers.length}</span>
            </div>
            <div className='flex justify-between border-t pt-2'>
              <span className='font-semibold'>Дүн</span>
              <b className='font-mono text-lg'>{formatMoney(total, currency)}</b>
            </div>
            {short && <p className='text-xs text-red-600'>Дансны үлдэгдэл хүрэлцэхгүй байна — airline-аар цэнэглүүлнэ үү.</p>}
          </div>
        </div>
      ) : (
        <div className='grid gap-2 rounded-xl border p-4 text-sm'>
          <p className='font-semibold'>Шалгах</p>
          {b.passengers.map((p) => (
            <div key={p.id} className='flex flex-wrap justify-between gap-2'>
              <span className='font-medium'>{p.name}</span>
              <span className='text-muted-foreground font-mono text-xs'>
                {p.segments.map((s) => `${s.flight_number} ${s.route} ${s.cabin_class}/${s.fare_class ?? '-'}`).join(' · ')}
              </span>
              <span className='font-mono'>
                {formatMoney(
                  p.segments.reduce((sum, s) => sum + Number(s.total_amount ?? 0), 0),
                  currency
                )}
              </span>
            </div>
          ))}
          <p className='text-muted-foreground border-t pt-2 text-xs'>
            “Тийз бичих” дарахад {formatMoney(total, currency)} агентын данснаас хасагдаж, e-ticket дугаар олгоно.
          </p>
        </div>
      )}

      <NavRow onBack={phase === 'payment' ? onBack : () => setPhase('payment')}>
        {phase === 'payment' ? (
          <Button className='gap-1.5' disabled={short} onClick={() => setPhase('verify')}>
            Шалгах руу
            <ArrowRight className='size-4' />
          </Button>
        ) : (
          <Button className='gap-1.5' disabled={issue.isPending} onClick={() => issue.mutate()}>
            {issue.isPending ? <Loader2 className='size-4 animate-spin' /> : <Ticket className='size-4' />}
            Тийз бичих
          </Button>
        )}
      </NavRow>
    </StepCard>
  )
}

/** E-ticket actions of one passenger (also used on the manage page) */
export function useEticket() {
  const email = useMutation({
    mutationFn: (passengerId: number) => agencyBookingService.emailEticket(passengerId),
    onSuccess: (res) => toast.success(res.message),
    onError: (error: Error) => toast.error(error.message),
  })
  const download = async (passengerId: number, name: string) => {
    try {
      await agencyBookingService.downloadEticket(passengerId, `eticket-${name.replace('/', '-')}.pdf`)
    } catch (e) {
      toast.error((e as Error).message)
    }
  }
  return { email, download }
}

function ConfirmStep({ booking: b, onNew }: { booking: AgencyBooking; onNew: () => void }) {
  const { email, download } = useEticket()
  const seg = b.passengers[0]?.segments[0]
  const issued = b.status === 'confirmed'

  return (
    <div className='grid gap-4 lg:grid-cols-[1fr_340px]'>
      <StepCard
        n={9}
        title='Баталгаажуулалт'
        subtitle='Захиалга дууслаа — хэрэглэгчдээ мэдэгдээрэй.'
        hints={['Маршрут, тийзийн мэдээллийг харах', 'E-ticket-ийг и-мэйлээр илгээх', 'PDF хэлбэрээр хэвлэх, хадгалах']}
      >
        <div className='flex items-center gap-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4'>
          <span className='flex size-12 items-center justify-center rounded-full bg-emerald-600 text-white'>
            <CheckCircle2 className='size-7' />
          </span>
          <div>
            <p className='text-lg font-semibold text-emerald-700 dark:text-emerald-400'>
              {issued ? 'Тийз амжилттай бичигдлээ!' : 'Захиалга үүслээ'}
            </p>
            <p className='text-sm'>
              PNR <b className='text-brand font-mono'>{b.pnr}</b> · <StatusPill status={b.status} />
            </p>
          </div>
        </div>

        {seg && (
          <div className='flex flex-wrap items-center gap-x-6 gap-y-1 rounded-xl border px-4 py-3 font-mono text-sm'>
            <b>{seg.route.replace('-', ' → ')}</b>
            <span>{seg.flight_number}</span>
            <span>{seg.departure_local?.slice(0, 10)}</span>
            <span>
              {time(seg.departure_local)} – {time(seg.arrival_local)}
            </span>
            <span className='text-muted-foreground'>
              {CABIN[seg.cabin_class]} / {seg.fare_class ?? seg.cabin_class}
            </span>
          </div>
        )}

        <div className='divide-y rounded-xl border'>
          {b.passengers.map((p) => (
            <div key={p.id} className='flex flex-wrap items-center gap-3 px-4 py-2.5 text-sm'>
              <span className='min-w-40 font-medium'>{p.name}</span>
              <span className='text-muted-foreground font-mono text-xs'>
                Тийз: {p.segments.map((s) => s.ticket_number ?? '—').join(', ')}
              </span>
              <div className='ms-auto flex gap-1.5'>
                <Button size='sm' variant='outline' className='h-7 gap-1 text-xs' disabled={!issued} onClick={() => download(p.id, p.name)}>
                  <Download className='size-3.5' />
                  PDF
                </Button>
                <Button
                  size='sm'
                  className='h-7 gap-1 text-xs'
                  disabled={!issued || email.isPending || !(p.email || b.contact_email)}
                  title={p.email || b.contact_email ? undefined : 'И-мэйл хаяг алга'}
                  onClick={() => email.mutate(p.id)}
                >
                  <Mail className='size-3.5' />
                  E-ticket илгээх
                </Button>
              </div>
            </div>
          ))}
        </div>
        <NavRow>
          <Button variant='ghost' className='gap-1.5' onClick={() => window.print()}>
            <Printer className='size-4' />
            Хэвлэх
          </Button>
        </NavRow>
      </StepCard>

      <StepCard n={12} title='Процесс дууслаа' subtitle='Захиалга бэлэн боллоо. Дараа нь юу хийх вэ?'>
        <div className='flex flex-col items-center gap-2 py-2 text-center'>
          <Plane className='text-primary size-10' />
          <p className='font-semibold'>Захиалга дууслаа</p>
          <p className='text-muted-foreground font-mono text-xs'>
            PNR: {b.pnr}
            {b.passengers[0]?.segments[0]?.ticket_number && ` · ${b.passengers[0].segments[0].ticket_number}`}
          </p>
        </div>
        <Button className='w-full' onClick={onNew}>
          Шинэ захиалга
        </Button>
        <Button asChild variant='outline' className='w-full'>
          <Link to='/agency/bookings' search={{ q: b.pnr }}>
            Миний захиалгууд
          </Link>
        </Button>
        <Button asChild variant='ghost' className='w-full'>
          <Link to='/agency'>Нүүр рүү буцах</Link>
        </Button>
      </StepCard>
    </div>
  )
}
