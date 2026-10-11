import { useMutation, useQueryClient } from '@tanstack/react-query'
import { getRouteApi } from '@tanstack/react-router'
import { charterRequestService, type CharterRequestStatus } from '@/services'
import { toast } from 'sonner'
import { CHARTER_STATUS } from '@/constants/status'
import type { NavigateFn } from '@/hooks/use-table-url-state'
import { Button } from '@/components/ui/button'
import { ResourcePage } from '@/components/resource/resource-page'
import { NEXT_ACTIONS, pageConfig } from './components/config'

const route = getRouteApi('/_authenticated/requests/charter/')

export function CharterRequests() {
  const search = route.useSearch()
  const navigate = route.useNavigate()
  const queryClient = useQueryClient()

  const setStatus = useMutation({
    mutationFn: (vars: { id: number; status: CharterRequestStatus }) =>
      charterRequestService.updateStatus(vars.id, vars.status),
    onSuccess: (res) => {
      toast.success(res.message)
      queryClient.invalidateQueries({ queryKey: [pageConfig.queryKey] })
    },
    onError: (error: Error) => toast.error(error.message),
  })

  return (
    <ResourcePage
      {...pageConfig}
      search={search}
      navigate={navigate as unknown as NavigateFn}
      customActions={(row) => (
        <div className='flex gap-1'>
          {NEXT_ACTIONS[row.status].map((status) => (
            <Button
              key={status}
              size='sm'
              variant={status === 'rejected' ? 'outline' : 'secondary'}
              className='h-7 px-2 text-xs'
              disabled={setStatus.isPending}
              onClick={() => setStatus.mutate({ id: row.id, status })}
            >
              {CHARTER_STATUS[status].label}
            </Button>
          ))}
        </div>
      )}
    />
  )
}
