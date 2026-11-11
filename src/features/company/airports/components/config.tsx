import { z } from 'zod'
import type { UseFormReturn } from 'react-hook-form'
import { Wand2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  airportService,
  countryOptions,
  referenceLookupService,
  type Airport,
  type CityOption,
} from '@/services'
import { Button } from '@/components/ui/button'
import { ACTIVE_OPTIONS } from '@/constants/status'
import { brand, col, mono, muted } from '@/components/resource/columns'
import type { ResourcePageProps } from '@/components/resource/resource-page'
import { ActiveBadge } from '@/components/status-badge'

const schema = z.object({
  iata_code: z.string().trim().length(3, '3 letters'),
  icao_code: z.string().trim().length(4, '4 letters'),
  name: z.string().trim().min(2),
  city: z.string().trim().min(2),
  city_code: z.string().trim().length(3),
  country_id: z.string().min(1, 'Country is required'),
  timezone: z.string().trim().min(3),
  is_active: z.boolean(),
})
type Form = z.infer<typeof schema>

// countries are loaded once and searched here (the combobox asks on every keystroke)
let countries: Promise<Array<{ label: string; value: string }>> | null = null
const searchCountries = async (search?: string) => {
  countries ??= countryOptions().catch((e) => {
    countries = null
    throw e
  })
  const q = search?.trim().toLowerCase()
  return (await countries).filter((c) => !q || c.label.toLowerCase().includes(q))
}

// the city list last shown, to fill the city code and time zone of the picked city
let shownCities: CityOption[] = []
const searchCities = async (search?: string, countryId?: unknown) => {
  if (!countryId) return []
  shownCities = await referenceLookupService.cities(String(countryId), search)
  return shownCities.map((c) => ({
    label: c.city_code ? `${c.city} (${c.city_code})` : c.city,
    value: c.city,
    key: `${c.city}-${c.city_code}`,
  }))
}

const searchTimezones = async (search?: string, countryId?: unknown) => {
  const zones = await referenceLookupService.timezones(countryId ? String(countryId) : undefined)
  const q = search?.trim().toLowerCase()
  return zones.filter((z) => !q || z.toLowerCase().includes(q)).map((z) => ({ label: z, value: z }))
}

/** A new country: the city and time zone of the old one no longer apply (a single time zone is set right away) */
async function onCountry(countryId: string, form: UseFormReturn<Form>) {
  form.setValue('city', '')
  form.setValue('city_code', '')
  form.setValue('timezone', '')
  const zones = await referenceLookupService.timezones(countryId)
  if (zones.length === 1) form.setValue('timezone', zones[0], { shouldValidate: true })
}

function onCity(city: string, form: UseFormReturn<Form>) {
  const found = shownCities.find((c) => c.city === city)
  if (!found) return
  if (found.city_code) form.setValue('city_code', found.city_code, { shouldValidate: true })
  form.setValue('timezone', found.timezone, { shouldValidate: true })
}

/** Fills the form from the worldwide IATA list by the typed code */
function FillFromIata({ form }: { form: UseFormReturn<Form> }) {
  return (
    <Button
      type='button'
      variant='ghost'
      size='sm'
      className='h-6 gap-1 px-2 text-xs'
      onClick={async () => {
        const code = String(form.getValues('iata_code') ?? '').trim()
        if (code.length !== 3) return toast.error('Type the 3-letter IATA code first')
        const a = await referenceLookupService.iataAirport(code)
        if (!a) return toast.error(`${code.toUpperCase()} is not in the IATA list`)
        const set = (k: Exclude<keyof Form, 'is_active'>, v: string | number | null) =>
          v !== null && v !== '' && form.setValue(k, String(v), { shouldValidate: true })
        set('iata_code', a.code)
        set('icao_code', a.icao)
        set('name', a.name)
        set('country_id', a.country_id)
        set('city', a.city)
        set('city_code', a.city_code)
        set('timezone', a.timezone)
        toast.success(`${a.code} — ${a.name}`)
      }}
    >
      <Wand2 className='h-3 w-3' /> Fill from IATA
    </Button>
  )
}

