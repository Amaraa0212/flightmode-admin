import { useState } from 'react'
import { getRouteApi } from '@tanstack/react-router'
import { Settings2 } from 'lucide-react'
import type { NavigateFn } from '@/hooks/use-table-url-state'
import { Button } from '@/components/ui/button'
import { DayFilter } from '@/components/day-filter'
import { ResourcePage } from '@/components/resource/resource-page'
import { pageConfig } from './components/config'
import { ManageDialog } from './components/manage-dialog'

const route = getRouteApi('/_authenticated/dcs/flight-manager/')

export function FlightManager() {
  const search = route.useSearch()
  const navigate = route.useNavigate()
  const [flightId, setFlightId] = useState<number | null>(null)

  return (
    <>
      <ResourcePage
        {...pageConfig}
        search={search}
        navigate={navigate as unknown as NavigateFn}
        onRowClick={(row) => setFlightId(row.id)}
        toolbarExtra={
          <DayFilter
            search={search}
            navigate={navigate as unknown as NavigateFn}
          />
        }
        customActions={(row) => (
          <Button
            variant='outline'
            size='sm'
            className='h-7 gap-1.5 text-xs'
            onClick={(e) => {
              e.stopPropagation()
              setFlightId(row.id)
            }}
          >
            <Settings2 className='size-3.5' />
            Manage
          </Button>
        )}
      />
      {flightId && (
        <ManageDialog flightId={flightId} onClose={() => setFlightId(null)} />
      )}
    </>
  )
}
