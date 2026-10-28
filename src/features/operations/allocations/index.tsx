import { getRouteApi } from '@tanstack/react-router'
import type { NavigateFn } from '@/hooks/use-table-url-state'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DateRangeFilter } from '@/components/date-range-filter'
import { Main } from '@/components/layout/main'
import { PageHeader } from '@/components/page-header'
import { ResourcePage } from '@/components/resource/resource-page'
import { pageConfig } from './components/config'
import { FlightBoard } from './components/flight-board'

const route = getRouteApi('/_authenticated/operations/allocations/')

export function Allocations() {
  const search = route.useSearch()
  const navigate = route.useNavigate()
  const view = search.view ?? 'flight'

  const toggle = (
    <Tabs
      value={view}
      onValueChange={(v) =>
        navigate({
          search: (prev) => ({
            ...prev,
            view: v === 'flight' ? undefined : (v as 'list'),
            page: undefined,
          }),
        })
      }
    >
      <TabsList>
        <TabsTrigger value='flight'>By flight</TabsTrigger>
        <TabsTrigger value='list'>List</TabsTrigger>
      </TabsList>
    </Tabs>
  )

  if (view === 'list') {
    return (
      <ResourcePage
        {...pageConfig}
        search={search}
        navigate={navigate as unknown as NavigateFn}
        toolbarExtra={toggle}
      />
    )
  }

  return (
    <Main className='flex flex-1 flex-col gap-4 sm:gap-6'>
      <PageHeader
        title={pageConfig.title}
        description='Quota by flight: who got how much, sold, held and can still sell. Distribute a flight to several agencies at once, or move seats between agencies.'
        actions={
          <>
            <DateRangeFilter
              search={search}
              navigate={navigate as unknown as NavigateFn}
            />
            {toggle}
          </>
        }
      />
      <FlightBoard from={search.start_day} to={search.end_day} />
    </Main>
  )
}
