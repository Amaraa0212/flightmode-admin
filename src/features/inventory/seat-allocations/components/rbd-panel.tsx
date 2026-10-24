import { useState } from 'react'
import {
  inventoryService,
  type FlightInventory,
  type InventoryRbd,
  type RbdLimitPayload,
} from '@/services'
import { Eraser } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { EmptyRow, Panel } from '@/features/fare-settings/shared'
import { AvailCell, classCaps, SeatInput, useInventoryMutation } from './shared'

type Draft = Record<number, { seats: number | ''; is_closed: boolean }>

const draftOf = (rows: InventoryRbd[]): Draft =>
  Object.fromEntries(
    rows.map((r) => [
      r.rbd_id,
      { seats: r.seats ?? '', is_closed: r.is_closed },
    ])
  )

/**
 * ameliaRES bottom table: nested booking limit per RBD. "Seats" is the limit of this class and every class below it;
 * "Below" is what those classes sold together.
 */
export function RbdPanel({
  data,
  canManage,
}: {
  data: FlightInventory
  canManage: boolean
}) {
  const flightId = data.flight.id
  const initial = draftOf(data.rbds)
  const [draft, setDraft] = useState<Draft>(() => initial)
  const editable = canManage && data.is_controlled

  const changed = data.rbds.filter((r) => {
    const d = draft[r.rbd_id]
    return (
      d &&
      d.seats !== '' &&
      (d.seats !== initial[r.rbd_id].seats ||
        d.is_closed !== initial[r.rbd_id].is_closed)
    )
  })

  // a class may not go above its parent, a root not above its cabin (seats + oversell)
  const caps = classCaps(
    data.rbds.map((r) => ({ ...r, id: r.rbd_id })),
    (id) => draft[id]?.seats,
    (cabin) => {
      const c = data.cabins.find((x) => x.cabin_class === cabin)
      return c?.is_set ? (c.seats ?? 0) + c.oversell : (c?.aircraft_seats ?? 0)
    }
  )
  const invalid = data.rbds.filter((r) => {
    const seats = draft[r.rbd_id]?.seats
    return seats !== '' && seats !== undefined && seats > caps[r.rbd_id].cap
  })

  const save = useInventoryMutation(flightId, (rbds: RbdLimitPayload[]) =>
    inventoryService.saveRbds(flightId, rbds)
  )
  const clear = useInventoryMutation(flightId, (rbdId: number) =>
    inventoryService.removeRbd(flightId, rbdId)
  )

  const set = (id: number, patch: Partial<Draft[number]>) =>
    setDraft((d) => ({ ...d, [id]: { ...d[id], ...patch } }))

  const submit = () =>
    save.mutate(
      changed.map((r) => ({
        rbd_id: r.rbd_id,
        seats: Number(draft[r.rbd_id].seats),
        is_closed: draft[r.rbd_id].is_closed,
      }))
    )

  return (
    <Panel
      title='Booking codes'
      subtitle={
        !data.is_controlled ? (
          'No class limits on this flight: every class sells up to the cabin.'
        ) : invalid.length ? (
          <span className='text-red-600 dark:text-red-400'>
            {invalid.map((r) => r.code).join(', ')}: above{' '}
            {invalid.length > 1 ? 'their' : 'its'} parent / cabin — lower{' '}
            {invalid.length > 1 ? 'them' : 'it'} to save.
          </span>
        ) : (
          'Seats = nested limit of the class and every class below it, up to its parent and the cabin.'
        )
      }
      actions={
        editable &&
        changed.length > 0 && (
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
              disabled={save.isPending || invalid.length > 0}
              onClick={submit}
            >
              Save {changed.length} class{changed.length > 1 ? 'es' : ''}
            </Button>
          </>
        )
      }
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>COS</TableHead>
            <TableHead>BC</TableHead>
            <TableHead className='text-end'>Seats</TableHead>
            <TableHead className='text-end'>Avail</TableHead>
            <TableHead className='text-end'>Sold</TableHead>
            <TableHead
              className='text-end'
              title='Sold in this class and every class below it'
            >
              Below
            </TableHead>
            <TableHead>Closed</TableHead>
            <TableHead className='text-end'>Rank</TableHead>
            <TableHead>Parent</TableHead>
            {editable && <TableHead className='w-10' />}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.rbds.map((r) => {
            const d = draft[r.rbd_id]
            const closed = d?.is_closed ?? r.is_closed
            const isDirty = changed.some((c) => c.rbd_id === r.rbd_id)
            return (
              <TableRow
                key={r.rbd_id}
                className={cn(
                  isDirty && 'bg-amber-400/10',
                  !r.is_active && 'opacity-60'
                )}
              >
                <TableCell className='font-mono text-xs'>
                  {r.cabin_class}
                </TableCell>
                <TableCell
                  className={cn(
                    'font-mono font-semibold',
                    closed && 'text-red-600 line-through dark:text-red-400'
                  )}
                >
                  <span style={{ paddingInlineStart: r.level * 14 }}>
                    {r.level > 0 && (
                      <span className='text-muted-foreground me-1'>└</span>
                    )}
                    {r.code}
                  </span>
                </TableCell>
                <TableCell className='text-end'>
                  {editable ? (
                    <div className='flex justify-end'>
                      <SeatInput
                        label={`Seats of class ${r.code}`}
                        value={d?.seats}
                        placeholder='not set'
                        max={caps[r.rbd_id].cap}
                        invalid={invalid.includes(r)}
                        hint={`Max ${caps[r.rbd_id].cap} (${caps[r.rbd_id].by})`}
                        onChange={(v) => set(r.rbd_id, { seats: v })}
                      />
                    </div>
                  ) : (
                    <span className='font-mono'>{r.seats ?? '—'}</span>
                  )}
                </TableCell>
                <TableCell className='text-end'>
                  <AvailCell value={r.available} />
                </TableCell>
                <TableCell className='text-end font-mono'>{r.sold}</TableCell>
                <TableCell className='text-muted-foreground text-end font-mono'>
                  {r.subtree_sold}
                </TableCell>
                <TableCell>
                  {editable ? (
                    <Switch
                      aria-label={`Close class ${r.code}`}
                      checked={closed}
                      disabled={d?.seats === ''}
                      onCheckedChange={(v) => set(r.rbd_id, { is_closed: v })}
                    />
                  ) : (
                    <span className='font-mono text-xs'>
                      {closed ? 'Y' : 'N'}
                    </span>
                  )}
                </TableCell>
                <TableCell className='text-end font-mono'>{r.rank}</TableCell>
                <TableCell className='font-mono'>
                  {r.parent_code ?? ''}
                </TableCell>
                {editable && (
                  <TableCell>
                    {r.is_set && (
                      <Button
                        variant='ghost'
                        size='icon'
                        className='size-7'
                        aria-label={`Remove the limit of ${r.code}`}
                        title='Remove the limit (class stops selling)'
                        disabled={clear.isPending}
                        onClick={() => clear.mutate(r.rbd_id)}
                      >
                        <Eraser className='size-3.5' />
                      </Button>
                    )}
                  </TableCell>
                )}
              </TableRow>
            )
          })}
          {!data.rbds.length && (
            <EmptyRow colSpan={10}>
              No RBD for these cabins. Add them under Fare settings → RBD - Fare
              Class.
            </EmptyRow>
          )}
        </TableBody>
      </Table>
    </Panel>
  )
}
