import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getRouteApi } from '@tanstack/react-router'
import { inventoryService, type FlightInventory } from '@/services'
import {
  AlertTriangle,
  CopyPlus,
  FastForward,
  LayoutTemplate,
  Plane,
  RotateCcw,
  Search,
} from 'lucide-react'
import { useCan } from '@/stores/auth-store'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { Main } from '@/components/layout/main'
import { PageHeader } from '@/components/page-header'
import { Panel } from '@/features/fare-settings/shared'
import { AgencyPanel } from './components/agency-panel'
import { CabinPanel } from './components/cabin-panel'
import { FlightList } from './components/flight-list'
import {
  ApplyTemplateDialog,
  RollForwardDialog,
  SaveTemplateDialog,
} from './components/inventory-dialogs'
import { RbdPanel } from './components/rbd-panel'
import { inventoryKey, useInventoryMutation } from './components/shared'

const route = getRouteApi('/_authenticated/inventory/seat-allocations/')

const isoDate = (d: Date) => d.toISOString().slice(0, 10)
const plusDays = (days: number) => {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return isoDate(d)
}

type DialogState = 'roll' | 'apply' | 'save' | 'reset' | null

export function SeatAllocations() {
  const search = route.useSearch()
  const navigate = route.useNavigate()
  const can = useCan()
  const canManage = can('inventory.manage')

  const from = search.from ?? isoDate(new Date())
  const to = search.to ?? plusDays(7)
  const [filters, setFilters] = useState({
    from,
    to,
    flight_number: search.flight_number ?? '',
  })
  const [dialog, setDialog] = useState<DialogState>(null)

  const flights = useQuery({
    queryKey: ['inventory', 'flights', from, to, search.flight_number],
    queryFn: async () =>
      (
        await inventoryService.flights({
          from,
          to,
          flight_number: search.flight_number,
        })
      ).body,
  })
  const selectedId = search.flight
  const inventory = useQuery({
    queryKey: inventoryKey(selectedId),
    queryFn: async () => (await inventoryService.get(selectedId!)).body,
    enabled: !!selectedId,
  })

  const lookUp = (e: React.FormEvent) => {
    e.preventDefault()
    navigate({
      search: {
        from: filters.from || undefined,
        to: filters.to || undefined,
        flight_number: filters.flight_number.trim().toUpperCase() || undefined,
        flight: undefined,
      },
    })
  }

  const listed = flights.data ?? []
  const data = inventory.data

  return (
    <Main className='flex flex-1 flex-col gap-4 sm:gap-6'>
      <PageHeader
        title='Seat allocations'
        description='Seats per cabin and nested booking class limits of each flight'
      />

      <form
        onSubmit={lookUp}
        className='fm-panel flex flex-wrap items-end gap-3 px-4 py-3'
      >
        <div className='grid gap-1.5'>
          <Label htmlFor='inv-from'>From</Label>
          <Input
            id='inv-from'
            type='date'
            className='w-40'
            value={filters.from}
            onChange={(e) =>
              setFilters((f) => ({ ...f, from: e.target.value }))
            }
          />
        </div>
        <div className='grid gap-1.5'>
          <Label htmlFor='inv-to'>To</Label>
          <Input
            id='inv-to'
            type='date'
            className='w-40'
            min={filters.from}
            value={filters.to}
            onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value }))}
          />
        </div>
        <div className='grid gap-1.5'>
          <Label htmlFor='inv-number'>Flight number</Label>
          <Input
            id='inv-number'
            className='w-36 font-mono uppercase'
            placeholder='MG714'
            value={filters.flight_number}
            onChange={(e) =>
              setFilters((f) => ({ ...f, flight_number: e.target.value }))
            }
          />
        </div>
        <Button type='submit' size='sm' className='h-8 gap-2'>
          <Search className='size-4' />
          Look up
        </Button>
      </form>

      <div className='grid items-start gap-4 sm:gap-6 xl:grid-cols-[minmax(340px,400px)_1fr]'>
        <Panel
          title='Flights'
          subtitle={`${listed.length} in the period`}
          actions={
            canManage && (
              <Button
                size='sm'
                variant='outline'
                className='h-8 gap-2'
                disabled={!listed.length}
                onClick={() => setDialog('apply')}
              >
                <LayoutTemplate className='size-4' />
                Apply template
              </Button>
            )
          }
        >
          <FlightList
            flights={listed}
            selectedId={selectedId}
            isLoading={flights.isLoading}
            onSelect={(id) =>
              navigate({ search: (prev) => ({ ...prev, flight: id }) })
            }
          />
        </Panel>

        <div className='flex min-w-0 flex-col gap-4 sm:gap-6'>
          {!selectedId && (
            <div className='fm-panel text-muted-foreground flex flex-col items-center gap-2 px-4 py-16 text-center text-sm'>
              <Plane className='size-6' />
              Select a flight to see its seat allocation
            </div>
          )}
          {selectedId && inventory.isLoading && (
            <div className='fm-panel text-muted-foreground px-4 py-16 text-center text-sm'>
              Loading…
            </div>
          )}
          {selectedId && inventory.isError && (
            <Alert variant='destructive'>
              <AlertTitle>Could not load the inventory</AlertTitle>
              <AlertDescription>{inventory.error.message}</AlertDescription>
            </Alert>
          )}
          {data && (
            <FlightInventoryView
              key={inventory.dataUpdatedAt}
              data={data}
              canManage={canManage}
              onDialog={setDialog}
            />
          )}
        </div>
      </div>

      {dialog === 'roll' && data && (
        <RollForwardDialog
          flightId={data.flight.id}
          flightNumber={data.flight.flight_number}
          departureDate={(data.flight.scheduled_departure_local ?? '').slice(
            0,
            10
          )}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog === 'apply' && (
        <ApplyTemplateDialog
          flightId={selectedId}
          listedFlightIds={listed.map((f) => f.id)}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog === 'save' && data && (
        <SaveTemplateDialog
          flightId={data.flight.id}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog === 'reset' && data && (
        <ResetDialog
          flightId={data.flight.id}
          onClose={() => setDialog(null)}
        />
      )}
    </Main>
  )
}

function FlightInventoryView({
  data,
  canManage,
  onDialog,
}: {
  data: FlightInventory
  canManage: boolean
  onDialog: (d: DialogState) => void
}) {
  const f = data.flight
  const initialize = useInventoryMutation(f.id, () =>
    inventoryService.initialize(f.id)
  )

  return (
    <>
      <div className='fm-panel flex flex-wrap items-center justify-between gap-3 px-4 py-3'>
        <div>
          <p className='font-mono text-base font-semibold'>
            {f.flight_number}{' '}
            <span className='text-muted-foreground font-normal'>
              {f.origin?.iata_code} → {f.destination?.iata_code}
            </span>
          </p>
          <p className='text-muted-foreground text-xs'>
            {f.scheduled_departure_local} – {f.scheduled_arrival_local} ·{' '}
            {f.aircraft
              ? `${f.aircraft.registration} (${f.aircraft.type}, ${f.aircraft.total_seats} seats)`
              : 'no aircraft'}
          </p>
        </div>
        {canManage && data.is_controlled && (
          <div className='flex flex-wrap gap-2'>
            <Button
              size='sm'
              variant='outline'
              className='h-8 gap-2'
              onClick={() => onDialog('roll')}
            >
              <FastForward className='size-4' />
              Roll forward
            </Button>
            <Button
              size='sm'
              variant='outline'
              className='h-8 gap-2'
              onClick={() => onDialog('save')}
            >
              <CopyPlus className='size-4' />
              Save as template
            </Button>
            <Button
              size='sm'
              variant='ghost'
              className='h-8 gap-2 text-red-600 dark:text-red-400'
              onClick={() => onDialog('reset')}
            >
              <RotateCcw className='size-4' />
              Remove limits
            </Button>
          </div>
        )}
      </div>

      {!data.is_controlled && (
        <Alert>
          <AlertTriangle />
          <AlertTitle>This flight sells without class limits</AlertTitle>
          <AlertDescription>
            <p>
              Bookings are only limited by the cabin and the agency allocations.
              Create an inventory to set seats per cabin and nested limits per
              booking class.
            </p>
            {canManage && (
              <div className='mt-2 flex flex-wrap gap-2'>
                <Button
                  size='sm'
                  className='h-8'
                  disabled={initialize.isPending}
                  onClick={() => initialize.mutate(undefined)}
                >
                  Create from aircraft cabins
                </Button>
                <Button
                  size='sm'
                  variant='outline'
                  className='h-8'
                  onClick={() => onDialog('apply')}
                >
                  From a template…
                </Button>
              </div>
            )}
          </AlertDescription>
        </Alert>
      )}

      {data.warnings.length > 0 && (
        <Alert className='border-amber-500/40 text-amber-700 dark:text-amber-400'>
          <AlertTriangle />
          <AlertTitle>Limits below what is already sold</AlertTitle>
          <AlertDescription>
            <ul className='list-disc ps-4'>
              {data.warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      <CabinPanel data={data} canManage={canManage} />
      <AgencyPanel data={data} />
      <RbdPanel data={data} canManage={canManage} />
    </>
  )
}

function ResetDialog({
  flightId,
  onClose,
}: {
  flightId: number
  onClose: () => void
}) {
  const reset = useInventoryMutation(
    flightId,
    () => inventoryService.reset(flightId),
    onClose
  )

  return (
    <ConfirmDialog
      open
      onOpenChange={(open) => !open && onClose()}
      title='Remove the seat inventory?'
      desc='Cabin seats and every class limit of this flight are deleted. The flight sells without class limits again.'
      confirmText='Remove'
      destructive
      isLoading={reset.isPending}
      handleConfirm={() => reset.mutate(undefined)}
    />
  )
}
