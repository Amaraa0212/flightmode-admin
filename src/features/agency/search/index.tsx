import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getRouteApi, Link } from '@tanstack/react-router'
import {
  agencyHoldService,
  type AgencyFlight,
  type AgencyQuota,
} from '@/services'
import { ChevronLeft, ChevronRight, Plane, Timer, UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Main } from '@/components/layout/main'
import { PageHeader } from '@/components/page-header'
import { BalanceStrip } from '@/features/agency/account/balance-strip'
import { BookingDialog } from '@/features/agency/quotas/components/booking-dialog'
import {
  formatDateTime,
  formatMoney,
} from '@/features/agency/transactions/transactions-table'
import { HoldDialog } from './hold-dialog'

const route = getRouteApi('/_authenticated/agency/search/')

const today = () => new Date().toISOString().slice(0, 10)
const shift = (date: string, days: number) => {
  const d = new Date(`${date}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

/** The flight as the existing name-entry dialog expects it */
const toQuota = (f: AgencyFlight): AgencyQuota => ({
  id: f.id,
  airline: f.airline,
  flight_number: f.flight_number,
  route: f.route,
  departure_at: f.departure_local ?? '',
  return_flight: f.return_flight,
  seats: f.seats,
  used: f.used,
  remaining: f.remaining,
  cabins: f.cabins.map((c) => `${c.cabin_class} ${c.seats}`).join(' · '),
  cabin_classes: f.cabins
    .filter((c) => c.remaining > 0)
    .map((c) => c.cabin_class),
  names_deadline_at: f.names_deadline_at,
  is_open_for_names: f.is_open_for_names,
})

/** Agency portal: pick a day, see the agency's flights with free seats, hold seats or enter names */
export function AgencySearch() {
  const search = route.useSearch()
  const navigate = route.useNavigate()
  const date = search.date ?? today()
  const [holding, setHolding] = useState<AgencyFlight | null>(null)
  const [booking, setBooking] = useState<AgencyFlight | null>(null)

  const query = useQuery({
    queryKey: ['agency-flights', date],
    queryFn: async () => (await agencyHoldService.flights(date)).body,
  })
  const flights = query.data ?? []
  const setDate = (d: string) => navigate({ search: { date: d } })

  return (
    <Main className='flex flex-1 flex-col gap-4 sm:gap-6'>
      <PageHeader
        title='Нислэг хайх'
        description='Огноогоо сонгоод танай агентлагт олгосон нислэгүүдээс суудал hold хийнэ. Нэрсийг дараа нь “Hold-ууд” хэсгээс оруулна.'
        actions={
          <Button asChild size='sm' variant='outline' className='h-8 gap-2'>
            <Link to='/agency/holds'>
              <Timer className='size-4' />
              Hold-ууд
            </Link>
          </Button>
        }
      />

      <BalanceStrip />

      <div className='fm-panel flex flex-wrap items-center gap-2 px-4 py-3'>
        <Button
          size='icon'
          variant='outline'
          className='size-8'
          aria-label='Өмнөх өдөр'
          onClick={() => setDate(shift(date, -1))}
        >
          <ChevronLeft className='size-4' />
        </Button>
        <Input
          type='date'
          aria-label='Нислэгийн огноо'
          className='w-44'
          value={date}
          onChange={(e) => e.target.value && setDate(e.target.value)}
        />
        <Button
          size='icon'
          variant='outline'
          className='size-8'
          aria-label='Дараагийн өдөр'
          onClick={() => setDate(shift(date, 1))}
        >
          <ChevronRight className='size-4' />
        </Button>
        <span className='text-muted-foreground ms-2 text-sm'>
          {query.isLoading ? 'Хайж байна…' : `${flights.length} нислэг`}
        </span>
      </div>

      <div className='grid gap-4 lg:grid-cols-2'>
        {flights.map((f) => (
          <FlightCard
            key={f.id}
            flight={f}
            onHold={() => setHolding(f)}
            onBook={() => setBooking(f)}
          />
        ))}
      </div>
      {!query.isLoading && !flights.length && (
        <div className='fm-panel text-muted-foreground flex flex-col items-center gap-2 px-4 py-16 text-center text-sm'>
          <Plane className='size-6' />
          Энэ өдөр танай агентлагт олгосон нислэг алга
        </div>
      )}

      {holding && (
        <HoldDialog
          flight={holding}
          onClose={() => setHolding(null)}
          onHeld={() => setHolding(null)}
        />
      )}
      <BookingDialog
        quota={booking ? toQuota(booking) : null}
        onClose={() => setBooking(null)}
      />
    </Main>
  )
}

function FlightCard({
  flight: f,
  onHold,
  onBook,
}: {
  flight: AgencyFlight
  onHold: () => void
  onBook: () => void
}) {
  const closed = !f.is_open_for_names
  const full = f.remaining < 1

  return (
    <div className='fm-panel flex flex-col gap-3 p-4'>
      <div className='flex items-start justify-between gap-3'>
        <div>
          <p className='font-mono text-lg font-semibold'>
            {f.flight_number}{' '}
            <span className='text-muted-foreground font-normal'>{f.route}</span>
          </p>
          <p className='text-muted-foreground text-xs'>
            {f.departure_local} → {f.arrival_local?.slice(11)}
            {f.return_flight && ` · буцах ${f.return_flight}`}
          </p>
        </div>
        <div className='text-end'>
          <p className='font-mono text-2xl font-semibold'>{f.remaining}</p>
          <p className='text-muted-foreground text-xs'>
            үлдсэн / {f.seats || '∞'} · hold {f.held}
          </p>
        </div>
      </div>

      <div className='flex flex-wrap gap-1.5'>
        {f.cabins.map((c) => (
          <span
            key={c.cabin_class}
            className='bg-muted rounded-md px-2 py-0.5 font-mono text-xs'
          >
            {c.cabin_class}: {c.remaining}/{c.seats || '∞'}
          </span>
        ))}
      </div>

      {f.fares.length > 0 && (
        <div className='divide-y rounded-lg border text-sm'>
          {f.fares.map((fare) => (
            <div
              key={fare.id}
              className='flex items-center justify-between px-3 py-1.5'
            >
              <span>
                <b className='font-mono'>{fare.fare_class ?? '—'}</b>{' '}
                <span className='text-muted-foreground text-xs'>
                  {fare.cabin_class} ·{' '}
                  {fare.remaining === null
                    ? 'хязгааргүй'
                    : `${fare.remaining} үлдсэн`}
                </span>
              </span>
              <span className='font-mono'>
                {fare.price
                  ? formatMoney(
                      Number(fare.price.fare) + Number(fare.price.tax)
                    )
                  : '-'}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className='flex flex-wrap items-center justify-between gap-2'>
        <span
          className={
            closed
              ? 'text-xs text-red-600 dark:text-red-400'
              : 'text-muted-foreground text-xs'
          }
        >
          Нэр оруулах: {formatDateTime(f.names_deadline_at)}
          {closed && ' (хаагдсан)'}
        </span>
        <div className='flex gap-2'>
          <Button
            size='sm'
            variant='outline'
            className='h-8 gap-1.5'
            disabled={closed || full}
            onClick={onBook}
          >
            <UserPlus className='size-4' />
            Шууд нэр оруулах
          </Button>
          <Button
            size='sm'
            className='h-8 gap-1.5'
            disabled={closed || full}
            onClick={onHold}
          >
            <Timer className='size-4' />
            Hold хийх
          </Button>
        </div>
      </div>
    </div>
  )
}
