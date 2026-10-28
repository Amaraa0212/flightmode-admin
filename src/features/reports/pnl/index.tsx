import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getRouteApi } from '@tanstack/react-router'
import { flightPassengerService } from '@/services'
import {
  Copy,
  FileSpreadsheet,
  Loader2,
  MousePointerClick,
  Send,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { FlightPicker } from '@/components/flight-picker'
import { Main } from '@/components/layout/main'
import { PageHeader } from '@/components/page-header'
import { ReconciliationView } from './reconciliation'

const route = getRouteApi('/_authenticated/reports/pnl/')

/** PNL report: flown / no-show / go-show against the name list (default), and the PNL telex */
export function PnlReport() {
  const { flight, view = 'report' } = route.useSearch()
  const navigate = route.useNavigate()
  const [downloading, setDownloading] = useState(false)

  const { data: telex } = useQuery({
    queryKey: ['admin-pnl', flight],
    queryFn: async () => (await flightPassengerService.pnl(flight!)).body,
    enabled: !!flight && view === 'telex',
  })
  const report = useQuery({
    queryKey: ['admin-pnl-reconciliation', flight],
    queryFn: async () =>
      (await flightPassengerService.reconciliation(flight!)).body,
    enabled: !!flight && view === 'report',
  })

  const downloadExcel = async () => {
    if (!report.data) return
    setDownloading(true)
    try {
      const { flight_number, departure_at } = report.data.flight
      await flightPassengerService.downloadReconciliation(
        flight!,
        `${flight_number}-${departure_at.slice(0, 10).replace(/-/g, '')}-pnl-report.xlsx`
      )
    } catch (error) {
      toast.error((error as Error).message)
    } finally {
      setDownloading(false)
    }
  }

  return (
    <Main className='flex flex-1 flex-col gap-4 sm:gap-6'>
      <PageHeader
        title='PNL report'
        description='Name list against who flew — flown, no-show, go-show, offloaded — and the PNL telex'
        actions={
          <>
            <FlightPicker
              value={flight}
              onChange={(id) =>
                navigate({ search: (prev) => ({ ...prev, flight: id }) })
              }
            />
            <Tabs
              value={view}
              onValueChange={(v) =>
                navigate({
                  search: (prev) => ({
                    ...prev,
                    view: v === 'report' ? undefined : (v as 'telex'),
                  }),
                })
              }
            >
              <TabsList>
                <TabsTrigger value='report'>Flown / No-show</TabsTrigger>
                <TabsTrigger value='telex'>PNL telex</TabsTrigger>
              </TabsList>
            </Tabs>
            {view === 'report' ? (
              <Button
                variant='outline'
                size='sm'
                className='gap-2'
                disabled={!report.data || downloading}
                onClick={() => void downloadExcel()}
              >
                {downloading ? (
                  <Loader2 className='size-4 animate-spin' />
                ) : (
                  <FileSpreadsheet className='size-4' />
                )}
                Excel
              </Button>
            ) : (
              <>
                <Button
                  variant='outline'
                  size='sm'
                  className='gap-2'
                  disabled={!telex}
                  onClick={() => {
                    void navigator.clipboard.writeText(telex ?? '')
                    toast.success('PNL copied')
                  }}
                >
                  <Copy className='size-4' />
                  Copy
                </Button>
                <Button
                  size='sm'
                  className='gap-2'
                  disabled={!telex}
                  onClick={() =>
                    toast.success('PNL e-mailed to station (mock)')
                  }
                >
                  <Send className='size-4' />
                  Send
                </Button>
              </>
            )}
          </>
        }
      />
      {!flight ? (
        <div className='fm-panel text-muted-foreground flex flex-col items-center gap-3 py-20'>
          <MousePointerClick className='size-8' />
          Select a flight to see who flew and the PNL.
        </div>
      ) : view === 'telex' ? (
        telex && (
          <pre className='fm-panel overflow-auto p-5 font-mono text-xs leading-relaxed'>
            {telex}
          </pre>
        )
      ) : report.data ? (
        <ReconciliationView data={report.data} />
      ) : report.isError ? (
        <div className='fm-panel text-destructive py-10 text-center text-sm'>
          {(report.error as Error).message}
        </div>
      ) : (
        <div className='fm-panel text-muted-foreground flex justify-center py-20'>
          <Loader2 className='size-6 animate-spin' />
        </div>
      )}
    </Main>
  )
}
