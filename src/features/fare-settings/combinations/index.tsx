import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  fareClassService,
  fareCombinationService,
  type FareClass,
  type FareCombination,
} from '@/services'
import { Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Main } from '@/components/layout/main'
import { PageHeader } from '@/components/page-header'
import {
  DeleteDialog,
  EmptyRow,
  Panel,
  RowActions,
  useFareMutation,
} from '../shared'

/** Pair key, same either way round */
const pairKey = (a: number, b: number) => (a < b ? `${a}-${b}` : `${b}-${a}`)

export function FareCombinations() {
  const [fromId, setFromId] = useState<number | null>(null)
  const [toIds, setToIds] = useState<Set<number>>(new Set())
  const [leftQuery, setLeftQuery] = useState('')
  const [rightQuery, setRightQuery] = useState('')
  const [removal, setRemoval] = useState<FareCombination | null>(null)

  const { data: bases = [], isLoading } = useQuery({
    queryKey: ['fare-settings', 'fare-classes', 'all'],
    queryFn: async () =>
      ((await fareClassService.all()).body.items ?? []).sort((a, b) =>
        a.booking_code.localeCompare(b.booking_code)
      ),
  })
  const { data: combinations = [] } = useQuery({
    queryKey: ['fare-settings', 'fare-combinations'],
    queryFn: async () => (await fareCombinationService.all()).body.items ?? [],
  })

  const saved = useMemo(
    () =>
      new Set(
        combinations.map((c) =>
          pairKey(c.fare_class_id, c.combinable_fare_class_id)
        )
      ),
    [combinations]
  )
  const from = bases.find((b) => b.id === fromId)

  const add = useFareMutation(
    () =>
      fareCombinationService.create({
        fare_class_id: fromId!,
        combinable_fare_class_ids: [...toIds],
      }),
    () => setToIds(new Set())
  )
  const remove = useFareMutation(
    (c: FareCombination) => fareCombinationService.remove(c.id),
    () => setRemoval(null)
  )

  const pickFrom = (id: number) => {
    setFromId(id === fromId ? null : id)
    setToIds(new Set())
  }
  const toggleTo = (id: number) =>
    setToIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const rows = from
    ? combinations.filter(
        (c) =>
          c.fare_class_id === from.id || c.combinable_fare_class_id === from.id
      )
    : combinations

  return (
    <Main className='flex flex-1 flex-col gap-4 sm:gap-6'>
      <PageHeader
        title='Combination Fare'
        description='Fare bases that may be sold together on one itinerary (e.g. outbound + return). Pick a fare base on the left, check the ones it combines with on the right, then Add.'
      />

      <div className='grid gap-4 lg:grid-cols-2'>
        <Panel
          title='Fare Base'
          subtitle={from ? `${from.booking_code} selected` : 'Check one'}
          bodyClassName='max-h-[22rem] overflow-y-auto'
          actions={
            <Input
              value={leftQuery}
              onChange={(e) => setLeftQuery(e.target.value)}
              placeholder='Search'
              className='h-8 w-40'
            />
          }
        >
          <BaseTable
            bases={filter(bases, leftQuery)}
            isLoading={isLoading}
            checked={(b) => b.id === fromId}
            onToggle={(b) => pickFrom(b.id)}
          />
        </Panel>

        <Panel
          title='Combinable Fare Base'
          subtitle={
            from
              ? `${toIds.size} checked to combine with ${from.booking_code}`
              : 'Check a fare base on the left first'
          }
          bodyClassName='max-h-[22rem] overflow-y-auto'
          actions={
            <>
              <Input
                value={rightQuery}
                onChange={(e) => setRightQuery(e.target.value)}
                placeholder='Search'
                className='h-8 w-40'
                disabled={!from}
              />
              <Button
                size='sm'
                className='h-8 gap-2'
                disabled={!from || !toIds.size || add.isPending}
                onClick={() => add.mutate(undefined)}
              >
                <Plus className='size-4' />
                Add
              </Button>
            </>
          }
        >
          {from ? (
            <BaseTable
              bases={filter(
                bases.filter((b) => b.id !== from.id),
                rightQuery
              )}
              checked={(b) =>
                toIds.has(b.id) || saved.has(pairKey(from.id, b.id))
              }
              disabled={(b) => saved.has(pairKey(from.id, b.id))}
              onToggle={(b) => toggleTo(b.id)}
            />
          ) : (
            <p className='text-muted-foreground p-8 text-center text-sm'>
              No fare base selected
            </p>
          )}
        </Panel>
      </div>

      <Panel
        title='Combinations'
        subtitle={
          from
            ? `${rows.length} with ${from.booking_code} (${combinations.length} total)`
            : `${combinations.length} total`
        }
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fare base</TableHead>
              <TableHead>Booking class</TableHead>
              <TableHead />
              <TableHead>Combines with</TableHead>
              <TableHead>Booking class</TableHead>
              <TableHead>User</TableHead>
              <TableHead className='text-end'>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((c) => (
              <TableRow key={c.id}>
                <TableCell className='text-brand font-mono font-semibold'>
                  {c.fare_class.booking_code}
                </TableCell>
                <TableCell className='font-mono'>
                  {c.fare_class.rbd_code ?? '-'} · {c.fare_class.trip_type}
                </TableCell>
                <TableCell className='text-muted-foreground'>↔</TableCell>
                <TableCell className='text-brand font-mono font-semibold'>
                  {c.combinable_fare_class.booking_code}
                </TableCell>
                <TableCell className='font-mono'>
                  {c.combinable_fare_class.rbd_code ?? '-'} ·{' '}
                  {c.combinable_fare_class.trip_type}
                </TableCell>
                <TableCell className='text-muted-foreground text-xs'>
                  {c.created_by ?? '-'}
                </TableCell>
                <TableCell>
                  <RowActions onDelete={() => setRemoval(c)} />
                </TableCell>
              </TableRow>
            ))}
            {!rows.length && (
              <EmptyRow colSpan={7}>No combination yet</EmptyRow>
            )}
          </TableBody>
        </Table>
      </Panel>

      {removal && (
        <DeleteDialog
          label={`combination ${removal.fare_class.booking_code} ↔ ${removal.combinable_fare_class.booking_code}`}
          isLoading={remove.isPending}
          onConfirm={() => remove.mutate(removal)}
          onClose={() => setRemoval(null)}
        />
      )}
    </Main>
  )
}

