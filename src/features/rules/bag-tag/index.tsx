import { useState } from 'react'
import { getRouteApi } from '@tanstack/react-router'
import type { BagTagLayout } from '@/services'
import { Pencil, Plus } from 'lucide-react'
import type { NavigateFn } from '@/hooks/use-table-url-state'
import { Button } from '@/components/ui/button'
import { ResourcePage } from '@/components/resource/resource-page'
import { pageConfig } from './components/config'
import { LayoutDialog } from './components/layout-dialog'

const route = getRouteApi('/_authenticated/rules/bag-tag/')

export function BagTagPosition() {
  const search = route.useSearch()
  const navigate = route.useNavigate()
  const [dialog, setDialog] = useState<{ layout?: BagTagLayout } | null>(null)

  return (
    <>
      <ResourcePage
        {...pageConfig}
        search={search}
        navigate={navigate as unknown as NavigateFn}
        toolbarExtra={
          <Button size='sm' className='h-8 gap-2' onClick={() => setDialog({})}>
            <Plus className='size-4' />
            Create layout
          </Button>
        }
        customActions={(row) => (
          <Button
            variant='ghost'
            size='icon'
            className='size-8'
            onClick={() => setDialog({ layout: row })}
            aria-label='Edit layout'
          >
            <Pencil className='size-4' />
          </Button>
        )}
      />
      {dialog && (
        <LayoutDialog layout={dialog.layout} onClose={() => setDialog(null)} />
      )}
    </>
  )
}