export const pageConfig: Omit<
  ResourcePageProps<Airport, Form>,
  'search' | 'navigate'
> = {
  title: 'Airports',
  description:
    'Stations and destinations (IATA / ICAO, timezone for local times)',
  queryKey: 'admin-airports',
  list: airportService.list,
  searchPlaceholder: 'IATA, ICAO, name or city',
  filters: [
    { columnId: 'is_active', title: 'Status', options: ACTIVE_OPTIONS },
  ],
  exportFileName: 'airports.xlsx',
  columns: [
    col<Airport>('iata_code', 'IATA', (r) => brand(r.iata_code)),
    col<Airport>('icao_code', 'ICAO', (r) => mono(r.icao_code)),
    col<Airport>('name', 'Name', (r) => (
      <span className='font-medium'>{r.name}</span>
    )),
    col<Airport>('city', 'City', (r) => `${r.city} (${r.city_code})`),
    col<Airport>('country', 'Country', (r) => r.country?.name ?? '-', {
      accessor: (r) => r.country?.name,
    }),
    col<Airport>('timezone', 'Timezone', (r) => muted(r.timezone)),
    col<Airport>(
      'is_active',
      'Status',
      (r) => <ActiveBadge active={r.is_active} />,
      { accessor: (r) => String(r.is_active) }
    ),
  ],
  form: {
    entity: 'airport',
    schema,
    empty: {
      iata_code: '',
      icao_code: '',
      name: '',
      city: '',
      city_code: '',
      country_id: '',
      timezone: '',
      is_active: true,
    },
    fromRow: (r) => ({
      iata_code: r.iata_code,
      icao_code: r.icao_code,
      name: r.name,
      city: r.city,
      city_code: r.city_code,
      country_id: String(r.country_id),
      timezone: r.timezone,
      is_active: r.is_active,
    }),
    fields: [
      {
        name: 'iata_code',
        label: 'IATA code',
        type: 'text',
        required: true,
        gridCols: 1,
        headerTrailing: (form) => <FillFromIata form={form} />,
      },
      {
        name: 'icao_code',
        label: 'ICAO code',
        type: 'text',
        required: true,
        gridCols: 1,
      },
      {
        name: 'name',
        label: 'Name',
        type: 'text',
        required: true,
        gridCols: 2,
      },
      {
        name: 'country_id',
        label: 'Country',
        type: 'combobox',
        placeholder: 'Select country',
        comboboxOptions: {
          fetchOptions: searchCountries,
          placeholder: 'Search country…',
          onSelect: (value, _image, form) => onCountry(value, form),
        },
        required: true,
        gridCols: 1,
      },
      {
        name: 'city',
        label: 'City',
        type: 'combobox',
        placeholder: 'Select city',
        comboboxOptions: {
          fetchOptions: searchCities,
          dependsOn: 'country_id',
          allowCustom: true,
          placeholder: 'Search city…',
          onSelect: (value, _image, form) => onCity(value, form),
        },
        required: true,
        gridCols: 1,
      },
      {
        name: 'city_code',
        label: 'City code',
        type: 'text',
        required: true,
        gridCols: 1,
      },
      {
        name: 'timezone',
        label: 'Timezone (IANA)',
        type: 'combobox',
        placeholder: 'Select time zone',
        comboboxOptions: {
          fetchOptions: searchTimezones,
          dependsOn: 'country_id',
          allowCustom: true,
          placeholder: 'Search time zone…',
        },
        required: true,
        gridCols: 1,
      },
      { name: 'is_active', label: 'Active', type: 'checkbox', gridCols: 2 },
    ],
    create: (v) =>
      airportService.create({ ...v, country_id: Number(v.country_id) }),
    update: (row, v) =>
      airportService.update(row.id, { ...v, country_id: Number(v.country_id) }),
  },
  remove: {
    run: (r) => airportService.remove(r.id),
    label: (r) => `${r.iata_code} ${r.name}`,
  },
}
