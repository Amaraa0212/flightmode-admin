import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import {
  agencyAccountPortalService,
  agencyBookingService,
  agencyHoldService,
  type AgencyBooking,
} from '@/services'
import {
  AlertTriangle,
  ArrowRight,
  BellRing,
  ClipboardList,
  FileSearch,
  type LucideIcon,
  PlaneTakeoff,
  Search,
  Ticket,
  Timer,
  Wallet,
} from 'lucide-react'
import { useAuthStore } from '@/stores/auth-store'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Main } from '@/components/layout/main'
import {
  formatDateTime,
  formatMoney,
} from '@/features/agency/transactions/transactions-table'
import { FlowMap, StatusPill, StepCard } from '../shared/flow'

const HOUR = 3_600_000

const greeting = () => {
  const h = new Date().getHours()
  return h < 12 ? 'Өглөөний мэнд' : h < 18 ? 'Өдрийн мэнд' : 'Оройн мэнд'
}

const ACTIONS: { title: string; hint: string; to: string; icon: LucideIcon }[] = [
  { title: 'Шинэ захиалга', hint: 'Хайх → тийз бичих', to: '/agency/booking', icon: PlaneTakeoff },
  { title: 'PNR хайх', hint: 'Захиалга удирдах', to: '/agency/bookings', icon: FileSearch },
  { title: 'Hold-ууд', hint: 'Нэр оруулах', to: '/agency/holds', icon: Timer },
  { title: 'Миний квот', hint: 'Суудал, зорчигчид', to: '/agency/quotas', icon: Ticket },
  { title: 'Миний данс', hint: 'Үлдэгдэл, гүйлгээ', to: '/agency/account', icon: Wallet },
]

type Alert = { id: string; tone: 'warn' | 'danger' | 'info'; title: string; body: string; to: string; search?: Record<string, string> }

