import { useState } from 'react'
import { addDays, format, parse } from 'date-fns'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  aircraftOptions,
  airlineOptions,
  airportOptions,
  flightService,
  type Flight,
} from '@/services'
import { Sparkles, TriangleAlert } from 'lucide-react'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth-store'
import {
  arrivalFromMinutes,
  arrivalFromTime,
  dayMark,
  hhmmToMinutes,
  localToUtc,
  minutesToHhmm,
  utcLabel,
} from '@/lib/airport-time'
import { useOptions } from '@/hooks/use-options'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { BaseDialog } from '@/components/ui/base-dialog'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ANNOUNCEMENTS_KEY } from '@/components/announcements'
import { SimpleSelect } from '@/components/simple-select'

const TYPES = [
  { label: 'Scheduled (хуваарьт)', value: 'scheduled' },
  { label: 'Charter (захиалгат)', value: 'charter' },
]

type Form = {
  airline_id: string
  flight_number: string
  service_type: 'scheduled' | 'charter'
  no_baggage_rule: boolean
  excess_price: string
  excess_max: string
  aircraft_id: string
  origin_airport_id: string
  destination_airport_id: string
  /** HH:MM, local to the origin */
  departure_time: string
  /** HH:MM, local to the destination */
  arrival_time: string
  /** HH:MM of flight */
  block_time: string
  terminal: string
  gate: string
}

const EMPTY: Form = {
  airline_id: '',
  flight_number: '',
  service_type: 'scheduled',
  no_baggage_rule: false,
  excess_price: '',
  excess_max: '',
  aircraft_id: '',
  origin_airport_id: '',
  destination_airport_id: '',
  departure_time: '',
  arrival_time: '',
  block_time: '',
  terminal: 'T1',
  gate: '',
}

const fromFlight = (f: Flight): Form => ({
  airline_id: '',
  flight_number: f.flight_number,
  service_type: f.service_type ?? 'scheduled',
  no_baggage_rule: !!f.no_baggage_rule,
  excess_price: f.excess_baggage_price_per_kg
    ? String(Number(f.excess_baggage_price_per_kg))
    : '',
  excess_max: f.excess_baggage_max_kg
    ? String(Number(f.excess_baggage_max_kg))
    : '',
  aircraft_id: String(f.aircraft?.id ?? ''),
  origin_airport_id: String(f.origin.id),
  destination_airport_id: String(f.destination.id),
  departure_time: f.scheduled_departure_local?.slice(11, 16) ?? '',
  arrival_time: f.scheduled_arrival_local?.slice(11, 16) ?? '',
  block_time: minutesToHhmm(
    Math.round(
      (new Date(f.scheduled_arrival_at).getTime() -
        new Date(f.scheduled_departure_at).getTime()) /
        60_000
    )
  ),
  terminal: f.terminal ?? '',
  gate: f.gate ?? '',
})

/**
 * One form for a flight, new or edited: number, aircraft, route, departure and arrival in each airport's local time.
 * The duration follows from the airports' UTC offsets, and typing a duration moves the arrival.
 * New: any number of days on the calendar; typing a known flight number fills the rest from its latest flight.
 */
