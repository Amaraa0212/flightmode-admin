import { useQuery } from '@tanstack/react-query'
import { getRouteApi } from '@tanstack/react-router'
import { reportService, type SalesSummaryRow } from '@/services'
import type { NavigateFn } from '@/hooks/use-table-url-state'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DateRangeFilter } from '@/components/date-range-filter'
import { col, money, mono } from '@/components/resource/columns'
import { ResourcePage } from '@/components/resource/resource-page'

const route = getRouteApi('/_authenticated/reports/sales-summary/')

const GROUPS = {
  agency: 'Агент',
  month: 'Сар',
  route: 'Чиглэл',
} as const
type Group = keyof typeof GROUPS

/** Reports → Sales summary: issued tickets of the airline's scheduled flights by agent, month or route. No charters. */
export function SalesSummary() {
  const search = route.useSearch()
  const navigate = route.useNavigate()
  const group: Group = search.group ?? 'agency'

  const { data } = useQuery({
    queryKey: ['admin-report-sales-summary', 'totals', search, group],
    queryFn: async () =>
      (
        await reportService.salesSummary({
          ...search,
          group,
          current: 1,
          pageSize: 10_000,
        })
      ).body?.items ?? [],
  })
  // a total per currency: amounts of different currencies do not add up
  const totals = Object.values(
    (data ?? []).reduce<Record<string, SalesSummaryRow>>((all, r) => {
      const t = all[r.currency]
      all[r.currency] = t
        ? {
            ...t,
            tickets: t.tickets + r.tickets,
            fare_total: t.fare_total + r.fare_total,
            tax_total: t.tax_total + r.tax_total,
            total: t.total + r.total,
          }
        : r
      return all
    }, {})
  )

  return (
    <ResourcePage<SalesSummaryRow>
      title='Sales summary'
      description="Issued tickets of the airline's scheduled flights by the booking date, charter flights left out"
      queryKey='admin-report-sales-summary'
      list={reportService.salesSummary}
      params={{ group }}
      search={search}
      navigate={navigate as unknown as NavigateFn}
      searchPlaceholder={GROUPS[group]}
      exportFileName={`sales-summary-${group}.xlsx`}
      defaultPageSize={50}
      columns={[
        col<SalesSummaryRow>('key', GROUPS[group], (r) => (
          <span className='font-medium'>{r.key}</span>
        )),
        col<SalesSummaryRow>('tickets', 'Tickets', (r) => mono(r.tickets)),
        col<SalesSummaryRow>('fare_total', 'Fare', (r) => money(r.fare_total)),
        col<SalesSummaryRow>('tax_total', 'Tax', (r) => money(r.tax_total)),
        col<SalesSummaryRow>('total', 'Total', (r) => money(r.total)),
        col<SalesSummaryRow>('currency', 'Currency', (r) => mono(r.currency)),
      ]}
      toolbarExtra={
        <>
          <Tabs
            value={group}
            onValueChange={(v) =>
              navigate({
                search: (s) => ({ ...s, page: 1, group: v as Group }),
              })
            }
          >
            <TabsList className='h-8'>
              {(Object.keys(GROUPS) as Group[]).map((g) => (
                <TabsTrigger key={g} value={g} className='text-xs'>
                  {GROUPS[g]}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <DateRangeFilter
            search={search}
            navigate={navigate as unknown as NavigateFn}
          />
        </>
      }
      afterTable={
        totals.length > 0 && (
          <div className='bg-card mt-3 grid gap-2 rounded-md border p-4'>
            {totals.map((t) => (
              <p key={t.currency} className='flex flex-wrap gap-8 text-sm'>
                <b>Нийт {t.currency}</b>
                <span>
                  Тийз: <b className='font-mono'>{t.tickets}</b>
                </span>
                <span>Тариф: {money(t.fare_total)}</span>
                <span>Татвар: {money(t.tax_total)}</span>
                <span>Дүн: {money(t.total)}</span>
              </p>
            ))}
          </div>
        )
      }
    />
  )
}
