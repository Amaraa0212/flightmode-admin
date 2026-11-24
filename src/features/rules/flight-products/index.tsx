import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  airportOptions,
  flightProductService,
  serviceTemplateService,
  type FlightProducts as Row,
} from '@/services'
import { Loader2, PackagePlus, Pencil, Search } from 'lucide-react'
import { toast } from 'sonner'
import { originOf } from '@/lib/airport-zones'
import { useOptions } from '@/hooks/use-options'
import { AirportTime } from '@/components/airport-time'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { SimpleSelect } from '@/components/simple-select'
import { ProductsDialog } from './components/products-dialog'

const QUERY_KEY = 'admin-flight-products'
// Radix Select has no empty value
const ANY = 'any'

const isoDate = (days: number) =>
  new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10)
const minutes = (m: number) => (m >= 60 ? `${m / 60}h` : `${m}m`)

type Criteria = { origin: string; destination: string; from: string; to: string }

/**
 * Shop items (legacy flow): enter the route and dates, search, tick the flights in the list and apply a template
 * to all of them; a flight's own products are edited from its row.
 */
export function FlightProducts() {
  const queryClient = useQueryClient()
  const airports = useOptions('airports', airportOptions)
  const [form, setForm] = useState<Criteria>({ origin: ANY, destination: ANY, from: isoDate(0), to: isoDate(30) })
  // the search that produced the list (null: not searched yet)
  const [criteria, setCriteria] = useState<Criteria | null>(null)
  const [picked, setPicked] = useState<number[]>([])
  const [templateId, setTemplateId] = useState<string>()
  const [editing, setEditing] = useState<Row | null>(null)

  const { data: flights = [], isFetching } = useQuery({
    queryKey: [QUERY_KEY, criteria],
    queryFn: () =>
      flightProductService.search({
        origin: criteria!.origin === ANY ? undefined : criteria!.origin,
        destination: criteria!.destination === ANY ? undefined : criteria!.destination,
        from: criteria!.from,
        to: criteria!.to,
      }),
    enabled: !!criteria,
  })
  const { data: templates = [] } = useQuery({
    queryKey: ['admin-template-options'],
    queryFn: async () => (await serviceTemplateService.options()).body ?? [],
  })

  const apply = useMutation({
    mutationFn: () => serviceTemplateService.apply(Number(templateId), picked),
    onSuccess: (res) => {
      toast.success(res.message)
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] })
      setPicked([])
    },
    onError: (error: Error) => toast.error(error.message),
  })

  const search = () => {
    if (form.from > form.to) return toast.error('The "from" date is after the "to" date.')
    setPicked([])
    setCriteria({ ...form })
  }
  const allPicked = flights.length > 0 && flights.every((f) => picked.includes(f.flight_id))
  const toggle = (id: number, on: boolean) =>
    setPicked((p) => (on ? [...p, id] : p.filter((x) => x !== id)))
  const set = (k: keyof Criteria) => (v: string) => setForm((f) => ({ ...f, [k]: v }))
  const airportItems = [{ label: 'Any', value: ANY }, ...airports]

  return (
    <div className='space-y-4 p-4 sm:p-6'>
      <div>
        <h1 className='text-xl font-semibold'>Shop items</h1>
        <p className='text-muted-foreground text-sm'>
          Enter the route and dates and search, tick the flights and apply a template — or edit one flight's baggage,
          paid seats and zone profile from its row.
        </p>
      </div>

      {/* 1. route + dates */}
      <form
        className='bg-card/40 grid gap-3 rounded-xl border p-4 sm:grid-cols-[1fr_1fr_160px_160px_auto] sm:items-end'
        onSubmit={(e) => {
          e.preventDefault()
          search()
        }}
      >
        <div className='grid gap-1.5'>
          <Label>From (origin)</Label>
          <SimpleSelect value={form.origin} onValueChange={set('origin')} items={airportItems} />
        </div>
        <div className='grid gap-1.5'>
          <Label>To (destination)</Label>
          <SimpleSelect value={form.destination} onValueChange={set('destination')} items={airportItems} />
        </div>
        <div className='grid gap-1.5'>
          <Label>Departure from</Label>
          <Input type='date' value={form.from} onChange={(e) => set('from')(e.target.value)} />
        </div>
        <div className='grid gap-1.5'>
          <Label>Departure to</Label>
          <Input type='date' value={form.to} onChange={(e) => set('to')(e.target.value)} />
        </div>
        <Button type='submit' className='gap-1.5' disabled={isFetching}>
          {isFetching ? <Loader2 className='size-4 animate-spin' /> : <Search className='size-4' />}
          Search
        </Button>
      </form>

      {criteria && (
        <>
          {/* 3. template for the ticked flights */}
          <div className='bg-card/40 flex flex-wrap items-center gap-3 rounded-xl border p-3'>
            <span className='text-sm'>
              <b>{picked.length}</b> / {flights.length} flight(s) selected
            </span>
            <div className='ms-auto flex flex-wrap items-center gap-2'>
              <SimpleSelect
                value={templateId}
                onValueChange={setTemplateId}
                items={templates}
                placeholder='Select template'
                className='w-64'
              />
              <Button
                className='gap-1.5'
                disabled={!templateId || picked.length === 0 || apply.isPending}
                onClick={() => apply.mutate()}
                title='Replaces the baggage and seat rules, the online check-in window and, for an aircraft template, the seat profile'
              >
                {apply.isPending ? <Loader2 className='size-4 animate-spin' /> : <PackagePlus className='size-4' />}
                Apply template
              </Button>
            </div>
          </div>

          {/* 2. flights found */}
          <div className='overflow-x-auto rounded-xl border'>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className='w-10'>
                    <Checkbox
                      checked={allPicked}
                      disabled={!flights.length}
                      onCheckedChange={(v) => setPicked(v === true ? flights.map((f) => f.flight_id) : [])}
                      aria-label='Select all flights'
                    />
                  </TableHead>
                  <TableHead>Flight no</TableHead>
                  <TableHead>Dep datetime</TableHead>
                  <TableHead>Route</TableHead>
                  <TableHead>Baggages</TableHead>
                  <TableHead>Seats</TableHead>
                  <TableHead>Zone name</TableHead>
                  <TableHead>OCI open / close</TableHead>
                  <TableHead>Blocked</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {flights.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className='text-muted-foreground h-20 text-center'>
                      {isFetching ? 'Searching…' : 'No open flights on this route and dates.'}
                    </TableCell>
                  </TableRow>
                ) : (
                  flights.map((r) => (
                    <TableRow key={r.flight_id} data-state={picked.includes(r.flight_id) ? 'selected' : undefined}>
                      <TableCell>
                        <Checkbox
                          checked={picked.includes(r.flight_id)}
                          onCheckedChange={(v) => toggle(r.flight_id, v === true)}
                          aria-label={`Select ${r.flight_number}`}
                        />
                      </TableCell>
                      <TableCell className='font-mono font-semibold text-sky-400'>{r.flight_number}</TableCell>
                      <TableCell>
                        <AirportTime at={r.departure_at} airport={originOf(r.route)} />
                      </TableCell>
                      <TableCell>{r.route}</TableCell>
                      <TableCell className='text-muted-foreground'>{r.baggage_rules.join(', ') || '-'}</TableCell>
                      <TableCell className='font-mono'>{r.seat_prices} rule(s)</TableCell>
                      <TableCell className='text-muted-foreground'>{r.seat_profile ?? '-'}</TableCell>
                      <TableCell className='font-mono'>
                        {r.online_checkin.enabled
                          ? `${minutes(r.online_checkin.opens_minutes)} / ${minutes(r.online_checkin.closes_minutes)}`
                          : 'Off'}
                      </TableCell>
                      <TableCell className='font-mono'>{r.blocked_seats}</TableCell>
                      <TableCell>
                        <Button variant='outline' size='sm' className='h-7 gap-1.5 text-xs' onClick={() => setEditing(r)}>
                          <Pencil className='size-3.5' />
                          Edit
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </>
      )}

      {editing && <ProductsDialog flight={editing} queryKey={QUERY_KEY} onClose={() => setEditing(null)} />}
    </div>
  )
}
