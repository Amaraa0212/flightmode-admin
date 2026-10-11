import { useQuery } from '@tanstack/react-query'
import { getRouteApi } from '@tanstack/react-router'
import { flightPassengerService } from '@/services'
import { FileSpreadsheet, MousePointerClick, Printer } from 'lucide-react'
import * as XLSX from 'xlsx'
import { formatDate } from '@/lib/utils'
import { FLIGHT_STATUS } from '@/constants/status'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { FlightPassengersTable } from '@/components/flight-passengers-table'
import { FlightPicker } from '@/components/flight-picker'
import { Main } from '@/components/layout/main'
import { PageHeader } from '@/components/page-header'
import { StatusChip } from '@/components/status-chip'

const route = getRouteApi('/_authenticated/dcs/manifest/')

export function Manifest() {
  const { flight } = route.useSearch()
  const navigate = route.useNavigate()

  const { data } = useQuery({
    queryKey: ['admin-manifest', flight],
    queryFn: async () => (await flightPassengerService.manifest(flight!)).body,
    enabled: !!flight,
  })

  const exportXlsx = () => {
    if (!data) return
    const sheet = XLSX.utils.json_to_sheet(
      data.passengers.map((p, i) => ({
        No: i + 1,
        Name: `${p.last_name}/${p.first_name}`,
        Gender: p.gender,
        Nationality: p.nationality,
        DOB: p.date_of_birth,
        Seat: p.seat_number,
        Bags: p.bags,
        KG: p.bag_weight_kg,
        SSR: p.ssr_codes.join(' '),
        PNR: p.pnr,
      }))
    )
    const book = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(book, sheet, 'Manifest')
    XLSX.writeFile(book, `${data.flight.flight_number}-manifest.xlsx`)
  }

  const totals = data?.zones.reduce(
    (t, z) => ({
      male: t.male + z.male,
      female: t.female + z.female,
      children: t.children + z.children,
      total: t.total + z.total,
      bags: t.bags + z.bags,
      kg: t.kg + z.kg,
    }),
    { male: 0, female: 0, children: 0, total: 0, bags: 0, kg: 0 }
  )

  return (
    <Main className='flex flex-1 flex-col gap-4 sm:gap-6'>
      <PageHeader
        title='Manifest'
        description='Checked-in passengers, zone load and baggage of a flight'
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
              disabled={!data}
              onClick={exportXlsx}
            >
              <FileSpreadsheet className='size-4' />
              Excel
            </Button>
            <Button
              variant='outline'
              size='sm'
              className='gap-2'
              disabled={!data}
              onClick={() => window.print()}
            >
              <Printer className='size-4' />
              Print
            </Button>
          </>
        }
      />

      {!flight || !data ? (
        <div className='fm-panel text-muted-foreground flex flex-col items-center gap-3 py-20'>
          <MousePointerClick className='size-8' />
          Select a flight to build the manifest.
        </div>
      ) : (
        <>
          <div className='fm-panel flex flex-wrap items-center gap-6 p-4'>
            <div>
              <p className='text-brand font-mono text-xl font-bold'>
                {data.flight.flight_number}
              </p>
              <p className='text-muted-foreground text-xs'>
                {data.flight.airline.name}
              </p>
            </div>
            <p className='text-lg font-semibold'>
              {data.flight.origin.iata_code} →{' '}
              {data.flight.destination.iata_code}
            </p>
            <p className='font-mono text-sm'>
              {formatDate(
                data.flight.scheduled_departure_at,
                'YYYY-MM-DD HH:mm'
              )}{' '}
              UTC
            </p>
            <p className='font-mono text-sm'>
              {data.flight.aircraft?.registration} ·{' '}
              {data.flight.aircraft?.type}
            </p>
            <StatusChip
              value={data.flight.status}
              map={FLIGHT_STATUS}
              size='md'
            />
          </div>

          <div className='grid grid-cols-[360px_minmax(0,1fr)] items-start gap-4'>
            <div className='fm-panel overflow-hidden'>
              <p className='fm-label border-b px-4 py-3'>Zone load</p>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Zone</TableHead>
                    <TableHead>M</TableHead>
                    <TableHead>F</TableHead>
                    <TableHead>CHD</TableHead>
                    <TableHead>PAX</TableHead>
                    <TableHead>Bags</TableHead>
                    <TableHead>KG</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.zones.map((z) => (
                    <TableRow key={z.zone}>
                      <TableCell className='text-brand font-mono font-semibold'>
                        {z.zone}
                      </TableCell>
                      <TableCell className='font-mono'>{z.male}</TableCell>
                      <TableCell className='font-mono'>{z.female}</TableCell>
                      <TableCell className='font-mono'>{z.children}</TableCell>
                      <TableCell className='font-mono'>{z.total}</TableCell>
                      <TableCell className='font-mono'>{z.bags}</TableCell>
                      <TableCell className='font-mono'>{z.kg}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                {totals && (
                  <TableFooter>
                    <TableRow>
                      <TableCell>Total</TableCell>
                      <TableCell className='font-mono'>{totals.male}</TableCell>
                      <TableCell className='font-mono'>
                        {totals.female}
                      </TableCell>
                      <TableCell className='font-mono'>
                        {totals.children}
                      </TableCell>
                      <TableCell className='font-mono'>
                        {totals.total}
                      </TableCell>
                      <TableCell className='font-mono'>{totals.bags}</TableCell>
                      <TableCell className='font-mono'>{totals.kg}</TableCell>
                    </TableRow>
                  </TableFooter>
                )}
              </Table>
            </div>
            <div className='fm-panel p-4'>
              <FlightPassengersTable flightId={flight} rows={data.passengers} />
            </div>
          </div>
        </>
      )}
    </Main>
  )
}
