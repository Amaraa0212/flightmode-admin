import { cn } from '@/lib/utils'
import { Checkbox } from '@/components/ui/checkbox'

/** Multi-select checkbox list (baggage rules / seat rules / permissions) */
export function CheckList({
  options,
  value,
  onChange,
  className,
}: {
  options: { label: string; value: string; hint?: string }[]
  value: string[]
  onChange: (value: string[]) => void
  className?: string
}) {
  return (
    <div className={cn('grid gap-1.5', className)}>
      {options.map((o) => {
        const checked = value.includes(o.value)
        return (
          <label
            key={o.value}
            className={cn(
              'flex cursor-pointer items-center gap-2 rounded-md border px-2.5 py-1.5 text-sm transition',
              checked
                ? 'border-cyan-400/50 bg-cyan-400/10'
                : 'hover:border-cyan-400/30'
            )}
          >
            <Checkbox
              checked={checked}
              onCheckedChange={(on) =>
                onChange(
                  on ? [...value, o.value] : value.filter((v) => v !== o.value)
                )
              }
            />
            <span className='text-muted-foreground w-6 font-mono text-[10px]'>
              #{o.value}
            </span>
            <span className='truncate'>{o.label}</span>
            {o.hint && (
              <span className='text-muted-foreground ms-auto text-xs'>
                {o.hint}
              </span>
            )}
          </label>
        )
      })}
    </div>
  )
}
