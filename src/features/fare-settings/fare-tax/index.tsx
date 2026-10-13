import { Fragment, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getRouteApi } from '@tanstack/react-router'
import {
  airportOptions,
  fareEntryService,
  fareTaxService,
  type FareEntry,
  type FareTax,
} from '@/services'
import { ChevronDown, ChevronRight, Plus, Receipt } from 'lucide-react'
import { useOptions } from '@/hooks/use-options'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
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
import { SimpleSelect } from '@/components/simple-select'
import { ActiveBadge } from '@/components/status-badge'
import {
  DeleteDialog,
  EmptyRow,
  money,
  Panel,
  RowActions,
  useFareMutation,
  YN,
} from '../shared'
import { FareDialog } from './components/fare-dialog'
import { TaxDialog } from './components/tax-dialog'

const route = getRouteApi('/_authenticated/fare-settings/fare-tax/')

type Removal = { kind: 'fare'; row: FareEntry } | { kind: 'tax'; row: FareTax }

export function FareFareTax() {
  const search = route.useSearch()
  const navigate = route.useNavigate()
  const airports = useOptions('airports', airportOptions)

  // the form values; the tables follow the URL (set by Search)
  const [from, setFrom] = useState(search.from ? String(search.from) : '')
  const [to, setTo] = useState(search.to ? String(search.to) : '')
  const routeSet = !!search.from && !!search.to
  const label = (id?: number) =>
    airports.find((a) => a.value === String(id))?.label.split(' — ')[0] ?? '…'

  const [fareDialog, setFareDialog] = useState<{ fare?: FareEntry } | null>(
    null
  )
  const [taxDialog, setTaxDialog] = useState<{
    tax?: FareTax
    fare?: FareEntry
  } | null>(null)
  const [removal, setRemoval] = useState<Removal | null>(null)
  const [open, setOpen] = useState<number | null>(null)

  const { data: fares = [], isLoading } = useQuery({
    queryKey: ['fare-settings', 'fares', search.from, search.to],
    queryFn: async () =>
      (
        await fareEntryService.forRoute({
          with_fare_class: 1,
          origin_airport_id: search.from,
          destination_airport_id: search.to,
        })
      ).body.items ?? [],
  })
  const { data: taxes = [] } = useQuery({
    queryKey: ['fare-settings', 'fare-taxes', search.from, search.to],
    queryFn: async () =>
      (
        await fareTaxService.all({
          origin_airport_id: search.from,
          destination_airport_id: search.to,
        })
      ).body.items ?? [],
    enabled: routeSet,
  })

  const remove = useFareMutation(
    (r: Removal) =>
      r.kind === 'fare'
        ? fareEntryService.remove(r.row.id)
        : fareTaxService.remove(r.row.id),
    () => setRemoval(null)
  )

  const routeAirports = airports.filter(
    (a) => a.value === String(search.from) || a.value === String(search.to)
  )

  return (
    <Main className='flex flex-1 flex-col gap-4 sm:gap-6'>
      <PageHeader
        title='Fare + Fare Tax'
        description='Fares of each fare class per route, and the airport taxes charged on them'
      />

      <div className='fm-panel flex flex-wrap items-end gap-3 p-4'>
        <div className='grid min-w-56 flex-1 gap-1.5'>
          <Label>From</Label>
          <SimpleSelect
            value={from}
            onValueChange={setFrom}
            items={airports}
            placeholder='-- Select from route --'
          />
        </div>
        <div className='grid min-w-56 flex-1 gap-1.5'>
          <Label>To</Label>
          <SimpleSelect
            value={to}
            onValueChange={setTo}
            items={airports}
            placeholder='-- Select to route --'
          />
        </div>
        <div className='flex gap-2'>
          <Button
            disabled={!from || !to}
            onClick={() =>
              navigate({ search: { from: Number(from), to: Number(to) } })
            }
          >
            Search
          </Button>
          <Button
            variant='outline'
            onClick={() => {
              setFrom('')
              setTo('')
              navigate({ search: {} })
            }}
          >
            Clear
          </Button>
        </div>
      </div>

      <Panel
        title='Fare'
        subtitle={
          routeSet
            ? `${label(search.from)} → ${label(search.to)} · ${fares.length} fares`
            : `All routes · ${fares.length} fares`
        }
        actions={
          <Button
            size='sm'
            className='h-8 gap-2'
            onClick={() => setFareDialog({})}
          >
            <Plus className='size-4' />
            Add fare
          </Button>
        }
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className='w-8' />
              <TableHead>ID</TableHead>
              <TableHead>Fare class</TableHead>
              <TableHead>RBD</TableHead>
              <TableHead>Route</TableHead>
              <TableHead className='text-end'>Amount</TableHead>
              <TableHead className='text-end'>Tax (ADT)</TableHead>
              <TableHead className='text-end'>Total</TableHead>
              <TableHead>Valid date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className='text-end'>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {fares.map((f) => (
              <Fragment key={f.id}>
                <TableRow
                  className='cursor-pointer'
                  onClick={() => setOpen(open === f.id ? null : f.id)}
                >
                  <TableCell>
                    {open === f.id ? (
                      <ChevronDown className='size-4' />
                    ) : (
                      <ChevronRight className='size-4' />
                    )}
                  </TableCell>
                  <TableCell className='text-muted-foreground font-mono text-xs'>
                    {f.id}
                  </TableCell>
                  <TableCell className='text-brand font-mono font-semibold'>
                    {f.booking_code ?? '-'}
                  </TableCell>
                  <TableCell className='font-mono'>
                    {f.fare_class} · {f.cabin_class}
                  </TableCell>
                  <TableCell className='font-mono'>
                    {f.origin} - {f.destination}
                  </TableCell>
                  <TableCell className='text-end font-mono'>
                    {money(f.base_amount, f.currency)}
                  </TableCell>
                  <TableCell className='text-end font-mono'>
                    {money(f.tax_amount, f.currency)}
                  </TableCell>
                  <TableCell className='text-end font-mono font-semibold'>
                    {money(f.total_amount, f.currency)}
                  </TableCell>
                  <TableCell className='font-mono text-xs'>
                    {f.valid_from} ~ {f.valid_to}
                  </TableCell>
                  <TableCell>
                    <ActiveBadge active={f.is_active} />
                  </TableCell>
                  <TableCell>
                    <RowActions
                      onEdit={() => setFareDialog({ fare: f })}
                      onDelete={() => setRemoval({ kind: 'fare', row: f })}
                    >
                      <Button
                        variant='outline'
                        size='sm'
                        className='h-7 gap-1 text-xs'
                        onClick={() => setOpen(open === f.id ? null : f.id)}
                      >
                        <Receipt className='size-3.5' />
                        Tax override
                      </Button>
                    </RowActions>
                  </TableCell>
                </TableRow>
                {open === f.id && (
                  <TableRow className='hover:bg-transparent'>
                    <TableCell colSpan={11} className='bg-muted/30 p-3'>
                      <OverrideTable
                        fare={f}
                        onAdd={() => setTaxDialog({ fare: f })}
                        onEdit={(t) => setTaxDialog({ tax: t, fare: f })}
                        onDelete={(t) => setRemoval({ kind: 'tax', row: t })}
                      />
                    </TableCell>
                  </TableRow>
                )}
              </Fragment>
            ))}
            {!fares.length && (
              <EmptyRow colSpan={11}>
                {isLoading ? 'Loading…' : 'No fare data'}
              </EmptyRow>
            )}
          </TableBody>
        </Table>
      </Panel>

      <Panel
        title='Fare Tax'
        subtitle={
          routeSet
            ? `${label(search.from)} → ${label(search.to)} selected`
            : 'Select From + To route and press Search'
        }
        actions={
          <Button
            size='sm'
            className='h-8 gap-2'
            disabled={!routeSet}
            onClick={() => setTaxDialog({})}
          >
            <Plus className='size-4' />
            Add fare tax
          </Button>
        }
      >
        <TaxTable
          taxes={taxes}
          empty={
            routeSet
              ? 'No fare tax for this route'
              : 'Select From + To and search'
          }
          onEdit={(t) => setTaxDialog({ tax: t })}
          onDelete={(t) => setRemoval({ kind: 'tax', row: t })}
        />
      </Panel>

      {fareDialog && (
        <FareDialog
          fare={fareDialog.fare}
          from={search.from}
          to={search.to}
          onClose={() => setFareDialog(null)}
        />
      )}
      {taxDialog && (
        <TaxDialog
          tax={taxDialog.tax}
          fare={taxDialog.fare}
          airports={routeAirports}
          onClose={() => setTaxDialog(null)}
        />
      )}
      {removal && (
        <DeleteDialog
          label={
            removal.kind === 'fare'
              ? `fare #${removal.row.id}`
              : `tax ${removal.row.tax_code} (${removal.row.passenger_type})`
          }
          isLoading={remove.isPending}
          onConfirm={() => remove.mutate(removal)}
          onClose={() => setRemoval(null)}
        />
      )}
    </Main>
  )
}

