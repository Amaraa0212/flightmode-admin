import { useQuery } from '@tanstack/react-query'
import { getRouteApi } from '@tanstack/react-router'
import { flightPassengerService } from '@/services'
import { Copy, MousePointerClick, Send } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { FlightPicker } from '@/components/flight-picker'
import { Main } from '@/components/layout/main'
import { PageHeader } from '@/components/page-header'

const route = getRouteApi('/_authenticated/reports/pnl/')

export function PnlReport() {
  const { flight } = route.useSearch()
  const navigate = route.useNavigate()
  const { data: telex } = useQuery({
    queryKey: ['admin-pnl', flight],
    queryFn: async () => (await flightPassengerService.pnl(flight!)).body,
    enabled: !!flight,
  })

  return (
    <Main className='flex flex-1 flex-col gap-4 sm:gap-6'>
      <PageHeader
        title='PNL report'
        description='Passenger name list telex for the destination station'
        actions={
          <>
            <FlightPicker
              value={flight}
              onChange={(id) => navigate({ search: { flight: id } })}
            />
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
              onClick={() => toast.success('PNL e-mailed to station (mock)')}
            >
              <Send className='size-4' />
              Send
            </Button>
          </>
        }
      />
      {telex ? (
        <pre className='fm-panel overflow-auto p-5 font-mono text-xs leading-relaxed'>
          {telex}
        </pre>
      ) : (
        <div className='fm-panel text-muted-foreground flex flex-col items-center gap-3 py-20'>
          <MousePointerClick className='size-8' />
          Select a flight to generate the PNL.
        </div>
      )}
    </Main>
  )
}
