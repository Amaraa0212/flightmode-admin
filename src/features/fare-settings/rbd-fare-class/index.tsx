import { Fragment, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getRouteApi } from '@tanstack/react-router'
import {
  fareClassService,
  rbdService,
  type FareClass,
  type FareDiscount,
  type Rbd,
} from '@/services'
import { ChevronDown, ChevronRight, Percent, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
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
import { ActiveBadge } from '@/components/status-badge'
import {
  byHierarchy,
  DeleteDialog,
  EmptyRow,
  Panel,
  RowActions,
  SCROLL_PANEL,
  useFareMutation,
  YN,
} from '../shared'
import { DiscountDialog } from './components/discount-dialog'
import { FareClassDialog } from './components/fare-class-dialog'
import { RbdDialog } from './components/rbd-dialog'

const route = getRouteApi('/_authenticated/fare-settings/rbd-fare-class/')

type Removal =
  | { kind: 'rbd'; row: Rbd }
  | { kind: 'class'; row: FareClass }
  | { kind: 'discount'; row: FareDiscount; fareClass: FareClass }

export function RbdFareClass() {
  const search = route.useSearch()
  const navigate = route.useNavigate()
  const selectedId = search.rbd

  const [rbdDialog, setRbdDialog] = useState<{ rbd?: Rbd } | null>(null)
  const [classDialog, setClassDialog] = useState<{
    fareClass?: FareClass
  } | null>(null)
  const [discountDialog, setDiscountDialog] = useState<{
    fareClass: FareClass
    discount?: FareDiscount
  } | null>(null)
  const [removal, setRemoval] = useState<Removal | null>(null)
  const [open, setOpen] = useState<Set<number>>(new Set())

  const { data: rbds = [], isLoading } = useQuery({
    queryKey: ['fare-settings', 'rbds'],
    queryFn: async () => (await rbdService.all()).body.items ?? [],
  })
  const { data: classes = [] } = useQuery({
    queryKey: ['fare-settings', 'fare-classes', selectedId],
    queryFn: async () =>
      (await fareClassService.all({ rbd_id: selectedId })).body.items ?? [],
    enabled: !!selectedId,
  })
  const tree = useMemo(() => byHierarchy(rbds), [rbds])
  const selected = rbds.find((r) => r.id === selectedId)

  const remove = useFareMutation(
    (r: Removal) =>
      r.kind === 'rbd'
        ? rbdService.remove(r.row.id)
        : r.kind === 'class'
          ? fareClassService.remove(r.row.id)
          : fareClassService.removeDiscount(r.fareClass.id, r.row.id),
    () => {
      if (removal?.kind === 'rbd' && removal.row.id === selectedId)
        navigate({ search: {} })
      setRemoval(null)
    }
  )

  const toggle = (id: number) =>
    setOpen((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const removalInfo = (() => {
    if (!removal) return null
    if (removal.kind === 'rbd')
      return {
        label: `RBD ${removal.row.code}`,
        blocked:
          (removal.row.fare_classes_count ?? 0) > 0 ||
          (removal.row.children_count ?? 0) > 0
            ? 'This RBD has fare classes or child RBDs. Set its status to inactive instead.'
            : undefined,
      }
    if (removal.kind === 'class')
      return {
        label: `fare class ${removal.row.booking_code}`,
        blocked:
          (removal.row.fares_count ?? 0) > 0
            ? 'This fare class is used by fares. Set its status to inactive instead.'
            : undefined,
      }
    return {
      label: `${removal.row.passenger_type} discount of ${removal.fareClass.booking_code}`,
    }
  })()

  return (
    <Main className='flex flex-1 flex-col gap-4 sm:gap-6'>
      <PageHeader
        title='RBD - Fare Class'
        description='Booking classes per cabin, their fare classes and the age discounts of each fare class'
      />

      {/* wide screens: RBD list | its fare classes, each scrolling on its own */}
      <div className='grid gap-4 xl:h-[calc(100svh-11rem)] xl:min-h-[28rem] xl:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]'>
        <Panel
          {...SCROLL_PANEL}
          title='RBD'
          subtitle={`${rbds.length} total`}
          actions={
            <Button
              size='sm'
              className='h-8 gap-2'
              onClick={() => setRbdDialog({})}
            >
              <Plus className='size-4' />
              Add RBD
            </Button>
          }
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead className='w-[35%]'>Description</TableHead>
                <TableHead>Parent</TableHead>
                <TableHead>Cabin</TableHead>
                <TableHead>Rank</TableHead>
                <TableHead>Fare classes</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className='text-end'>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tree.map((r) => (
                <TableRow
                  key={r.id}
                  onClick={() => navigate({ search: { rbd: r.id } })}
                  className={cn(
                    'cursor-pointer',
                    r.id === selectedId && 'bg-cyan-400/10 hover:bg-cyan-400/15'
                  )}
                >
                  <TableCell className='font-mono font-semibold'>
                    <span style={{ paddingInlineStart: r.level * 16 }}>
                      {r.level > 0 && (
                        <span className='text-muted-foreground me-1'>└</span>
                      )}
                      {r.code}
                    </span>
                  </TableCell>
                  <TableCell className='text-muted-foreground max-w-0 truncate'>
                    {r.description || '-'}
                  </TableCell>
                  <TableCell className='font-mono'>
                    {r.parent_code ?? '-'}
                  </TableCell>
                  <TableCell className='font-mono'>{r.cabin_class}</TableCell>
                  <TableCell className='font-mono'>{r.rank}</TableCell>
                  <TableCell className='font-mono'>
                    {r.fare_classes_count ?? 0}
                  </TableCell>
                  <TableCell className='text-muted-foreground text-xs'>
                    {r.created_by ?? '-'}
                  </TableCell>
                  <TableCell>
                    <ActiveBadge active={r.is_active} />
                  </TableCell>
                  <TableCell>
                    <RowActions
                      onEdit={() => setRbdDialog({ rbd: r })}
                      onDelete={() => setRemoval({ kind: 'rbd', row: r })}
                    >
                      <Button
                        variant={r.id === selectedId ? 'default' : 'outline'}
                        size='sm'
                        className='h-7 text-xs'
                        onClick={() => navigate({ search: { rbd: r.id } })}
                      >
                        Select
                      </Button>
                    </RowActions>
                  </TableCell>
                </TableRow>
              ))}
              {!tree.length && (
                <EmptyRow colSpan={9}>
                  {isLoading ? 'Loading…' : 'No RBD yet'}
                </EmptyRow>
              )}
            </TableBody>
          </Table>
        </Panel>

        <Panel
          {...SCROLL_PANEL}
          title='Fare Class'
          subtitle={
            selected
              ? `${selected.code} selected (${classes.length} total)`
              : 'Select an RBD'
          }
          actions={
            <Button
              size='sm'
              className='h-8 gap-2'
              disabled={!selected}
              onClick={() => setClassDialog({})}
            >
              <Plus className='size-4' />
              Add fare class
            </Button>
          }
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className='w-8' />
                <TableHead>Booking code</TableHead>
                <TableHead>Description</TableHead>
                <TableHead title='One way'>OW</TableHead>
                <TableHead title='Round trip'>RT</TableHead>
                <TableHead title='Confirmed'>HK</TableHead>
                <TableHead title='Stand-by'>SA</TableHead>
                <TableHead title='Waitlist'>HL</TableHead>
                <TableHead>Visible</TableHead>
                <TableHead>GRP</TableHead>
                <TableHead>GRP min</TableHead>
                <TableHead>GRP max</TableHead>
                <TableHead>Discounts</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className='text-end'>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {classes.map((c) => (
                <Fragment key={c.id}>
                  <TableRow
                    className='cursor-pointer'
                    onClick={() => toggle(c.id)}
                  >
                    <TableCell>
                      {open.has(c.id) ? (
                        <ChevronDown className='size-4' />
                      ) : (
                        <ChevronRight className='size-4' />
                      )}
                    </TableCell>
                    <TableCell className='text-brand font-mono font-semibold'>
                      {c.booking_code}
                    </TableCell>
                    <TableCell className='text-muted-foreground'>
                      {c.description || '-'}
                    </TableCell>
                    <TableCell>
                      <YN value={c.trip_type === 'OW'} />
                    </TableCell>
                    <TableCell>
                      <YN value={c.trip_type === 'RT'} />
                    </TableCell>
                    <TableCell>
                      <YN value={c.status === 'HK'} />
                    </TableCell>
                    <TableCell>
                      <YN value={c.status === 'SA'} />
                    </TableCell>
                    <TableCell>
                      <YN value={c.waitlist} />
                    </TableCell>
                    <TableCell>
                      <YN value={c.is_visible} />
                    </TableCell>
                    <TableCell>
                      <YN value={c.is_group} />
                    </TableCell>
                    <TableCell className='font-mono'>
                      {c.group_min ?? '-'}
                    </TableCell>
                    <TableCell className='font-mono'>
                      {c.group_max ?? '-'}
                    </TableCell>
                    <TableCell className='font-mono text-xs'>
                      {c.discounts
                        .map((d) => `${d.passenger_type} -${d.percentage}%`)
                        .join(' · ') || '-'}
                    </TableCell>
                    <TableCell>
                      <ActiveBadge active={c.is_active} />
                    </TableCell>
                    <TableCell>
                      <RowActions
                        onEdit={() => setClassDialog({ fareClass: c })}
                        onDelete={() => setRemoval({ kind: 'class', row: c })}
                      >
                        <Button
                          variant='outline'
                          size='sm'
                          className='h-7 gap-1 text-xs'
                          onClick={() => toggle(c.id)}
                        >
                          <Percent className='size-3.5' />
                          Fare discount
                        </Button>
                      </RowActions>
                    </TableCell>
                  </TableRow>
                  {open.has(c.id) && (
                    <TableRow className='hover:bg-transparent'>
                      <TableCell colSpan={15} className='bg-muted/30 p-3'>
                        <DiscountTable
                          fareClass={c}
                          onAdd={() => setDiscountDialog({ fareClass: c })}
                          onEdit={(d) =>
                            setDiscountDialog({ fareClass: c, discount: d })
                          }
                          onDelete={(d) =>
                            setRemoval({
                              kind: 'discount',
                              row: d,
                              fareClass: c,
                            })
                          }
                        />
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
              ))}
              {!classes.length && (
                <EmptyRow colSpan={15}>
                  {selected
                    ? 'No fare class for this RBD'
                    : 'Select an RBD to see its fare classes'}
                </EmptyRow>
              )}
            </TableBody>
          </Table>
        </Panel>
      </div>

      {rbdDialog && (
        <RbdDialog
          rbd={rbdDialog.rbd}
          rbds={rbds}
          onClose={() => setRbdDialog(null)}
        />
      )}
      {classDialog && (
        <FareClassDialog
          fareClass={classDialog.fareClass}
          rbds={rbds}
          rbdId={selectedId}
          onClose={() => setClassDialog(null)}
        />
      )}
      {discountDialog && (
        <DiscountDialog
          fareClass={discountDialog.fareClass}
          discount={discountDialog.discount}
          onClose={() => setDiscountDialog(null)}
        />
      )}
      {removal && removalInfo && (
        <DeleteDialog
          label={removalInfo.label}
          blocked={removalInfo.blocked}
          isLoading={remove.isPending}
          onConfirm={() => remove.mutate(removal)}
          onClose={() => setRemoval(null)}
        />
      )}
    </Main>
  )
}

function DiscountTable({
  fareClass,
  onAdd,
  onEdit,
  onDelete,
}: {
  fareClass: FareClass
  onAdd: () => void
  onEdit: (d: FareDiscount) => void
  onDelete: (d: FareDiscount) => void
}) {
  return (
    <div className='bg-background rounded-lg border'>
      <div className='flex items-center justify-between border-b px-3 py-2'>
        <div>
          <p className='text-sm font-semibold'>Fare Discount</p>
          <p className='text-muted-foreground text-xs'>
            {fareClass.booking_code} - age discounts
          </p>
        </div>
        <Button
          size='sm'
          className='h-7 gap-1 text-xs'
          disabled={fareClass.discounts.length >= 3}
          onClick={onAdd}
        >
          <Plus className='size-3.5' />
          Add fare discount
        </Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Passenger type</TableHead>
            <TableHead>Age</TableHead>
            <TableHead>Discount</TableHead>
            <TableHead className='text-end'>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {fareClass.discounts.map((d) => (
            <TableRow key={d.id}>
              <TableCell className='font-mono font-semibold'>
                {d.passenger_type}
              </TableCell>
              <TableCell className='font-mono'>
                {d.age_from ?? 0} – {d.age_to ?? '∞'}
              </TableCell>
              <TableCell className='font-mono'>{d.percentage}%</TableCell>
              <TableCell>
                <RowActions
                  onEdit={() => onEdit(d)}
                  onDelete={() => onDelete(d)}
                />
              </TableCell>
            </TableRow>
          ))}
          {!fareClass.discounts.length && (
            <EmptyRow colSpan={4}>
              No discount — every passenger pays the full fare
            </EmptyRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
}
