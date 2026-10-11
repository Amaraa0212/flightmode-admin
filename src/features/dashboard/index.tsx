import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { dashboardService, reportService } from '@/services'
import {
  CalendarCheck,
  DoorOpen,
  Gauge,
  PlaneTakeoff,
  Users,
  Wallet,
} from 'lucide-react'
import { formatDate, formatMnt } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Main } from '@/components/layout/main'
import { PageHeader } from '@/components/page-header'
import { Progress } from '@/components/progress-bar'
import { RoutesChart, SalesChart } from './components/charts'
import { StatTile } from './components/stat-tile'

export function Dashboard() {
  const { data: stats } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: async () => (await dashboardService.get()).body,
  })
  const { data: completed = [] } = useQuery({
    queryKey: ['admin-dashboard', 'completed'],
    queryFn: async () =>
      (await reportService.traffic({ pageSize: 200 })).body?.items ?? [],
  })
  const recent = [...completed]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 8)
  const { data: oci = [] } = useQuery({
    queryKey: ['admin-dashboard', 'oci'],
    queryFn: () => reportService.onlineCheckin(),
  })

  if (!stats) {
    return (
      <Main className='grid grid-cols-3 gap-4'>
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className='h-28 rounded-2xl' />
        ))}
      </Main>
    )
  }

  return (
    <Main className='flex flex-1 flex-col gap-4 sm:gap-6'>
      <PageHeader
        title='Dashboard'
        description={`Today · ${formatDate(new Date(), 'YYYY-MM-DD')}`}
      />

      <div className='grid grid-cols-6 gap-3'>
        <StatTile
          icon={PlaneTakeoff}
          label='Flights today'
          value={stats.flights_today}
        />
        <StatTile
          icon={Users}
          label='Passengers today'
          value={stats.passengers_today}
        />
        <StatTile
          icon={DoorOpen}
          label='Check-in open'
          value={stats.checkin_open}
          sub='flights at the counter'
        />
        <StatTile
          icon={CalendarCheck}
          label='Bookings (7 days)'
          value={stats.bookings_week}
        />
        <StatTile
          icon={Wallet}
          label='Sales (7 days)'
          value={formatMnt(stats.revenue_week)}
        />
        <StatTile
          icon={Gauge}
          label='Load factor today'
          value={`${Math.round(stats.load_factor * 100)}%`}
          sub={<Progress value={stats.load_factor} className='mt-1' />}
        />
      </div>

      <div className='grid grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-4'>
        <section className='fm-panel p-4'>
          <p className='font-semibold'>Sales performance</p>
          <p className='text-muted-foreground mb-3 text-xs'>
            Bookings and passengers per day, last 14 days
          </p>
          <SalesChart data={stats.daily} />
        </section>
        <section className='fm-panel p-4'>
          <p className='font-semibold'>Top routes</p>
          <p className='text-muted-foreground mb-3 text-xs'>
            Booked passengers, all flights
          </p>
          <RoutesChart data={stats.top_routes} />
        </section>
      </div>

      <div className='grid grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-4'>
        <section className='fm-panel overflow-hidden'>
          <div className='flex items-center justify-between border-b px-4 py-3'>
            <div>
              <p className='font-semibold'>Completed flights</p>
              <p className='text-muted-foreground text-xs'>Last flights</p>
            </div>
            <Link
              to='/reports/traffic'
              className='text-brand text-xs hover:underline'
            >
              Traffic report →
            </Link>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Flight</TableHead>
                <TableHead>Destination</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Flown pax</TableHead>
                <TableHead>OCI</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recent.map((f) => (
                <TableRow key={f.id}>
                  <TableCell className='text-brand font-mono text-xs font-semibold'>
                    {f.flight_number}
                  </TableCell>
                  <TableCell>{f.route.split('-')[1]}</TableCell>
                  <TableCell className='font-mono text-xs'>
                    {formatDate(f.date, 'YYYY-MM-DD HH:mm')}
                  </TableCell>
                  <TableCell className='font-mono text-xs'>
                    {f.flown} / {f.capacity}
                  </TableCell>
                  <TableCell className='font-mono text-xs'>{f.oci}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </section>
        <section className='fm-panel p-4'>
          <p className='font-semibold'>Online check-in</p>
          <p className='text-muted-foreground mb-4 text-xs'>
            Share of flown passengers checked in online
          </p>
          <div className='space-y-4'>
            {oci.map((m) => (
              <div key={m.month} className='space-y-1.5'>
                <div className='flex justify-between text-sm'>
                  <span className='font-mono'>{m.month}</span>
                  <span className='text-muted-foreground font-mono text-xs'>
                    {m.oci} / {m.pax} ·{' '}
                    <b className='text-foreground'>
                      {m.pax ? Math.round((m.oci / m.pax) * 100) : 0}%
                    </b>
                  </span>
                </div>
                <Progress value={m.pax ? m.oci / m.pax : 0} />
              </div>
            ))}
          </div>
        </section>
      </div>
    </Main>
  )
}
