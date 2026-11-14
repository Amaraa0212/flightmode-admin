import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  agencyPortalService,
  type AgencyQuota,
  type AgencyReturnOption,
} from '@/services'
import { Check, ChevronsUpDown } from 'lucide-react'
import { airportTime, originOf, useAirportZones } from '@/lib/airport-zones'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { AirportTime } from '@/components/airport-time'

/**
 * RT: also put the passengers on a return quota. Another airline's charter (open jaw) makes two linked PNRs,
 * priced at nothing; a same-airline return priced by its own fares is booked on its own (not offered).
 */
export function ReturnPicker({
  quota,
  value,
  onChange,
}: {
  quota: AgencyQuota
  /** null: one way */
  value: number | null
  onChange: (returnQuotaId: number | null) => void
}) {
  const { data = [], isLoading } = useQuery({
    queryKey: ['agency-return-options', quota.id, quota.airline_id],
    queryFn: () =>
      agencyPortalService.returnOptions(quota.id, quota.airline_id),
  })
  const options = data.filter((o) => !o.needs_fare)
  const zones = useAirportZones()
  const [open, setOpen] = useState(false)
  const chosen = options.find((o) => o.id === value)
  // a quota that already flies there and back has its return
  if (quota.return_flight) return null
  return (
    <div className='grid gap-2 rounded-lg border p-3'>
      <label className='flex items-center gap-2 text-sm font-medium'>
        <Checkbox
          checked={value !== null}
          disabled={!options.length}
          onCheckedChange={(on) => onChange(on === true ? options[0].id : null)}
        />
        RT — буцах нислэгт ч мөн оруулах
        {!isLoading && !options.length && (
          <span className='text-muted-foreground text-xs font-normal'>
            (буцах квот алга)
          </span>
        )}
      </label>
      {value !== null && (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              type='button'
              variant='outline'
              role='combobox'
              className='h-10 w-full justify-between font-normal'
            >
              {chosen ? <OptionLabel option={chosen} /> : 'Буцах нислэг сонгох'}
              <ChevronsUpDown className='ms-2 size-4 shrink-0 opacity-50' />
            </Button>
          </PopoverTrigger>
          <PopoverContent
            className='w-[var(--radix-popover-trigger-width)] p-0'
            align='start'
          >
            <Command>
              <CommandInput placeholder='Нислэг, чиглэл, огноо, airline-аар хайх…' />
              <CommandList>
                <CommandEmpty>Олдсонгүй.</CommandEmpty>
                <CommandGroup>
                  {options.map((o) => (
                    <CommandItem
                      key={o.id}
                      // what the search matches: number, route, the local date, airline
                      value={`${o.flight_number} ${o.route} ${airportTime(o.departure_at, originOf(o.route), 'YYYY-MM-DD HH:mm', zones)} ${o.airline} ${o.id}`}
                      onSelect={() => {
                        onChange(o.id)
                        setOpen(false)
                      }}
                    >
                      <Check
                        className={cn(
                          'me-2 size-4',
                          o.id === value ? 'opacity-100' : 'opacity-0'
                        )}
                      />
                      <OptionLabel option={o} />
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      )}
      {value !== null && options.find((o) => o.id === value)?.interline && (
        <p className='text-muted-foreground text-xs'>
          Өөр airline-ий нислэг: airline тус бүрд тусдаа PNR үүсч, хоорондоо
          холбогдоно. Charter тул данснаас хасахгүй, тийз шууд бичигдэнэ.
        </p>
      )}
    </div>
  )
}

/** "OM971 PQC-UBN · 2026-11-25 17:00  MIAT · open jaw" */
function OptionLabel({ option: o }: { option: AgencyReturnOption }) {
  return (
    <span className='flex min-w-0 flex-wrap items-center gap-x-1.5 text-sm'>
      <span className='font-mono font-semibold'>{o.flight_number}</span>
      {o.route} ·
      <AirportTime at={o.departure_at} airport={originOf(o.route)} />
      {o.interline && (
        <span className='rounded bg-amber-500/15 px-1.5 text-[11px] font-semibold text-amber-700 dark:text-amber-300'>
          {o.airline} · open jaw
        </span>
      )}
    </span>
  )
}
