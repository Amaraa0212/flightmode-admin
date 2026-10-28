import { format } from 'date-fns'
import { getRouteApi } from '@tanstack/react-router'
import { useDrawer } from '@/context/drawer-provider'
import type { NavigateFn } from '@/hooks/use-table-url-state'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DayFilter } from '@/components/day-filter'
import { FlightPassengersTable } from '@/components/flight-passengers-table'
import { Main } from '@/components/layout/main'
import { PageHeader } from '@/components/page-header'
import { ResourcePage } from '@/components/resource/resource-page'
import { pageConfig } from './components/config'
import { MonthCalendar } from './components/month-calendar'

const route = getRouteApi('/_authenticated/operations/flight-load/')

export function FlightLoad() {
  const search = route.useSearch()
  const navigate = route.useNavigate()
  const { openDrawer } = useDrawer()
  const view = search.view ?? 'day'
  const month = search.month ?? format(new Date(), 'yyyy-MM')

  const toggle = (
    <Tabs
      value={view}
      onValueChange={(v) =>
        navigate({
          search: (prev) => ({
            ...prev,
            view: v === 'day' ? undefined : (v as 'month'),
            page: undefined,
          }),
        })
      }
    >
      <TabsList>
        <TabsTrigger value='day'>Day</TabsTrigger>
        <TabsTrigger value='month'>Month</TabsTrigger>
      </TabsList>
    </Tabs>
  )

  if (view === 'month') {
    return (
      <Main className='flex flex-1 flex-col gap-4 sm:gap-6'>
        <PageHeader
          title={pageConfig.title}
          description='Free seats of every flight by day. Booked / seats beside, red under 60% load, ADT / CHD / INF on hover.'
          actions={toggle}
        />
        <MonthCalendar
          month={month}
          onMonthChange={(m) =>
            navigate({ search: (prev) => ({ ...prev, month: m }) })
          }
          onOpenDay={(date) =>
            navigate({
              search: (prev) => ({
                ...prev,
                view: undefined,
                start_day: date,
                page: undefined,
              }),
            })
          }
        />
      </Main>
    )
  }

  return (
    <ResourcePage
      {...pageConfig}
      search={search}
      navigate={navigate as unknown as NavigateFn}
      toolbarExtra={
        <>
          <DayFilter
            search={search}
            navigate={navigate as unknown as NavigateFn}
          />
          {toggle}
        </>
      }
      onRowClick={(row) =>
        openDrawer({
          title: `${row.flight_number} ${row.origin.iata_code}-${row.destination.iata_code}`,
          description: `${row.pax.booked} booked · ${row.pax.checked_in} checked in · ${row.pax.boarded} boarded`,
          className: 'sm:max-w-5xl',
          content: <FlightPassengersTable flightId={row.id} />,
        })
      }
    />
  )
}
