import { cn } from '@/lib/utils'

/** Thin gradient progress bar (0..1) */
export function Progress({
  value,
  className,
}: {
  value: number
  className?: string
}) {
  const pct = Math.max(0, Math.min(100, Math.round(value * 100)))
  return (
    <div
      className={cn('bg-muted h-1.5 overflow-hidden rounded-full', className)}
    >
      <div
        className={cn(
          'h-full rounded-full',
          pct >= 95 ? 'bg-rose-400' : 'fm-gradient'
        )}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}
