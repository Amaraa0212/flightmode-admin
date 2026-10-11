import { useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getRouteApi } from '@tanstack/react-router'
import { agencyContractService, type Agency } from '@/services'
import { toast } from 'sonner'
import type { NavigateFn } from '@/hooks/use-table-url-state'
import { Switch } from '@/components/ui/switch'
import { col } from '@/components/resource/columns'
import { ResourcePage } from '@/components/resource/resource-page'
import { pageConfig } from './components/config'

const route = getRouteApi('/_authenticated/company/agency-access/')

export function AgencyAccess() {
  const search = route.useSearch()
  const navigate = route.useNavigate()
  const queryClient = useQueryClient()

  const { data: airlines = [] } = useQuery({
    queryKey: ['admin-airline-list-simple'],
    queryFn: async () => (await agencyContractService.airlines()).body ?? [],
  })

  const { mutate: toggle } = useMutation({
    mutationFn: (vars: {
      agencyId: number
      airlineId: number
      active: boolean
    }) =>
      agencyContractService.setContract(
        vars.agencyId,
        vars.airlineId,
        vars.active
      ),
    onSuccess: (res) => {
      toast.success(res.message)
      queryClient.invalidateQueries({ queryKey: [pageConfig.queryKey] })
    },
  })

  const columns = useMemo(
    () => [
      ...pageConfig.columns,
      ...airlines.map((airline) =>
        col<Agency>(
          `airline_${airline.id}`,
          airline.iata_code,
          (r) => {
            const contract = r.airlines.find((a) => a.id === airline.id)
            return (
              <div className='flex items-center gap-2'>
                <Switch
                  checked={!!contract?.contract_active}
                  onCheckedChange={(active) =>
                    toggle({ agencyId: r.id, airlineId: airline.id, active })
                  }
                  aria-label={`${r.name} sells ${airline.name}`}
                />
                <span className='text-muted-foreground text-xs'>
                  {contract
                    ? contract.contract_active
                      ? 'Active'
                      : 'Suspended'
                    : 'No contract'}
                </span>
              </div>
            )
          },
          {
            accessor: (r) =>
              r.airlines.find((a) => a.id === airline.id)?.contract_active ??
              false,
          }
        )
      ),
    ],
    [airlines, toggle]
  )

  return (
    <ResourcePage
      {...pageConfig}
      columns={columns}
      search={search}
      navigate={navigate as unknown as NavigateFn}
    />
  )
}
