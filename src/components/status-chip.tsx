import { cn } from '@/lib/utils'
import type { StatusMeta, Tone } from '@/constants/status'

const TONES: Record<Tone, string> = {
  cyan: 'text-cyan-700 border-cyan-600/30 bg-cyan-500/10 dark:text-cyan-300 dark:border-cyan-400/30',
  green:
    'text-emerald-700 border-emerald-600/30 bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-400/30',
  amber:
    'text-amber-700 border-amber-600/30 bg-amber-500/10 dark:text-amber-300 dark:border-amber-400/30',
  red: 'text-rose-700 border-rose-600/30 bg-rose-500/10 dark:text-rose-300 dark:border-rose-400/30',
  indigo:
    'text-indigo-700 border-indigo-600/30 bg-indigo-500/10 dark:text-indigo-300 dark:border-indigo-400/30',
  slate:
    'text-slate-600 border-slate-500/30 bg-slate-500/10 dark:text-slate-300 dark:border-slate-400/25',
}

const DOTS: Record<Tone, string> = {
  cyan: 'bg-cyan-500 dark:bg-cyan-300',
  green: 'bg-emerald-500 dark:bg-emerald-400',
  amber: 'bg-amber-500 dark:bg-amber-300',
  red: 'bg-rose-500 dark:bg-rose-400',
  indigo: 'bg-indigo-500 dark:bg-indigo-300',
  slate: 'bg-slate-400',
}

export function toneClass(tone: Tone) {
  return TONES[tone]
}

type StatusChipProps = {
  value: string | null | undefined
  map: Record<string, StatusMeta>
  dot?: boolean
  size?: 'sm' | 'md'
  className?: string
}

export function StatusChip({
  value,
  map,
  dot = true,
  size = 'sm',
  className,
}: StatusChipProps) {
  if (!value) return <span className='text-muted-foreground text-xs'>-</span>
  const meta = map[value] ?? { label: value, tone: 'slate' as Tone }
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border font-semibold tracking-wide text-nowrap uppercase',
        size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-3 py-1 text-xs',
        TONES[meta.tone],
        className
      )}
    >
      {dot && <span className={cn('size-1.5 rounded-full', DOTS[meta.tone])} />}
      {meta.label}
    </span>
  )
}

/** Жижиг "label + value" pill — PNR / SEAT / CABIN гэх мэт */
export function InfoPill({
  label,
  value,
  mono = true,
  className,
}: {
  label: string
  value: React.ReactNode
  mono?: boolean
  className?: string
}) {
  return (
    <span
      className={cn(
        'bg-surface inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs',
        className
      )}
    >
      <span className='text-muted-foreground font-medium uppercase'>
        {label}
      </span>
      <span className={cn('text-brand font-bold', mono && 'font-mono')}>
        {value}
      </span>
    </span>
  )
}
