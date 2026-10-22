import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  baggageRuleOptions,
  flightProductService,
  seatPriceOptions,
  seatProfileService,
  type FlightProducts,
} from '@/services'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { SimpleSelect } from '@/components/simple-select'

const NO_PROFILE = 'none'

type Option = { label: string; value: string }

function CheckList({
  title,
  options,
  chosen,
  onChange,
}: {
  title: string
  options: Option[]
  chosen: number[]
  onChange: (ids: number[]) => void
}) {
  return (
    <div className='grid gap-1.5'>
      <p className='text-sm font-medium'>{title}</p>
      <div className='fm-inset grid max-h-44 gap-1.5 overflow-y-auto p-2'>
        {options.length ? (
          options.map((o) => {
            const id = Number(o.value)
            return (
              <label key={o.value} className='flex items-center gap-2 text-xs'>
                <Checkbox
                  checked={chosen.includes(id)}
                  onCheckedChange={(on) =>
                    onChange(
                      on ? [...chosen, id] : chosen.filter((x) => x !== id)
                    )
                  }
                />
                {o.label}
              </label>
            )
          })
        ) : (
          <span className='text-muted-foreground text-xs'>
            Nothing set up yet.
          </span>
        )}
      </div>
    </div>
  )
}

/** Shop items of one flight: baggage rules, paid seats and the online seat (zone) profile */
export function ProductsDialog({
  flight,
  queryKey,
  onClose,
}: {
  flight: FlightProducts
  queryKey: string
  onClose: () => void
}) {
  const queryClient = useQueryClient()
  const { data: current } = useQuery({
    queryKey: ['admin-flight-products', 'edit', flight.flight_id],
    queryFn: async () =>
      (await flightProductService.get(flight.flight_id)).body,
  })
  const { data: rules = [] } = useQuery({
    queryKey: ['baggage-rule-options'],
    queryFn: baggageRuleOptions,
  })
  const { data: prices = [] } = useQuery({
    queryKey: ['seat-price-options'],
    queryFn: seatPriceOptions,
  })
  const { data: profiles = [] } = useQuery({
    queryKey: ['seat-profiles', current?.aircraft_id],
    queryFn: async () =>
      (await seatProfileService.list(current!.aircraft_id!)).body ?? [],
    enabled: !!current?.aircraft_id,
  })

  // null = untouched (shows what the flight has)
  const [ruleIds, setRuleIds] = useState<number[] | null>(null)
  const [priceIds, setPriceIds] = useState<number[] | null>(null)
  const [profile, setProfile] = useState<string | null>(null)

  const chosenRules = ruleIds ?? current?.baggage_rule_ids ?? []
  const chosenPrices = priceIds ?? current?.seat_price_ids ?? []
  const chosenProfile =
    profile ??
    (current?.seat_assignment_profile_id
      ? String(current.seat_assignment_profile_id)
      : NO_PROFILE)

  const save = useMutation({
    mutationFn: () =>
      flightProductService.save(flight.flight_id, {
        baggage_rule_ids: chosenRules,
        seat_price_ids: chosenPrices,
        seat_assignment_profile_id:
          chosenProfile === NO_PROFILE ? null : Number(chosenProfile),
      }),
    onSuccess: (res) => {
      toast.success(res.message)
      queryClient.invalidateQueries({ queryKey: [queryKey] })
      onClose()
    },
    onError: (error: Error) => toast.error(error.message),
  })

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className='sm:max-w-lg'>
        <DialogHeader>
          <DialogTitle>Shop items · {flight.flight_number}</DialogTitle>
          <DialogDescription>
            {flight.route} — only this flight changes. To set many flights at
            once use “Apply template”.
          </DialogDescription>
        </DialogHeader>
        {!current ? (
          <Loader2 className='text-muted-foreground mx-auto size-5 animate-spin' />
        ) : (
          <div className='grid gap-4'>
            <CheckList
              title='Baggage'
              options={rules}
              chosen={chosenRules}
              onChange={setRuleIds}
            />
            <CheckList
              title='Paid seats'
              options={prices}
              chosen={chosenPrices}
              onChange={setPriceIds}
            />
            <div className='grid gap-1.5'>
              <p className='text-sm font-medium'>Zone (online seat profile)</p>
              <SimpleSelect
                value={chosenProfile}
                onValueChange={setProfile}
                items={[
                  { label: 'No profile', value: NO_PROFILE },
                  ...profiles.map((p) => ({
                    label: p.name,
                    value: String(p.id),
                  })),
                ]}
                className='w-full'
              />
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant='outline' onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={!current || save.isPending}
            onClick={() => save.mutate()}
          >
            {save.isPending && <Loader2 className='size-4 animate-spin' />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
