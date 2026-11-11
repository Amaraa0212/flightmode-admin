import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getRouteApi, Link } from '@tanstack/react-router'
import {
  agencyBookingService,
  agencyPortalService,
  type AgencyBooking,
  type AgencyBookingPax,
} from '@/services'
import { Download, Loader2, Mail, PlaneTakeoff, Search, Ticket, XCircle } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { Main } from '@/components/layout/main'
import { PageHeader } from '@/components/page-header'
import { useEticket } from '@/features/agency/booking'
import {
  formatDateTime,
  formatMoney,
} from '@/features/agency/transactions/transactions-table'
import { StatusPill, StepCard } from '../shared/flow'

const route = getRouteApi('/_authenticated/agency/bookings/')

/** Agency portal: find a booking by PNR, name, passport or ticket; issue, send e-tickets, cancel passengers */
export function AgencyManageBookings() {
  const search = route.useSearch()
  const navigate = route.useNavigate()
  const q = search.q ?? ''
  const [text, setText] = useState(q)
  const [selectedId, setSelectedId] = useState<number | null>(null)

  const list = useQuery({
    queryKey: ['agency-bookings', q],
    queryFn: async () => (await agencyBookingService.list(q, 30)).body,
  })
  const rows = list.data ?? []
  const selected = rows.find((b) => b.id === selectedId) ?? (q ? rows[0] : undefined)

  return (
    <Main className='flex flex-1 flex-col gap-4 sm:gap-6'>
      <PageHeader
        title='Захиалга удирдах'
        description='PNR, зорчигчийн нэр, паспорт эсвэл тийзийн дугаараар хайж, захиалгаа хүссэн үедээ харах, өөрчлөх.'
        actions={
          <Button asChild size='sm' className='h-8 gap-2'>
            <Link to='/agency/booking'>
              <PlaneTakeoff className='size-4' />
              Шинэ захиалга
            </Link>
          </Button>
        }
      />

      <form
        className='fm-panel flex gap-2 p-3'
        onSubmit={(e) => {
          e.preventDefault()
          setSelectedId(null)
          navigate({ search: text.trim() ? { q: text.trim() } : {} })
        }}
      >
        <div className='relative flex-1'>
          <Search className='text-muted-foreground absolute start-3 top-1/2 size-4 -translate-y-1/2' />
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder='7F3K9L, BAT, E1234567 эсвэл тийзийн дугаар'
            className='h-10 ps-9 font-mono'
          />
        </div>
        <Button type='submit' className='h-10 px-6'>
          Хайх
        </Button>
      </form>

      <div className='grid gap-4 lg:grid-cols-[360px_1fr]'>
        <div className='fm-panel h-fit overflow-hidden'>
          <p className='border-b px-4 py-2.5 text-sm font-semibold'>
            {q ? `“${q}” — ${rows.length} захиалга` : 'Сүүлийн захиалгууд'}
          </p>
          <div className='max-h-[65vh] divide-y overflow-y-auto'>
            {rows.map((b) => (
              <button
                key={b.id}
                type='button'
                onClick={() => setSelectedId(b.id)}
                className={cn(
                  'hover:bg-muted/40 flex w-full flex-col gap-1 px-4 py-2.5 text-start',
                  selected?.id === b.id && 'bg-primary/5 border-s-primary border-s-2'
                )}
              >
                <span className='flex items-center justify-between gap-2'>
                  <b className='text-brand font-mono'>{b.pnr}</b>
                  <StatusPill status={b.status} />
                </span>
                <span className='truncate text-sm'>
                  {b.passengers.map((p) => p.name).join(', ') || '—'}
                </span>
                <span className='text-muted-foreground font-mono text-xs'>
                  {b.passengers[0]?.segments
                    .map((s) => `${s.flight_number} ${s.route} ${s.departure_local?.slice(0, 10) ?? ''}`)
                    .join(' · ')}
                </span>
              </button>
            ))}
            {!rows.length && (
              <p className='text-muted-foreground p-8 text-center text-sm'>
                {list.isLoading ? 'Хайж байна…' : 'Захиалга олдсонгүй.'}
              </p>
            )}
          </div>
        </div>

        {selected ? (
          <BookingDetail key={selected.id} booking={selected} />
        ) : (
          <div className='fm-panel text-muted-foreground flex items-center justify-center p-16 text-sm'>
            Захиалга сонгоно уу
          </div>
        )}
      </div>
    </Main>
  )
}

