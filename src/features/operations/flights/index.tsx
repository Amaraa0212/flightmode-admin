import { useState } from 'react'
import { getRouteApi } from '@tanstack/react-router'
import { Plus } from 'lucide-react'
import type { NavigateFn } from '@/hooks/use-table-url-state'
import { Button } from '@/components/ui/button'
import { DateRangeFilter } from '@/components/date-range-filter'
import { ResourcePage } from '@/components/resource/resource-page'
import { pageConfig } from './components/config'
import { NewFlightsDialog } from './components/new-flights-dialog'

const route = getRouteApi('/_authenticated/operations/flights/')

export function Flights() {
  const search = route.useSearch()
  const navigate = route.useNavigate()
  const [creating, setCreating] = useState(false)

  return (
    <>
      <ResourcePage
        {...pageConfig}
        search={search}
        navigate={navigate as unknown as NavigateFn}
        toolbarExtra={
          <>
            <DateRangeFilter
              search={search}
              navigate={navigate as unknown as NavigateFn}
            />
            <Button
              size='sm'
              className='h-8 gap-2'
              onClick={() => setCreating(true)}
            >
              <Plus className='size-4' />
              New flights
            </Button>
          </>
        }
      />
      {creating && <NewFlightsDialog onClose={() => setCreating(false)} />}
    </>
  )
}
