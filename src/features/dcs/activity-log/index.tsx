import { getRouteApi } from '@tanstack/react-router'
import { Plane, User } from 'lucide-react'
import type { NavigateFn } from '@/hooks/use-table-url-state'
import { DateRangeFilter } from '@/components/date-range-filter'
import { ResourcePage } from '@/components/resource/resource-page'
import { TextFilter } from '@/components/text-filter'
import { pageConfig } from './components/config'

const route = getRouteApi('/_authenticated/dcs/activity-log/')

export function ActivityLog() {
  const search = route.useSearch()
  const navigate = route.useNavigate() as unknown as NavigateFn

  return (
    <ResourcePage
      {...pageConfig}
      search={search}
      navigate={navigate}
      toolbarExtra={
        <>
          <TextFilter
            name='flight'
            value={search.flight}
            navigate={navigate}
            placeholder='Flight no'
            icon={<Plane className='size-3.5' />}
            className='w-28'
          />
          <TextFilter
            name='passenger'
            value={search.passenger}
            navigate={navigate}
            placeholder='Passenger / PNR'
            icon={<User className='size-3.5' />}
            className='w-40'
          />
          <DateRangeFilter search={search} navigate={navigate} />
        </>
      }
    />
  )
}
