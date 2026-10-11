import { useState } from 'react'
import { getRouteApi } from '@tanstack/react-router'
import type { FlightSeries as Series } from '@/services'
import { Pencil, Plus } from 'lucide-react'
import type { NavigateFn } from '@/hooks/use-table-url-state'
import { Button } from '@/components/ui/button'
import { ResourcePage } from '@/components/resource/resource-page'
import { pageConfig } from './components/config'
import { SeriesDialog } from './components/series-dialog'

const route = getRouteApi('/_authenticated/operations/flight-series/')

export function FlightSeries() {
  const search = route.useSearch()
  const navigate = route.useNavigate()
  const [dialog, setDialog] = useState<{ series?: Series } | null>(null)

  return (
    <>
      <ResourcePage
        {...pageConfig}
        search={search}
        navigate={navigate as unknown as NavigateFn}
        toolbarExtra={
          <Button size='sm' className='h-8 gap-2' onClick={() => setDialog({})}>
            <Plus className='size-4' />
            Create series
          </Button>
        }
        customActions={(row) => (
          <Button
            variant='ghost'
            size='icon'
            className='size-8'
            onClick={() => setDialog({ series: row })}
            aria-label='Edit series'
          >
            <Pencil className='size-4' />
          </Button>
        )}
      />
      {dialog && (
        <SeriesDialog series={dialog.series} onClose={() => setDialog(null)} />
      )}
    </>
  )
}
