import { useQueryClient, useMutation } from '@tanstack/react-query'
import { getRouteApi } from '@tanstack/react-router'
import { agencyService, airlineOptions, type Agency } from '@/services'
import { RefreshCcw } from 'lucide-react'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth-store'
import type { NavigateFn } from '@/hooks/use-table-url-state'
import { Button } from '@/components/ui/button'
import { ResourcePage } from '@/components/resource/resource-page'
import { pageConfig } from './components/config'

const route = getRouteApi('/_authenticated/company/agencies/')

export function Agencies() {
  const search = route.useSearch()
  const navigate = route.useNavigate()
  const user = useAuthStore((s) => s.auth.user)
  const queryClient = useQueryClient()
  const isSystemAdmin = !!user?.is_system_admin
  // an airline edits and deletes only the agencies it created
  const own = (r: Agency) =>
    isSystemAdmin || (!!user?.airline && r.owner_airline_id === user.airline.id)

  const chinggis = useMutation({
    mutationFn: (r: Agency) =>
      agencyService.setChinggisSync(r.id, !r.chinggis_sync),
    onSuccess: (res) => {
      toast.success(res.message)
      queryClient.invalidateQueries({ queryKey: [pageConfig.queryKey] })
    },
    onError: (error: Error) => toast.error(error.message),
  })

  const form = pageConfig.form!
  return (
    <ResourcePage
      {...pageConfig}
      search={search}
      navigate={navigate as unknown as NavigateFn}
      rowEditable={own}
      form={{
        ...form,
        // a system administrator creates an agency for one airline, or shared by every airline
        fields: isSystemAdmin
          ? [
              ...form.fields,
              {
                name: 'open_jaw',
                label: 'Open jaw (charter RT өөр airline-аар буцах)',
                type: 'checkbox',
                gridCols: 2,
              },
              {
                name: 'owner_airline_id',
                label: 'Belongs to airline',
                type: 'select',
                options: [
                  { label: 'Бүх airline-тай гэрээ байгуулах', value: 'all' },
                  { label: 'Shared — гэрээ нэмэхгүй', value: '' },
                ],
                loadOptions: airlineOptions,
                gridCols: 2,
              },
            ]
          : form.fields,
        // the owner choice is sent only when changed (a plain edit leaves the contracts alone)
        update: (row, v) =>
          agencyService.update(
            row.id,
            v,
            isSystemAdmin &&
              v.owner_airline_id !==
                (row.owner_airline_id ? String(row.owner_airline_id) : '')
          ),
      }}
      // an agency created by someone else: only its Chinggis push can be switched here
      customActions={(r) =>
        own(r) ? null : (
          <Button
            size='sm'
            variant='ghost'
            className='h-7 gap-1 text-xs'
            title='Push quota to Chinggis API'
            disabled={chinggis.isPending}
            onClick={(e) => {
              e.stopPropagation()
              chinggis.mutate(r)
            }}
          >
            <RefreshCcw className='size-3.5' />
            Chinggis {r.chinggis_sync ? 'on' : 'off'}
          </Button>
        )
      }
    />
  )
}