function filter(bases: FareClass[], query: string) {
  const q = query.trim().toUpperCase()
  return q
    ? bases.filter(
        (b) =>
          b.booking_code.includes(q) || b.rbd_code?.toUpperCase().includes(q)
      )
    : bases
}

function BaseTable({
  bases,
  isLoading,
  checked,
  disabled,
  onToggle,
}: {
  bases: FareClass[]
  isLoading?: boolean
  checked: (b: FareClass) => boolean
  disabled?: (b: FareClass) => boolean
  onToggle: (b: FareClass) => void
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className='w-10' />
          <TableHead>Fare base</TableHead>
          <TableHead>Booking class</TableHead>
          <TableHead>Trip</TableHead>
          <TableHead>Description</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {bases.map((b) => {
          const off = disabled?.(b) ?? false
          return (
            <TableRow
              key={b.id}
              onClick={() => !off && onToggle(b)}
              className={cn(
                off ? 'opacity-60' : 'cursor-pointer',
                checked(b) && !off && 'bg-cyan-400/10 hover:bg-cyan-400/15'
              )}
            >
              <TableCell onClick={(e) => e.stopPropagation()}>
                <Checkbox
                  checked={checked(b)}
                  disabled={off}
                  onCheckedChange={() => onToggle(b)}
                  aria-label={b.booking_code}
                />
              </TableCell>
              <TableCell className='font-mono font-semibold'>
                {b.booking_code}
              </TableCell>
              <TableCell className='font-mono'>
                {b.rbd_code} · {b.cabin_class}
              </TableCell>
              <TableCell className='font-mono'>{b.trip_type}</TableCell>
              <TableCell className='text-muted-foreground max-w-0 truncate'>
                {b.description || '-'}
              </TableCell>
            </TableRow>
          )
        })}
        {!bases.length && (
          <EmptyRow colSpan={5}>
            {isLoading ? 'Loading…' : 'No fare base'}
          </EmptyRow>
        )}
      </TableBody>
    </Table>
  )
}