function BookingDetail({ booking: b }: { booking: AgencyBooking }) {
  const queryClient = useQueryClient()
  const { email, download, optionsBar } = useEticket()
  const [cancelling, setCancelling] = useState<AgencyBookingPax | null>(null)
  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['agency-bookings'] })
    queryClient.invalidateQueries({ queryKey: ['agency-accounts'] })
    queryClient.invalidateQueries({ queryKey: ['agency-quotas'] })
    queryClient.invalidateQueries({ queryKey: ['agency-flights'] })
  }

  const issue = useMutation({
    mutationFn: () => agencyPortalService.issue(b.id),
    onSuccess: (res) => {
      toast.success(res.message)
      refresh()
    },
    onError: (error: Error) => toast.error(error.message),
  })
  const cancel = useMutation({
    mutationFn: (id: number) => agencyBookingService.cancelPassenger(id),
    onSuccess: (res) => {
      toast.success(res.message)
      setCancelling(null)
      refresh()
    },
    onError: (error: Error) => toast.error(error.message),
  })

  const currency = b.passengers[0]?.segments[0]?.currency ?? ''
  const total = b.passengers.flatMap((p) => p.segments).reduce((sum, s) => sum + Number(s.total_amount ?? 0), 0)
  const issued = b.status === 'confirmed'

  return (
    <StepCard
      n={10}
      title={`PNR ${b.pnr}`}
      subtitle={`Үүсгэсэн: ${formatDateTime(b.created_at)}${b.created_by ? ` · ${b.created_by}` : ''}`}
      actions={<StatusPill status={b.status} />}
      hints={[
        'Hold захиалгын тийзийг TL-ээс өмнө бичнэ',
        'Зорчигч цуцлахад тийзийн үнэ дансанд буцна',
        'E-ticket-ийг PDF-ээр татах эсвэл и-мэйлээр илгээх',
        'Нэр оруулах хугацаа дууссан бол airline-тай холбогдоно',
      ]}
    >
      <div className='grid gap-3 sm:grid-cols-3'>
        <Info label='Холбоо барих' value={[b.contact_phone, b.contact_email].filter(Boolean).join(' · ') || '—'} />
        <Info label='Нийт дүн' value={formatMoney(total, currency)} mono />
        <Info
          label='Тийз бичих хугацаа (TL)'
          value={b.ticketing_deadline_at ? formatDateTime(b.ticketing_deadline_at) : issued ? 'Бичигдсэн' : '—'}
          mono
        />
      </div>

      {b.status === 'on_hold' && (
        <div className='flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-500/40 bg-amber-500/5 p-3 text-sm'>
          <span>
            Тийз бичигдээгүй байна. <b className='font-mono'>{formatDateTime(b.ticketing_deadline_at)}</b> хүртэл бичихгүй бол
            цуцлагдана.
          </span>
          <Button className='gap-1.5' disabled={issue.isPending} onClick={() => issue.mutate()}>
            {issue.isPending ? <Loader2 className='size-4 animate-spin' /> : <Ticket className='size-4' />}
            Тийз бичих · {formatMoney(total, currency)}
          </Button>
        </div>
      )}

      {optionsBar}
      <div className='divide-y rounded-xl border'>
        {b.passengers.map((p) => {
          const active = p.segments.some((s) => s.status !== 'cancelled')
          return (
            <div key={p.id} className={cn('grid gap-2 px-4 py-3', !active && 'opacity-55')}>
              <div className='flex flex-wrap items-center gap-x-4 gap-y-1'>
                <b className='text-sm'>{p.name}</b>
                <span className='text-muted-foreground text-xs'>{p.type}</span>
                <span className='text-muted-foreground font-mono text-xs'>{p.document_number ?? ''}</span>
                <div className='ms-auto flex flex-wrap gap-1.5'>
                  <Button
                    size='sm'
                    variant='outline'
                    className='h-7 gap-1 text-xs'
                    disabled={!issued || !active}
                    onClick={() => download(p.id, p.name)}
                  >
                    <Download className='size-3.5' />
                    PDF
                  </Button>
                  <Button
                    size='sm'
                    variant='outline'
                    className='h-7 gap-1 text-xs'
                    disabled={!issued || !active || email.isPending || !(p.email || b.contact_email)}
                    onClick={() => email.mutate(p.id)}
                  >
                    <Mail className='size-3.5' />
                    E-ticket
                  </Button>
                  {active && (
                    <Button
                      size='sm'
                      variant='ghost'
                      className='h-7 gap-1 text-xs text-red-600 dark:text-red-400'
                      onClick={() => setCancelling(p)}
                    >
                      <XCircle className='size-3.5' />
                      Цуцлах
                    </Button>
                  )}
                </div>
              </div>
              {p.segments.map((s) => (
                <div key={s.id} className='text-muted-foreground flex flex-wrap gap-x-4 font-mono text-xs'>
                  <span className='text-foreground'>
                    {s.flight_number} {s.route.replace('-', '→')}
                  </span>
                  <span>{s.departure_local?.slice(0, 16)}</span>
                  <span>
                    {s.cabin_class}/{s.fare_class ?? '-'}
                  </span>
                  <span>Тийз: {s.ticket_number ?? '—'}</span>
                  {s.seat_number && <span>Суудал: {s.seat_number}</span>}
                  <span className='uppercase'>{s.status.replace('_', ' ')}</span>
                  <span className='ms-auto'>{formatMoney(s.total_amount, s.currency ?? '')}</span>
                </div>
              ))}
            </div>
          )
        })}
      </div>

      {cancelling && (
        <ConfirmDialog
          open
          onOpenChange={(o) => !o && setCancelling(null)}
          title='Зорчигч цуцлах уу?'
          desc={`${cancelling.name} — PNR ${b.pnr}. Суудал квотод буцаж, тийзийн үнэ дансанд буцаагдана.`}
          confirmText='Цуцлах'
          destructive
          isLoading={cancel.isPending}
          handleConfirm={() => cancel.mutate(cancelling.id)}
        />
      )}
    </StepCard>
  )
}

function Info({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className='rounded-xl border px-3 py-2'>
      <p className='text-muted-foreground text-xs'>{label}</p>
      <p className={cn('truncate text-sm font-medium', mono && 'font-mono')}>{value}</p>
    </div>
  )
}
