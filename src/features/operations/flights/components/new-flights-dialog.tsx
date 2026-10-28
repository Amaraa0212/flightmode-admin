import { useState } from 'react'
import { addDays, addMinutes, format, parse } from 'date-fns'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  aircraftOptions,
  airlineOptions,
  airportOptions,
  flightService,
} from '@/services'
import { Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth-store'
import { useOptions } from '@/hooks/use-options'
import { BaseDialog } from '@/components/ui/base-dialog'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SimpleSelect } from '@/components/simple-select'

const TYPES = [
  { label: 'Scheduled (хуваарьт)', value: 'scheduled' },
  { label: 'Charter (захиалгат)', value: 'charter' },
]

type Form = {
  airline_id: string
  flight_number: string
  service_type: 'scheduled' | 'charter'
  aircraft_id: string
  origin_airport_id: string
  destination_airport_id: string
  departure_time: string
  /** HH:MM */
  block_time: string
  terminal: string
  gate: string
}

const EMPTY: Form = {
  airline_id: '',
  flight_number: '',
  service_type: 'scheduled',
  aircraft_id: '',
  origin_airport_id: '',
  destination_airport_id: '',
  departure_time: '',
  block_time: '',
  terminal: 'T1',
  gate: '',
}

const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}
const toHhmm = (minutes: number) =>
  `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`

/**
 * New flights in one go: the flight once (number, aircraft, route, local departure time, block time), then any
 * number of days on the calendar. Typing a known flight number fills the rest from its latest flight.
 */
export function NewFlightsDialog({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient()
  const isSystemAdmin = useAuthStore((s) => !!s.auth.user?.is_system_admin)
  const aircraft = useOptions('aircraft', aircraftOptions)
  const airports = useOptions('airports', airportOptions)
  const airlines = useOptions('airlines', airlineOptions)

  const [form, setForm] = useState<Form>(EMPTY)
  const [dates, setDates] = useState<Date[]>([])
  const [another, setAnother] = useState(false)
  const [filledFrom, setFilledFrom] = useState<string | null>(null)
  const set = (patch: Partial<Form>) => setForm((f) => ({ ...f, ...patch }))

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
        aircraft_id: String(latest.aircraft_id),
        origin_airport_id: String(latest.origin_airport_id),
        destination_airport_id: String(latest.destination_airport_id),
        departure_time: latest.departure_time,
        block_time: toHhmm(latest.block_minutes),
        terminal: latest.terminal ?? f.terminal,
      }))
      setFilledFrom(latest.last_date.slice(0, 10))
    } catch {
      setFilledFrom(null)
    }
  }

  // arrival in the origin's local time, to check the block time
  const arrival =
    form.departure_time && form.block_time
      ? addMinutes(
          parse(form.departure_time, 'HH:mm', new Date(2000, 0, 1)),
          toMinutes(form.block_time)
        )
      : null
  const nextDay = arrival && arrival.getDate() > 1

  const sorted = [...dates].sort((a, b) => a.getTime() - b.getTime())
  const weeklyFrom = sorted[0]
  const ready =
    form.flight_number.trim() &&
    form.aircraft_id &&
    form.origin_airport_id &&
    form.destination_airport_id &&
    form.origin_airport_id !== form.destination_airport_id &&
    form.departure_time &&
    toMinutes(form.block_time) >= 10 &&
    dates.length > 0

  const save = useMutation({
    mutationFn: () =>
      flightService.createMany({
        airline_id: form.airline_id ? Number(form.airline_id) : undefined,
        aircraft_id: Number(form.aircraft_id),
        flight_number: form.flight_number,
        origin_airport_id: Number(form.origin_airport_id),
        destination_airport_id: Number(form.destination_airport_id),
        service_type: form.service_type,
        departure_time: form.departure_time,
        block_minutes: toMinutes(form.block_time),
        terminal: form.terminal || undefined,
        gate: form.gate || undefined,
        dates: sorted.map((d) => format(d, 'yyyy-MM-dd')),
      }),
    onSuccess: (res) => {
      toast.success(res.message)
      queryClient.invalidateQueries({ queryKey: ['admin-flights'] })
      queryClient.invalidateQueries({ queryKey: ['options'] })
      if (another) {
        // the next flight: often the return leg — swap the route, keep the days
        setForm((f) => ({
          ...EMPTY,
          airline_id: f.airline_id,
          aircraft_id: f.aircraft_id,
          service_type: f.service_type,
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
      title='New flights'
      description='Fill the flight once and pick its days. Times are local to the departure airport.'
      maxWidth='4xl'
      submitButton={{
        text:
          dates.length > 1 ? `Create ${dates.length} flights` : 'Create flight',
        onClick: () => save.mutate(),
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
                onBlur={() => void fillFromLatest()}
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
          {filledFrom && (
            <p className='text-muted-foreground flex items-center gap-1.5 text-xs'>
              <Sparkles className='size-3.5' />
              Filled from {form.flight_number} of {filledFrom} — change anything
              you need.
            </p>
          )}
          {isSystemAdmin && (
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
          <div className='grid grid-cols-2 gap-3'>
            <div className='grid gap-1.5'>
              <Label htmlFor='nf-std'>Departure (local)</Label>
              <Input
                id='nf-std'
                type='time'
                value={form.departure_time}
                onChange={(e) => set({ departure_time: e.target.value })}
              />
            </div>
            <div className='grid gap-1.5'>
              <Label htmlFor='nf-block'>Block time (h:mm)</Label>
              <Input
                id='nf-block'
                type='time'
                value={form.block_time}
                onChange={(e) => set({ block_time: e.target.value })}
              />
            </div>
          </div>
          {arrival && (
            <p className='text-muted-foreground text-xs'>
              Arrives {format(arrival, 'HH:mm')} departure-airport time
              {nextDay && ' (next day)'}
            </p>
          )}
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
          <label className='mt-1 flex items-center gap-2 text-sm'>
            <Checkbox
              checked={another}
              onCheckedChange={(v) => setAnother(v === true)}
            />
            Add another after this (the return leg is filled in)
          </label>
        </div>

        <div className='grid content-start gap-2'>
          <div className='flex items-center justify-between gap-2'>
            <Label>Days ({dates.length})</Label>
            <div className='flex gap-1'>
              <Button
                variant='outline'
                size='sm'
                className='h-7 text-xs'
                disabled={!weeklyFrom}
                title='The same weekday as the first chosen day, for the next 8 weeks'
                onClick={() =>
                  setDates((d) => {
                    const keys = new Set(d.map((x) => format(x, 'yyyy-MM-dd')))
                    const more = Array.from({ length: 8 }, (_, i) =>
                      addDays(weeklyFrom!, 7 * (i + 1))
                    )
                    return [
                      ...d,
                      ...more.filter((x) => !keys.has(format(x, 'yyyy-MM-dd'))),
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
          </div>
          <Calendar
            mode='multiple'
            selected={dates}
            onSelect={(d) => setDates(d ?? [])}
            numberOfMonths={2}
            disabled={{ before: new Date() }}
            className='rounded-lg border'
          />
          <p className='text-muted-foreground max-w-[34rem] text-xs'>
            {sorted.length
              ? sorted.map((d) => format(d, 'MMM d')).join(', ')
              : 'Click the days the flight operates. A day that already has this flight is skipped.'}
          </p>
        </div>
      </div>
    </BaseDialog>
  )
}