function TaxTable({
  taxes,
  empty,
  showRoute = true,
  onEdit,
  onDelete,
}: {
  taxes: FareTax[]
  empty: string
  showRoute?: boolean
  onEdit: (t: FareTax) => void
  onDelete: (t: FareTax) => void
}) {
  const cols = showRoute ? 8 : 6
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>ID</TableHead>
          <TableHead>Tax code</TableHead>
          {showRoute && <TableHead>Route</TableHead>}
          {showRoute && <TableHead>In / Out bound</TableHead>}
          <TableHead>Type</TableHead>
          <TableHead className='text-end'>Amount</TableHead>
          <TableHead>Refundable</TableHead>
          <TableHead className='text-end'>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {taxes.map((t) => (
          <TableRow key={t.id}>
            <TableCell className='text-muted-foreground font-mono text-xs'>
              {t.id}
            </TableCell>
            <TableCell className='font-mono font-semibold'>
              {t.tax_code}
            </TableCell>
            {showRoute && (
              <TableCell className='font-mono'>{t.airport ?? '-'}</TableCell>
            )}
            {showRoute && (
              <TableCell className='font-mono text-xs'>
                {t.bound === 'OUT' ? 'OUT (departure)' : 'IN (arrival)'}
              </TableCell>
            )}
            <TableCell className='font-mono'>{t.passenger_type}</TableCell>
            <TableCell className='text-end font-mono'>
              {money(t.amount, t.currency)}
            </TableCell>
            <TableCell>
              <YN value={t.refundable} />
            </TableCell>
            <TableCell>
              <RowActions
                onEdit={() => onEdit(t)}
                onDelete={() => onDelete(t)}
              />
            </TableCell>
          </TableRow>
        ))}
        {!taxes.length && <EmptyRow colSpan={cols}>{empty}</EmptyRow>}
      </TableBody>
    </Table>
  )
}

function OverrideTable({
  fare,
  onAdd,
  onEdit,
  onDelete,
}: {
  fare: FareEntry
  onAdd: () => void
  onEdit: (t: FareTax) => void
  onDelete: (t: FareTax) => void
}) {
  const { data: taxes = [] } = useQuery({
    queryKey: ['fare-settings', 'fare-taxes', 'fare', fare.id],
    queryFn: async () =>
      (await fareTaxService.all({ fare_id: fare.id })).body.items ?? [],
  })

  return (
    <div className='bg-background rounded-lg border'>
      <div className='flex items-center justify-between border-b px-3 py-2'>
        <div>
          <p className='text-sm font-semibold'>Tax override</p>
          <p className='text-muted-foreground text-xs'>
            {fare.booking_code} {fare.origin}-{fare.destination} · replaces the
            route default of the same tax code
          </p>
        </div>
        <Button size='sm' className='h-7 gap-1 text-xs' onClick={onAdd}>
          <Plus className='size-3.5' />
          Add override
        </Button>
      </div>
      <TaxTable
        taxes={taxes}
        showRoute={false}
        empty='No override — route default taxes apply'
        onEdit={onEdit}
        onDelete={onDelete}
      />
    </div>
  )
}
