import { useQuery } from '@tanstack/react-query'
import { getRouteApi } from '@tanstack/react-router'
import { airportOptions, reportService } from '@/services'
import { useOptions } from '@/hooks/use-options'
import type { NavigateFn } from '@/hooks/use-table-url-state'
import { DateRangeFilter } from '@/components/date-range-filter'
import { ResourcePage } from '@/components/resource/resource-page'
import { SimpleSelect } from '@/components/simple-select'
import { pageConfig } from './components/config'

const route = getRouteApi('/_authenticated/reports/traffic/')

const ALL = 'all'
const DIRECTIONS = [
  { label: 'OW (one direction)', value: 'OW' },
  { label: 'RT (both directions)', value: 'RT' },
]

function Total({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <p className='text-muted-foreground text-xs'>{label}</p>
      <p className='font-mono text-lg font-semibold'>{value}</p>
    </div>
  )
}

export function TrafficReport() {
  const search = route.useSearch()
  const navigate = route.useNavigate()
  const airports = useOptions('airports', airportOptions)
  const codes = [
    { label: 'All', value: ALL },
    ...airports.map((a) => ({ label: a.label, value: a.iata_code })),
  ]
  const filter = (key: 'origin' | 'destination') => (value: string) =>
    navigate({
      search: (s) => ({
        ...s,
        page: 1,
        [key]: value === ALL ? undefined : value,
      }),
    })

  const { data: totals } = useQuery({
    queryKey: [pageConfig.queryKey, 'totals', search],
    queryFn: () => reportService.trafficTotals(search),
  })

  return (
    <ResourcePage
      {...pageConfig}
      search={search}
      navigate={navigate as unknown as NavigateFn}
      params={{
        origin: search.origin,
        destination: search.destination,
        trip: search.trip,
      }}
      rowClassName={(r) =>
        r.not_scanned > 0 ? '[&>td]:!bg-amber-500/10' : undefined
      }
      toolbarExtra={
        <>
          <SimpleSelect
            value={search.origin ?? ALL}
            onValueChange={filter('origin')}
            items={codes}
            placeholder='From'
            className='h-8 w-36'
          />
          <SimpleSelect
            value={search.destination ?? ALL}
            onValueChange={filter('destination')}
            items={codes}
            placeholder='To'
            className='h-8 w-36'
          />
          <SimpleSelect
            value={search.trip ?? 'OW'}
            onValueChange={(v) =>
              navigate({
                search: (s) => ({ ...s, page: 1, trip: v as 'OW' | 'RT' }),
              })
            }
            items={DIRECTIONS}
            className='h-8 w-44'
          />
          <DateRangeFilter
            search={search}
            navigate={navigate as unknown as NavigateFn}
          />
        </>
      }
      afterTable={
        totals && (
          <div className='bg-card mt-3 flex flex-wrap gap-8 rounded-md border p-4'>
            <Total label='Нислэг' value={totals.flights} />
            <Total label='Нийт зорчигч' value={totals.pax} />
            <Total label='Нийт ачаа, кг' value={totals.bag_kg} />
            <Total label='Ачаа, ш' value={totals.bags} />
            <Total label='Дундаж OCI' value={`${totals.oci_percent}%`} />
          </div>
        )
      }
    />
  )
}
