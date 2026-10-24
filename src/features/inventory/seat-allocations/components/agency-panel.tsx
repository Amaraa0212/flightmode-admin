import { Fragment, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { inventoryAllocationService, type FlightInventory } from '@/services'
import { Plus } from 'lucide-react'
import { useCan } from '@/stores/auth-store'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DeleteDialog,
  EmptyRow,
  Panel,
  RowActions,
} from '@/features/fare-settings/shared'
import { AllocationDialog, useAllocationMutation } from './allocation-dialog'
import { AvailCell } from './shared'

/** ameliaRES middle table: seats blocked for agencies, edited here in a modal */
export function AgencyPanel({ data }: { data: FlightInventory }) {
  const canManage = useCan()('allocations.manage')
  const [editing, setEditing] = useState<{ id?: number } | null>(null)
  const [removing, setRemoving] = useState<number | null>(null)

  const remove = useAllocationMutation(
    (id: number) => inventoryAllocationService.remove(id),
    () => setRemoving(null)
  )

  const overAllocated = data.cabins.filter((c) => c.free_for_allocation < 0)
  const removingRow = data.agencies.find((a) => a.allocation_id === removing)
  const cabinCount = (id: number) =>
    data.agencies.filter((a) => a.allocation_id === id).length

  return (
    <Panel
      title='Agency allocations'
      subtitle={
        overAllocated.length ? (
          <span className='text-red-600 dark:text-red-400'>
            {overAllocated
              .map(
                (c) =>
                  `${c.cabin_class}: ${-c.free_for_allocation} seat(s) more than the cabin`
              )
              .join(' · ')}{' '}
            — lower the allocations.
          </span>
        ) : (
          'Unsold agency seats are held back from direct sale. Each class of service limits what can be given.'
        )
      }
      actions={
        <>
          <Button asChild size='sm' variant='ghost' className='h-8'>
            <Link to='/operations/allocations'>All allocations</Link>
          </Button>
          {canManage && (
            <Button
              size='sm'
              className='h-8 gap-2'
              disabled={!data.cabins.length}
              onClick={() => setEditing({})}
            >
              <Plus className='size-4' />
              Add allocation
            </Button>
          )}
        </>
      }
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>COS</TableHead>
            <TableHead>Agency</TableHead>
            <TableHead className='text-end'>Seats</TableHead>
            <TableHead className='text-end'>Sold</TableHead>
            <TableHead className='text-end'>Avail</TableHead>
            <TableHead>Deadline</TableHead>
            {canManage && <TableHead className='w-20' />}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.agencies.map((a, i) => {
            const first =
              data.agencies.findIndex(
                (x) => x.allocation_id === a.allocation_id
              ) === i
            return (
              <Fragment key={`${a.allocation_id}-${a.cabin_class}`}>
                <TableRow>
                  <TableCell className='font-mono font-semibold'>
                    {a.cabin_class}
                  </TableCell>
                  <TableCell>
                    {a.agency ?? `Agency ${a.agency_id}`}
                    {a.is_waitlist && (
                      <span className='text-muted-foreground ms-2 text-xs'>
                        waitlist
                      </span>
                    )}
                    {a.return_flight_id && (
                      <span className='text-muted-foreground ms-2 text-xs'>
                        round trip
                      </span>
                    )}
                  </TableCell>
                  <TableCell className='text-end font-mono'>
                    {a.seats}
                  </TableCell>
                  <TableCell className='text-end font-mono font-semibold'>
                    {a.sold}
                  </TableCell>
                  <TableCell className='text-end'>
                    <AvailCell value={a.available} />
                  </TableCell>
                  <TableCell className='text-muted-foreground font-mono text-xs'>
                    {a.deadline ?? '-'}
                  </TableCell>
                  {canManage && (
                    <TableCell>
                      {first && (
                        <RowActions
                          onEdit={() => setEditing({ id: a.allocation_id })}
                          onDelete={() => setRemoving(a.allocation_id)}
                        />
                      )}
                    </TableCell>
                  )}
                </TableRow>
              </Fragment>
            )
          })}
          {!data.agencies.length && (
            <EmptyRow colSpan={canManage ? 7 : 6}>
              No agency allocation on this flight
            </EmptyRow>
          )}
        </TableBody>
      </Table>

      {editing && (
        <AllocationDialog
          data={data}
          allocationId={editing.id}
          onClose={() => setEditing(null)}
        />
      )}
      {removingRow && (
        <DeleteDialog
          label={`allocation of ${removingRow.agency ?? 'the agency'}${
            cabinCount(removingRow.allocation_id) > 1 ? ' (all classes)' : ''
          }`}
          blocked={
            data.agencies
              .filter((x) => x.allocation_id === removingRow.allocation_id)
              .some((x) => x.sold > 0)
              ? 'This allocation has passengers. Cancel them first or lower the seats instead.'
              : undefined
          }
          isLoading={remove.isPending}
          onConfirm={() => remove.mutate(removingRow.allocation_id)}
          onClose={() => setRemoving(null)}
        />
      )}
    </Panel>
  )
}