/** Agency portal home: greeting, quick actions, alerts that need the agent, latest bookings */
export function AgencyHome() {
  const user = useAuthStore((s) => s.auth.user)
  const navigate = useNavigate()
  const [command, setCommand] = useState('')

  const accounts = useQuery({
    queryKey: ['agency-accounts'],
    queryFn: async () => (await agencyAccountPortalService.accounts()).body,
  })
  const bookings = useQuery({
    queryKey: ['agency-bookings', ''],
    queryFn: async () => (await agencyBookingService.list('', 30)).body,
  })
  const holds = useQuery({
    queryKey: ['agency-holds', 'active'],
    queryFn: async () => (await agencyHoldService.list('active')).body,
  })

  // the alert list is built once per load of the page
  const [now] = useState(() => Date.now())
  const alerts: Alert[] = [
    ...(bookings.data ?? [])
      .filter((b) => b.status === 'on_hold' && b.ticketing_deadline_at)
      .map((b): Alert => {
        const left = new Date(b.ticketing_deadline_at!).getTime() - now
        return {
          id: `tl-${b.id}`,
          tone: left < 6 * HOUR ? 'danger' : 'warn',
          title: `PNR ${b.pnr} — тийз бичих хугацаа (TL)`,
          body: `${formatDateTime(b.ticketing_deadline_at)} хүртэл тийз бичихгүй бол захиалга цуцлагдана.`,
          to: '/agency/bookings',
          search: { q: b.pnr },
        }
      }),
    ...(holds.data ?? [])
      .filter((h) => h.usage.remaining > 0 && h.names_deadline_at)
      .map((h): Alert => {
        const left = new Date(h.names_deadline_at!).getTime() - now
        return {
          id: `hold-${h.id}`,
          tone: !h.usage.is_open_for_names ? 'danger' : left < 24 * HOUR ? 'warn' : 'info',
          title: `${h.flight_number} ${h.route} — ${h.usage.remaining} нэргүй суудал`,
          body: `Нэр оруулах хугацаа: ${formatDateTime(h.names_deadline_at)}${h.usage.is_open_for_names ? '' : ' (хаагдсан)'}`,
          to: '/agency/holds',
        }
      }),
  ].sort((a, b) => ['danger', 'warn', 'info'].indexOf(a.tone) - ['danger', 'warn', 'info'].indexOf(b.tone))

  const recent = (bookings.data ?? []).slice(0, 8)
  const openSearch = () => navigate({ to: '/agency/booking', search: command.trim() ? { cmd: command.trim().toUpperCase() } : {} })

  return (
    <Main className='flex flex-1 flex-col gap-4 sm:gap-6'>
      {/* 1 · login & dashboard */}
      <section className='from-brand-2 to-brand relative overflow-hidden rounded-2xl bg-gradient-to-r p-5 text-white shadow-sm sm:p-7'>
        <div className='relative z-10 flex flex-wrap items-end justify-between gap-6'>
          <div className='max-w-xl'>
            <p className='text-sm text-white/75'>{user?.agency?.name ?? 'Агентлаг'}</p>
            <h2 className='mt-1 text-2xl font-semibold tracking-tight sm:text-3xl'>
              {greeting()}, {user?.name ?? 'агент'}!
            </h2>
            <p className='mt-1 text-sm text-white/80'>Өнөөдөр юу хийх вэ? Дараагийн алхам үргэлж тодорхой.</p>
            <div className='mt-4 flex max-w-md gap-2'>
              <div className='relative flex-1'>
                <Search className='absolute start-3 top-1/2 size-4 -translate-y-1/2 text-slate-400' />
                <Input
                  value={command}
                  onChange={(e) => setCommand(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && openSearch()}
                  placeholder='Команд: UBNICN25DEC эсвэл хоосон'
                  className='h-10 border-0 bg-white ps-9 font-mono text-slate-900 uppercase placeholder:normal-case'
                />
              </div>
              <Button onClick={openSearch} className='h-10 gap-1.5 bg-white text-slate-900 hover:bg-white/90'>
                Хайх
                <ArrowRight className='size-4' />
              </Button>
            </div>
          </div>
          <div className='flex flex-wrap gap-2'>
            {(accounts.data ?? []).map((a) => (
              <Link
                key={a.id}
                to='/agency/account'
                className='rounded-xl bg-white/12 px-4 py-2.5 backdrop-blur hover:bg-white/20'
              >
                <p className='text-xs text-white/70'>{a.airline?.iata_code} данс</p>
                <p className='font-mono text-lg font-semibold'>{formatMoney(a.balance, a.currency)}</p>
              </Link>
            ))}
          </div>
        </div>
        <PlaneTakeoff className='pointer-events-none absolute -end-6 -bottom-8 size-48 text-white/10' />
      </section>

      <div className='grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5'>
        {ACTIONS.map((a) => (
          <Link
            key={a.to}
            to={a.to}
            className='fm-panel group hover:border-primary/40 flex flex-col items-center gap-2 px-3 py-5 text-center transition-colors'
          >
            <span className='bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground flex size-11 items-center justify-center rounded-xl transition-colors'>
              <a.icon className='size-5' />
            </span>
            <span className='text-sm font-semibold'>{a.title}</span>
            <span className='text-muted-foreground text-xs'>{a.hint}</span>
          </Link>
        ))}
      </div>

      <div className='grid gap-4 lg:grid-cols-[1fr_380px]'>
        <StepCard
          n={10}
          title='Сүүлийн захиалгууд'
          subtitle='PNR дээр дарж дэлгэрэнгүйг харах, тийз бичих, e-ticket илгээх'
          actions={
            <Button asChild size='sm' variant='outline' className='h-8 gap-1.5'>
              <Link to='/agency/bookings'>
                <ClipboardList className='size-4' />
                Бүгд
              </Link>
            </Button>
          }
        >
          <RecentBookings rows={recent} loading={bookings.isLoading} />
        </StepCard>

        <StepCard n={11} title='Сануулга' subtitle='Анхаарах шаардлагатай захиалга, hold'>
          <div className='grid gap-2'>
            {alerts.slice(0, 6).map((a) => (
              <Link
                key={a.id}
                to={a.to}
                search={a.search}
                className={cn(
                  'flex gap-3 rounded-xl border p-3 text-start hover:bg-muted/40',
                  a.tone === 'danger' && 'border-red-500/30 bg-red-500/5',
                  a.tone === 'warn' && 'border-amber-500/30 bg-amber-500/5'
                )}
              >
                {a.tone === 'info' ? (
                  <BellRing className='text-primary mt-0.5 size-4 shrink-0' />
                ) : (
                  <AlertTriangle
                    className={cn('mt-0.5 size-4 shrink-0', a.tone === 'danger' ? 'text-red-600' : 'text-amber-600')}
                  />
                )}
                <span>
                  <span className='block text-sm font-medium'>{a.title}</span>
                  <span className='text-muted-foreground block text-xs'>{a.body}</span>
                </span>
              </Link>
            ))}
            {!alerts.length && (
              <p className='text-muted-foreground rounded-xl border border-dashed p-6 text-center text-sm'>
                {bookings.isLoading || holds.isLoading ? 'Ачаалж байна…' : 'Одоогоор анхаарах зүйл алга 👍'}
              </p>
            )}
          </div>
        </StepCard>
      </div>

      <StepCard title='Захиалгын урсгал' subtitle='Хайлтаас e-ticket хүртэл — алхам бүр нэг дэлгэц дээр'>
        <FlowMap />
      </StepCard>
    </Main>
  )
}

function RecentBookings({ rows, loading }: { rows: AgencyBooking[]; loading: boolean }) {
  if (!rows.length) {
    return (
      <p className='text-muted-foreground rounded-xl border border-dashed p-8 text-center text-sm'>
        {loading ? 'Ачаалж байна…' : 'Захиалга алга. “Шинэ захиалга”-аас эхлээрэй.'}
      </p>
    )
  }
  return (
    <div className='divide-y rounded-xl border'>
      {rows.map((b) => {
        const seg = b.passengers[0]?.segments[0]
        return (
          <Link
            key={b.id}
            to='/agency/bookings'
            search={{ q: b.pnr }}
            className='hover:bg-muted/40 flex flex-wrap items-center gap-x-4 gap-y-1 px-3 py-2.5 text-sm'
          >
            <span className='text-brand w-20 font-mono font-semibold'>{b.pnr}</span>
            <span className='min-w-0 flex-1 truncate'>
              {b.passengers[0]?.name ?? '—'}
              {b.passengers.length > 1 && <span className='text-muted-foreground'> +{b.passengers.length - 1}</span>}
            </span>
            {seg && (
              <span className='text-muted-foreground font-mono text-xs'>
                {seg.flight_number} {seg.route} · {seg.departure_local?.slice(0, 16)}
              </span>
            )}
            <StatusPill status={b.status} />
          </Link>
        )
      })}
    </div>
  )
}