export function NewFlightsDialog({
  flight,
  onClose,
}: {
  /** edit this flight (one day) instead of creating new ones */
  flight?: Flight
  onClose: () => void
}) {
  const queryClient = useQueryClient()
  const isSystemAdmin = useAuthStore((s) => !!s.auth.user?.is_system_admin)
  const aircraft = useOptions('aircraft', aircraftOptions)
  const airports = useOptions('airports', airportOptions)
  const timezoneOf = (id: string) =>
    airports.find((a) => a.value === id)?.timezone
  const airlines = useOptions('airlines', airlineOptions)

  const [form, setForm] = useState<Form>(flight ? fromFlight(flight) : EMPTY)
  const [dates, setDates] = useState<Date[]>(
    flight?.scheduled_departure_local
      ? [
          parse(
            flight.scheduled_departure_local.slice(0, 10),
            'yyyy-MM-dd',
            new Date()
          ),
        ]
      : []
  )
  const [another, setAnother] = useState(false)
  const [filledFrom, setFilledFrom] = useState<string | null>(null)
  const sorted = [...dates].sort((a, b) => a.getTime() - b.getTime())
  const weeklyFrom = sorted[0]
  // the first chosen day: what the UTC offsets and the +1 mark are read on
  const firstDate = format(weeklyFrom ?? new Date(), 'yyyy-MM-dd')

  /** Departure, arrival and duration move together once both airports are known */
  const clockOf = (f: Form) => {
    const originTimezone = timezoneOf(f.origin_airport_id)
    const destinationTimezone = timezoneOf(f.destination_airport_id)
    return originTimezone && destinationTimezone && f.departure_time
      ? {
          date: firstDate,
          departureTime: f.departure_time,
          originTimezone,
          destinationTimezone,
        }
      : null
  }
  const withDuration = (f: Form): Form => {
    const clock = clockOf(f)
    const arrival =
      clock && f.arrival_time ? arrivalFromTime(clock, f.arrival_time) : null
    return arrival ? { ...f, block_time: minutesToHhmm(arrival.minutes) } : f
  }
  const set = (patch: Partial<Form>) =>
    setForm((f) => withDuration({ ...f, ...patch }))
  const setDuration = (block_time: string) =>
    setForm((f) => {
      const clock = clockOf(f)
      const minutes = hhmmToMinutes(block_time)
      return clock && minutes > 0
        ? {
            ...f,
            block_time,
            arrival_time: arrivalFromMinutes(clock, minutes).time,
          }
        : { ...f, block_time }
    })

  // a known flight number: aircraft, route and times from its latest flight
  const fillFromLatest = async () => {
    const number = form.flight_number.trim()
    if (number.length < 3) return
    try {
      const latest = (await flightService.latest(number)).body
      if (!latest) {
        setFilledFrom(null)
        return
      }
      setForm((f) => ({
        ...f,
        service_type: latest.service_type,
        no_baggage_rule: !!latest.no_baggage_rule,
        aircraft_id: String(latest.aircraft_id),
        origin_airport_id: String(latest.origin_airport_id),
        destination_airport_id: String(latest.destination_airport_id),
        departure_time: latest.departure_time,
        arrival_time: latest.arrival_time,
        block_time: minutesToHhmm(latest.block_minutes),
        terminal: latest.terminal ?? f.terminal,
      }))
      setFilledFrom(latest.last_date.slice(0, 10))
    } catch {
      setFilledFrom(null)
    }
  }

  const clock = clockOf(form)
  const arrival =
    clock && form.arrival_time
      ? arrivalFromTime(clock, form.arrival_time)
      : null
  const originTimezone = timezoneOf(form.origin_airport_id)
  const destinationTimezone = timezoneOf(form.destination_airport_id)
  const iata = (id: string) => airports.find((a) => a.value === id)?.iata_code

  const ready =
    form.flight_number.trim() &&
    form.aircraft_id &&
    form.origin_airport_id &&
    form.destination_airport_id &&
    form.origin_airport_id !== form.destination_airport_id &&
    form.departure_time &&
    form.arrival_time &&
    !!arrival &&
    arrival.minutes >= 10 &&
    dates.length > 0

  const baggage = {
    no_baggage_rule: form.service_type === 'charter' && form.no_baggage_rule,
    excess_baggage_price_per_kg: Number(form.excess_price) || null,
    excess_baggage_max_kg: Number(form.excess_max) || null,
  }

  // editing: a new time or aircraft type asks whether to notify before saving
  const [asking, setAsking] = useState(false)
  const aircraftType = (id: string) =>
    aircraft.find((a) => a.value === id)?.label.split(' · ')[1]
  const typeChanged =
    !!flight &&
    aircraftType(String(flight.aircraft?.id ?? '')) !==
      aircraftType(form.aircraft_id)
  const timeChanged =
    !!flight &&
    (form.departure_time !== flight.scheduled_departure_local?.slice(11, 16) ||
      form.arrival_time !== flight.scheduled_arrival_local?.slice(11, 16) ||
      firstDate !== flight.scheduled_departure_local?.slice(0, 10))

  const save = useMutation<{ message: string }, Error, boolean>({
    mutationFn: (notify) =>
      flight
        ? flightService.update(flight.id, {
            notify_change: notify,
            flight_number: form.flight_number,
            service_type: form.service_type,
            ...baggage,
            aircraft_id: form.aircraft_id,
            origin_airport_id: form.origin_airport_id,
            destination_airport_id: form.destination_airport_id,
            scheduled_departure_at: new Date(
              localToUtc(firstDate, form.departure_time, originTimezone!)
            ).toISOString(),
            scheduled_arrival_at: new Date(arrival!.arrivalUtc).toISOString(),
            terminal: form.terminal,
            gate: form.gate,
          })
        : flightService.createMany({
            airline_id: form.airline_id ? Number(form.airline_id) : undefined,
            aircraft_id: Number(form.aircraft_id),
            flight_number: form.flight_number,
            origin_airport_id: Number(form.origin_airport_id),
            destination_airport_id: Number(form.destination_airport_id),
            service_type: form.service_type,
            ...baggage,
            departure_time: form.departure_time,
            arrival_time: form.arrival_time,
            terminal: form.terminal || undefined,
            gate: form.gate || undefined,
            dates: sorted.map((d) => format(d, 'yyyy-MM-dd')),
          }),
    onSuccess: (res) => {
      toast.success(res.message)
      queryClient.invalidateQueries({ queryKey: ['admin-flights'] })
      queryClient.invalidateQueries({ queryKey: ['options'] })
      queryClient.invalidateQueries({ queryKey: ANNOUNCEMENTS_KEY })
      if (another && !flight) {
        // the next flight: often the return leg — swap the route, keep the days
        setForm((f) => ({
          ...EMPTY,
          airline_id: f.airline_id,
          aircraft_id: f.aircraft_id,
          service_type: f.service_type,
          no_baggage_rule: f.no_baggage_rule,
          excess_price: f.excess_price,
          excess_max: f.excess_max,
          origin_airport_id: f.destination_airport_id,
          destination_airport_id: f.origin_airport_id,
          terminal: f.terminal,
        }))
        setFilledFrom(null)
      } else {
        onClose()
      }
    },
    onError: (error: Error) => toast.error(error.message),
  })

  return (
    <BaseDialog
      open
      onOpenChange={(open) => !open && onClose()}
      title={flight ? `Edit flight ${flight.flight_number}` : 'New flights'}
      description={
        flight
          ? 'Times are local to each airport.'
          : 'Fill the flight once and pick its days. Times are local to each airport.'
      }
      maxWidth='4xl'
      submitButton={{
        text: flight
          ? 'Save'
          : dates.length > 1
            ? `Create ${dates.length} flights`
            : 'Create flight',
        onClick: () =>
          timeChanged || typeChanged ? setAsking(true) : save.mutate(false),
        loading: save.isPending,
        disabled: !ready,
      }}
    >
      <div className='grid gap-6 md:grid-cols-[minmax(0,1fr)_auto]'>
        <div className='grid content-start gap-3'>
          <div className='grid grid-cols-2 gap-3'>
            <div className='grid gap-1.5'>
              <Label htmlFor='nf-number'>Flight number</Label>
              <Input
                id='nf-number'
                value={form.flight_number}
                placeholder='MR101'
                onChange={(e) =>
                  set({ flight_number: e.target.value.toUpperCase() })
                }
                onBlur={() => !flight && void fillFromLatest()}
              />
            </div>
            <div className='grid gap-1.5'>
              <Label>Type</Label>
              <SimpleSelect
                value={form.service_type}
                onValueChange={(v) =>
                  set({ service_type: v as Form['service_type'] })
                }
                items={TYPES}
              />
            </div>
          </div>
          {form.service_type === 'charter' && (
            <div className='grid grid-cols-3 items-end gap-3'>
              <Label className='flex items-center gap-2'>
                <Checkbox
                  checked={form.no_baggage_rule}
                  onCheckedChange={(v) => set({ no_baggage_rule: v === true })}
                />
                No baggage rule (free, no kg limit)
              </Label>
              <div className='grid gap-1.5'>
                <Label>Excess price per kg</Label>
                <Input
                  type='number'
                  min='0'
                  value={form.excess_price}
                  onChange={(e) => set({ excess_price: e.target.value })}
                />
              </div>
              <div className='grid gap-1.5'>
                <Label>Excess limit, kg</Label>
                <Input
                  type='number'
                  min='0'
                  value={form.excess_max}
                  onChange={(e) => set({ excess_max: e.target.value })}
                />
              </div>
            </div>
          )}
          {filledFrom && (
            <p className='text-muted-foreground flex items-center gap-1.5 text-xs'>
              <Sparkles className='size-3.5' />
              Filled from {form.flight_number} of {filledFrom} — change anything
              you need.
            </p>
          )}
          {isSystemAdmin && !flight && (
            <div className='grid gap-1.5'>
              <Label>Airline</Label>
              <SimpleSelect
                value={form.airline_id || undefined}
                onValueChange={(v) => set({ airline_id: v })}
                items={airlines}
                placeholder='Airline'
              />
            </div>
          )}
          <div className='grid gap-1.5'>
            <Label>Aircraft</Label>
            <SimpleSelect
              value={form.aircraft_id || undefined}
              onValueChange={(v) => set({ aircraft_id: v })}
              items={aircraft}
              placeholder='Aircraft'
            />
          </div>
          <div className='grid grid-cols-2 gap-3'>
            <div className='grid gap-1.5'>
              <Label>From</Label>
              <SimpleSelect
                value={form.origin_airport_id || undefined}
                onValueChange={(v) => set({ origin_airport_id: v })}
                items={airports}
                placeholder='Origin'
              />
            </div>
            <div className='grid gap-1.5'>
              <Label>To</Label>
              <SimpleSelect
                value={form.destination_airport_id || undefined}
                onValueChange={(v) => set({ destination_airport_id: v })}
                items={airports.filter(
                  (a) => a.value !== form.origin_airport_id
                )}
                placeholder='Destination'
              />
            </div>
          </div>
          <div className='grid grid-cols-3 items-end gap-3'>
            <div className='grid gap-1.5'>
              <Label htmlFor='nf-std'>
                Departure
                {originTimezone &&
                  ` (${iata(form.origin_airport_id)}, ${utcLabel(originTimezone, firstDate)})`}
              </Label>
              <Input
                id='nf-std'
                type='time'
                value={form.departure_time}
                onChange={(e) => set({ departure_time: e.target.value })}
              />
            </div>
            <div className='grid gap-1.5'>
              <Label htmlFor='nf-sta'>
                Arrival
                {destinationTimezone &&
                  ` (${iata(form.destination_airport_id)}, ${utcLabel(destinationTimezone, firstDate)})`}
                {arrival && arrival.dayOffset !== 0 && (
                  <span className='ms-1 rounded bg-amber-500/15 px-1 font-mono font-bold text-amber-600 dark:text-amber-300'>
                    {dayMark(arrival.dayOffset)}
                  </span>
                )}
              </Label>
              <Input
                id='nf-sta'
                type='time'
                value={form.arrival_time}
                onChange={(e) => set({ arrival_time: e.target.value })}
              />
            </div>
            <div className='grid gap-1.5'>
              <Label htmlFor='nf-block'>Duration (h:mm)</Label>
              <Input
                id='nf-block'
                type='time'
                value={form.block_time}
                onChange={(e) => setDuration(e.target.value)}
              />
            </div>
          </div>
          <div className='grid grid-cols-2 gap-3'>
            <div className='grid gap-1.5'>
              <Label htmlFor='nf-terminal'>Terminal</Label>
              <Input
                id='nf-terminal'
                value={form.terminal}
                onChange={(e) => set({ terminal: e.target.value })}
              />
            </div>
            <div className='grid gap-1.5'>
              <Label htmlFor='nf-gate'>Gate</Label>
              <Input
                id='nf-gate'
                value={form.gate}
                onChange={(e) => set({ gate: e.target.value })}
              />
            </div>
          </div>
          {!flight && (
            <label className='mt-1 flex items-center gap-2 text-sm'>
              <Checkbox
                checked={another}
                onCheckedChange={(v) => setAnother(v === true)}
              />
              Add another after this (the return leg is filled in)
            </label>
          )}
        </div>

        <div className='grid content-start gap-2'>
          <div className='flex items-center justify-between gap-2'>
            <Label>{flight ? 'Day' : `Days (${dates.length})`}</Label>
            {!flight && (
              <div className='flex gap-1'>
                <Button
                  variant='outline'
                  size='sm'
                  className='h-7 text-xs'
                  disabled={!weeklyFrom}
                  title='The same weekday as the first chosen day, for the next 8 weeks'
                  onClick={() =>
                    setDates((d) => {
                      const keys = new Set(
                        d.map((x) => format(x, 'yyyy-MM-dd'))
                      )
                      const more = Array.from({ length: 8 }, (_, i) =>
                        addDays(weeklyFrom!, 7 * (i + 1))
                      )
                      return [
                        ...d,
                        ...more.filter(
                          (x) => !keys.has(format(x, 'yyyy-MM-dd'))
                        ),
                      ]
                    })
                  }
                >
                  Weekly ×8
                </Button>
                <Button
                  variant='ghost'
                  size='sm'
                  className='h-7 text-xs'
                  disabled={!dates.length}
                  onClick={() => setDates([])}
                >
                  Clear
                </Button>
              </div>
            )}
          </div>
          {flight ? (
            <Calendar
              mode='single'
              required
              selected={dates[0]}
              defaultMonth={dates[0]}
              onSelect={(d) => d && setDates([d])}
              className='rounded-lg border'
            />
          ) : (
            <Calendar
              mode='multiple'
              selected={dates}
              onSelect={(d) => setDates(d ?? [])}
              numberOfMonths={2}
              disabled={{ before: new Date() }}
              className='rounded-lg border'
            />
          )}
          <p className='text-muted-foreground max-w-[34rem] text-xs'>
            {sorted.length
              ? sorted.map((d) => format(d, 'MMM d')).join(', ')
              : 'Click the days the flight operates. A day that already has this flight is skipped.'}
          </p>
        </div>
      </div>
      <AlertDialog open={asking} onOpenChange={setAsking}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Notification автоматаар үүсгэх үү?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {[timeChanged && 'Цаг', typeChanged && 'Онгоцны type']
                .filter(Boolean)
                .join(', ')}{' '}
              өөрчлөгдсөн. Мэдэгдэл airline-ийн бүх хэрэглэгч, агентуудын
              хонхонд харагдана.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {typeChanged && (
            <p className='flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-2 text-xs text-amber-700 dark:text-amber-300'>
              <TriangleAlert className='mt-0.5 size-3.5 shrink-0' />
              Онгоцны type сольсон тул зорчигч болон агентуудад мэдэгдэх
              шаардлагатай.
            </p>
          )}
          <AlertDialogFooter>
            <Button variant='ghost' onClick={() => setAsking(false)}>
              Болих
            </Button>
            <Button
              variant='outline'
              onClick={() => {
                setAsking(false)
                save.mutate(false)
              }}
            >
              Үгүй, зөвхөн хадгалах
            </Button>
            <Button
              onClick={() => {
                setAsking(false)
                save.mutate(true)
              }}
            >
              Тийм, үүсгэх
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </BaseDialog>
  )
}
