import { flightOptions } from '@/services'
import { useOptions } from '@/hooks/use-options'
import { SimpleSelect } from '@/components/simple-select'

/** Flight select for DCS tools (seat block, manifest, PNL) */
export function FlightPicker({
  value,
  onChange,
  upcomingOnly = false,
}: {
  value?: number
  onChange: (flightId: number) => void
  upcomingOnly?: boolean
}) {
  const all = useOptions('flights-all', () => flightOptions(false))
  const upcomingOptions = useOptions('flights-upcoming', () => flightOptions(true))
  const upcoming = new Set(upcomingOptions.map((o) => o.value))
  return (
    <SimpleSelect
      value={value ? String(value) : undefined}
      onValueChange={(v) => onChange(Number(v))}
      items={all.filter(
        (o) =>
          !upcomingOnly || o.value === String(value) || upcoming.has(o.value)
      )}
      placeholder='Select flight'
      className='w-80'
    />
  )
}
