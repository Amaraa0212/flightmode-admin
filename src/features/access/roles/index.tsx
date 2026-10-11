import { useState } from 'react'
import { getRouteApi } from '@tanstack/react-router'
import type { Role } from '@/services'
import { Plus, ShieldCheck } from 'lucide-react'
import type { NavigateFn } from '@/hooks/use-table-url-state'
import { Button } from '@/components/ui/button'
import { ResourcePage } from '@/components/resource/resource-page'
import { pageConfig } from './components/config'
import { RoleDialog } from './components/role-dialog'

const route = getRouteApi('/_authenticated/access/roles/')

export function Roles() {
  const search = route.useSearch()
  const navigate = route.useNavigate()
  const [dialog, setDialog] = useState<{ role?: Role } | null>(null)

  return (
    <>
      <ResourcePage
        {...pageConfig}
        search={search}
        navigate={navigate as unknown as NavigateFn}
        onRowClick={(row) => setDialog({ role: row })}
        toolbarExtra={
          <Button size='sm' className='h-8 gap-2' onClick={() => setDialog({})}>
            <Plus className='size-4' />
            Create role
          </Button>
        }
        customActions={(row) => (
          <Button
            variant='ghost'
            size='sm'
            className='h-7 gap-1.5 text-xs'
            onClick={(e) => {
              e.stopPropagation()
              setDialog({ role: row })
            }}
          >
            <ShieldCheck className='size-3.5' />
            Permissions
          </Button>
        )}
      />
      {dialog && (
        <RoleDialog role={dialog.role} onClose={() => setDialog(null)} />
      )}
    </>
  )
}
