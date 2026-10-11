import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { flightPassengerService, type FlightPassengerRow } from '@/services'
import { SEGMENT_STATUS } from '@/constants/status'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { StatusChip } from '@/components/status-chip'

/** Compact passenger list of one flight (flight load drawer, manifest) */
export function FlightPassengersTable({
  flightId,
  rows: givenRows,
}: {
  flightId: number
  rows?: FlightPassengerRow[]
}) {
  const [query, setQuery] = useState('')
  const { data, isLoading } = useQuery({
    queryKey: ['admin-flight-passengers', flightId, query],
    queryFn: async () =>
      (await flightPassengerService.list(flightId, { query, pageSize: 1000 }))
        .body?.items ?? [],
    enabled: !givenRows,
  })
  const rows = givenRows ?? data ?? []

  return (
    <div className='space-y-3'>
      {!givenRows && (
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder='Search PNR, name, document or seat'
          className='h-9'
        />
      )}
      {isLoading ? (
        <Skeleton className='h-64' />
      ) : (
        <div className='overflow-hidden rounded-lg border'>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>№</TableHead>
                <TableHead>PNR</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Seat</TableHead>
                <TableHead>Doc</TableHead>
                <TableHead>SSR</TableHead>
                <TableHead>Bags</TableHead>
                <TableHead>Agent</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((p, i) => (
                <TableRow key={p.id}>
                  <TableCell className='font-mono text-xs'>{i + 1}</TableCell>
                  <TableCell className='text-brand font-mono text-xs'>
                    {p.pnr}
                  </TableCell>
                  <TableCell className='font-medium text-nowrap'>
                    {p.last_name}/{p.first_name}
                  </TableCell>
                  <TableCell className='text-xs'>{p.type}</TableCell>
                  <TableCell className='font-mono text-xs'>
                    {p.seat_number ?? '-'}
                  </TableCell>
                  <TableCell className='font-mono text-xs'>
                    {p.document_number}
                  </TableCell>
                  <TableCell className='font-mono text-xs'>
                    {p.ssr_codes.join(', ') || '-'}
                  </TableCell>
                  <TableCell className='font-mono text-xs'>
                    {p.bags ? `${p.bags}/${p.bag_weight_kg}` : '-'}
                  </TableCell>
                  <TableCell className='text-muted-foreground text-xs'>
                    {p.agency ?? 'Direct'}
                  </TableCell>
                  <TableCell>
                    <StatusChip value={p.status} map={SEGMENT_STATUS} />
                  </TableCell>
                </TableRow>
              ))}
              {!rows.length && (
                <TableRow>
                  <TableCell
                    colSpan={10}
                    className='text-muted-foreground h-20 text-center'
                  >
                    No passengers
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
