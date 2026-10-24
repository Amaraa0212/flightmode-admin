import { useState } from 'react'
import {
  inventoryService,
  type CabinLimitPayload,
  type FlightInventory,
} from '@/services'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { EmptyRow, Panel } from '@/features/fare-settings/shared'
import {
  AvailCell,
  CABIN_NAMES,
  SeatInput,
  useInventoryMutation,
} from './shared'

type Draft = Record<
  string,
  { seats: number | ''; oversell: number | ''; curtail: number | '' }
>

const draftOf = (data: FlightInventory): Draft =>
  Object.fromEntries(
    data.cabins.map((c) => [
      c.cabin_class,
      {
        seats: c.seats ?? '',
        oversell: c.oversell,
        curtail: c.curtail,
      },
    ])
  )

/** ameliaRES top table: seats per class of service, with oversell / curtail */
export function CabinPanel({
  data,
  canManage,
}: {
  data: FlightInventory
  canManage: boolean
}) {
  const flightId = data.flight.id
  const [draft, setDraft] = useState<Draft>(() => draftOf(data))
  const initial = draftOf(data)
  const dirty = JSON.stringify(draft) !== JSON.stringify(initial)
  const editable = canManage && data.is_controlled

  const save = useInventoryMutation(flightId, (cabins: CabinLimitPayload[]) =>
    inventoryService.saveCabins(flightId, cabins)
  )

  const set = (cabin: string, field: keyof Draft[string], value: number | '') =>
    setDraft((d) => ({ ...d, [cabin]: { ...d[cabin], [field]: value } }))

  const submit = () =>
    save.mutate(
      Object.entries(draft)
        .filter(([, v]) => v.seats !== '')
        .map(([cabin, v]) => ({
          cabin_class: cabin as CabinLimitPayload['cabin_class'],
          seats: Number(v.seats),
          oversell: Number(v.oversell || 0),
          curtail: Number(v.curtail || 0),
        }))
    )

  return (
    <Panel
      title='Class of service'
      subtitle='Seats sold per cabin. Oversell sells above the seats, curtail takes seats out of sale.'
      actions={
        editable &&
        dirty && (
          <>
            <Button
              size='sm'
              variant='outline'
              className='h-8'
              onClick={() => setDraft(initial)}
            >
              Undo
            </Button>
            <Button
              size='sm'
              className='h-8'
              disabled={save.isPending}
              onClick={submit}
            >
              Save cabins
            </Button>
          </>
        )
      }
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>COS</TableHead>
            <TableHead className='text-end'>Aircraft</TableHead>
            <TableHead className='text-end'>Seats</TableHead>
            <TableHead className='text-end'>Oversell</TableHead>
            <TableHead className='text-end'>Curtail</TableHead>
            <TableHead className='text-end'>Sold</TableHead>
            <TableHead className='text-end'>Infants</TableHead>
            <TableHead
              className='text-end'
              title='Agency allocation seats not sold yet'
            >
              Agency
            </TableHead>
            <TableHead className='text-end'>Avail</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.cabins.map((c) => {
            const row = draft[c.cabin_class]
            return (
              <TableRow key={c.cabin_class}>
                <TableCell>
                  <span className='font-mono font-semibold'>
                    {c.cabin_class}
                  </span>{' '}
                  <span className='text-muted-foreground text-xs'>
                    {CABIN_NAMES[c.cabin_class]}
                  </span>
                </TableCell>
                <TableCell className='text-muted-foreground text-end font-mono'>
                  {c.aircraft_seats || '-'}
                </TableCell>
                {(['seats', 'oversell', 'curtail'] as const).map((field) => (
                  <TableCell key={field} className='text-end'>
                    {editable ? (
                      <div className='flex justify-end'>
                        <SeatInput
                          label={`${c.cabin_class} ${field}`}
                          value={row?.[field]}
                          onChange={(v) => set(c.cabin_class, field, v)}
                        />
                      </div>
                    ) : (
                      <span className='font-mono'>
                        {field === 'seats' ? (c.seats ?? '—') : c[field]}
                      </span>
                    )}
                  </TableCell>
                ))}
                <TableCell className='text-end font-mono font-semibold'>
                  {c.sold}
                </TableCell>
                <TableCell className='text-end font-mono'>
                  {c.infants}
                </TableCell>
                <TableCell className='text-end font-mono'>
                  {c.agency_unsold}
                </TableCell>
                <TableCell className='text-end'>
                  <AvailCell value={c.available} />
                </TableCell>
              </TableRow>
            )
          })}
          {!data.cabins.length && (
            <EmptyRow colSpan={9}>
              The flight has no aircraft with cabins
            </EmptyRow>
          )}
        </TableBody>
      </Table>
    </Panel>
  )
}
