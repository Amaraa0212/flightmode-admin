import type { InventoryFlight } from '@/services'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { EmptyRow } from '@/features/fare-settings/shared'

/** "2024-07-24 17:15" → ["24 Jul 2024", "17:15"] */
function splitLocal(value: string | null) {
  if (!value) return ['-', '']
  const [date, time] = value.split(' ')
  const d = new Date(`${date}T00:00:00`)
  return [
    d.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }),
    time,
  ]
}

export function FlightList({
  flights,
  selectedId,
  isLoading,
  onSelect,
}: {
  flights: InventoryFlight[]
  selectedId?: number
  isLoading: boolean
  onSelect: (id: number) => void
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Flight</TableHead>
          <TableHead>Departure</TableHead>
          <TableHead>Arrival</TableHead>
          <TableHead className='text-end' title='Aircraft seats / allocated'>
            Capacity
          </TableHead>
          <TableHead className='text-end'>Sold</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {flights.map((f) => {
          const [depDate, depTime] = splitLocal(f.departure_local)
          const [arrDate, arrTime] = splitLocal(f.scheduled_arrival_local)
          const selected = f.id === selectedId
          return (
            <TableRow
              key={f.id}
              onClick={() => onSelect(f.id)}
              aria-selected={selected}
              className={cn(
                'cursor-pointer',
                selected && 'bg-cyan-400/10 hover:bg-cyan-400/15'
              )}
            >
              <TableCell>
                <p className='font-mono font-semibold'>{f.flight_number}</p>
                {!f.inventory.is_controlled && (
                  <Badge variant='outline' className='mt-1 text-[10px]'>
                    No limits
                  </Badge>
                )}
              </TableCell>
              <TableCell className='font-mono text-xs whitespace-nowrap'>
                <p>{depDate}</p>
                <p className='text-muted-foreground'>
                  {depTime} {f.origin?.iata_code}
                </p>
              </TableCell>
              <TableCell className='font-mono text-xs whitespace-nowrap'>
                <p>{arrDate}</p>
                <p className='text-muted-foreground'>
                  {arrTime} {f.destination?.iata_code}
                </p>
              </TableCell>
              <TableCell className='text-end font-mono text-xs'>
                <p>{f.inventory.capacity || '-'}</p>
                <p className='text-muted-foreground'>
                  {f.inventory.allocated ?? '—'}
                </p>
              </TableCell>
              <TableCell className='text-end font-mono font-semibold'>
                {f.inventory.sold}
              </TableCell>
            </TableRow>
          )
        })}
        {!flights.length && (
          <EmptyRow colSpan={5}>
            {isLoading ? 'Loading…' : 'No flights in this period'}
          </EmptyRow>
        )}
      </TableBody>
    </Table>
  )
}
