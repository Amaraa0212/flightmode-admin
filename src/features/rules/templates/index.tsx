import { useState } from 'react'
import { getRouteApi } from '@tanstack/react-router'
import type { ServiceTemplate } from '@/services'
import { Pencil, Plus } from 'lucide-react'
import type { NavigateFn } from '@/hooks/use-table-url-state'
import { Button } from '@/components/ui/button'
import { ResourcePage } from '@/components/resource/resource-page'
import { pageConfig } from './components/config'
import { TemplateDialog } from './components/template-dialog'

const route = getRouteApi('/_authenticated/rules/templates/')

export function Templates() {
  const search = route.useSearch()
  const navigate = route.useNavigate()
  const [dialog, setDialog] = useState<{ template?: ServiceTemplate } | null>(
    null
  )

  return (
    <>
      <ResourcePage
        {...pageConfig}
        search={search}
        navigate={navigate as unknown as NavigateFn}
        toolbarExtra={
          <Button size='sm' className='h-8 gap-2' onClick={() => setDialog({})}>
            <Plus className='size-4' />
            Create template
          </Button>
        }
        customActions={(row) => (
          <Button
            variant='ghost'
            size='icon'
            className='size-8'
            onClick={() => setDialog({ template: row })}
            aria-label='Edit template'
          >
            <Pencil className='size-4' />
          </Button>
        )}
      />
      {dialog && (
        <TemplateDialog
          template={dialog.template}
          onClose={() => setDialog(null)}
        />
      )}
    </>
  )
}
