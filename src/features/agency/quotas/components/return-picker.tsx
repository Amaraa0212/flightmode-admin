import { useQuery } from '@tanstack/react-query'
import { agencyPortalService, type AgencyQuota } from '@/services'
import { originOf } from '@/lib/airport-zones'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
        <Select
          value={String(value)}
          onValueChange={(v) => onChange(Number(v))}
        >
          <SelectTrigger className='h-10 w-full'>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {options.map((o) => (
              <SelectItem key={o.id} value={String(o.id)}>
                <span className='font-mono font-semibold'>
                  {o.flight_number}
                </span>{' '}
                {o.route} ·{' '}
                <AirportTime at={o.departure_at} airport={originOf(o.route)} />
                {o.interline && (
                  <span className='ms-2 rounded bg-amber-500/15 px-1.5 text-[11px] font-semibold text-amber-700 dark:text-amber-300'>
                    {o.airline} · open jaw
                  </span>
                )}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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
