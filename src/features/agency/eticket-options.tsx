import { useState } from 'react'
import type { EticketOptions } from '@/services'
import { cn } from '@/lib/utils'
import { Checkbox } from '@/components/ui/checkbox'

const STORAGE_KEY = 'agency-eticket-options'
const DEFAULT: EticketOptions = { lang: 'mn', fare: true, issued: true }

function read(): EticketOptions {
  try {
    return {
      ...DEFAULT,
      ...JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}'),
    }
  } catch {
    return DEFAULT
  }
}

/** Language, price breakdown and issue date of the e-ticket, remembered for the next one */
export function useEticketOptions() {
  const [options, setOptions] = useState<EticketOptions>(read)
  const change = (patch: Partial<EticketOptions>) =>
    setOptions((current) => {
      const next = { ...current, ...patch }
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      } catch {
        // storage unavailable: the choice lasts until the page is left
      }
      return next
    })
  return [options, change] as const
}

export function EticketOptionsBar({
  value,
  onChange,
  className,
}: {
  value: EticketOptions
  onChange: (patch: Partial<EticketOptions>) => void
  className?: string
}) {
  return (
    <div className={cn('flex flex-wrap items-center gap-3 text-xs', className)}>
      <span className='text-muted-foreground font-medium'>E-ticket:</span>
      <div className='flex rounded-md border p-0.5'>
        {(['mn', 'en'] as const).map((lang) => (
          <button
            key={lang}
            type='button'
            onClick={() => onChange({ lang })}
            className={cn(
              'rounded px-2 py-0.5 font-semibold',
              value.lang === lang
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground'
            )}
          >
            {lang === 'mn' ? 'Монгол' : 'English'}
          </button>
        ))}
      </div>
      <label className='flex items-center gap-1.5'>
        <Checkbox
          checked={value.fare}
          onCheckedChange={(v) => onChange({ fare: v === true })}
        />
        Үнийн задаргаатай
      </label>
      <label className='flex items-center gap-1.5'>
        <Checkbox
          checked={value.issued}
          onCheckedChange={(v) => onChange({ issued: v === true })}
        />
        Тийз бичигдсэн огноотой
      </label>
    </div>
  )
}
