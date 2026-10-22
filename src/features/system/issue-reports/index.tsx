import { useState } from 'react'
import { getRouteApi } from '@tanstack/react-router'
import type { IssueReport } from '@/services'
import { useAuthStore } from '@/stores/auth-store'
import type { NavigateFn } from '@/hooks/use-table-url-state'
import { DateRangeFilter } from '@/components/date-range-filter'
import { ResourcePage } from '@/components/resource/resource-page'
import { ForbiddenError } from '@/features/shared/errors/forbidden'
import { pageConfig } from './components/config'
import { IssueDialog } from './components/issue-dialog'

const route = getRouteApi('/_authenticated/system/issue-reports/')

/** System administrator only (System menu) */
export function IssueReports() {
  const search = route.useSearch()
  const navigate = route.useNavigate() as unknown as NavigateFn
  const isSystemAdmin = useAuthStore((s) => !!s.auth.user?.is_system_admin)
  const [open, setOpen] = useState<IssueReport | null>(null)

  if (!isSystemAdmin) return <ForbiddenError />

  return (
    <>
      <ResourcePage
        {...pageConfig}
        search={search}
        navigate={navigate}
        onRowClick={setOpen}
        toolbarExtra={<DateRangeFilter search={search} navigate={navigate} />}
      />
      {open && <IssueDialog report={open} queryKey={pageConfig.queryKey} onClose={() => setOpen(null)} />}
    </>
  )
}
