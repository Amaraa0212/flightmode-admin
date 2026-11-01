import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

/** The agent's reservation flow, in the order the agent works through it */
export const FLOW = [
  { n: 1, title: 'Нүүр', hint: 'Өдрөө эхлүүлэх' },
  { n: 2, title: 'Нислэг хайх', hint: 'Форм эсвэл команд' },
  { n: 3, title: 'Нислэг сонгох', hint: 'Харьцуулж сонгох' },
  { n: 4, title: 'Анги, тариф', hint: 'Маршрут баталгаажуулах' },
  { n: 5, title: 'Зорчигч', hint: 'Паспортоор бөглөх' },
  { n: 6, title: 'Үнэ шалгах', hint: 'Тарифын задаргаа' },
  { n: 7, title: 'PNR үүсгэх', hint: 'Захиалга хадгалах' },
  { n: 8, title: 'Тийз бичих', hint: 'Төлбөр, баталгаа' },
  { n: 9, title: 'Баталгаажуулалт', hint: 'E-ticket илгээх' },
  { n: 10, title: 'Захиалга удирдах', hint: 'PNR хайх, өөрчлөх' },
  { n: 11, title: 'Сануулга', hint: 'TL, хугацаа' },
  { n: 12, title: 'Дуусгах', hint: 'Дахин захиалах' },
] as const

/** Numbered circle of a flow step */
export function StepBadge({ n, state = 'current', className }: { n: number; state?: 'done' | 'current' | 'todo'; className?: string }) {
  return (
    <span
      className={cn(
        'flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-bold',
        state === 'current' && 'bg-primary text-primary-foreground shadow-sm',
        state === 'done' && 'bg-emerald-600 text-white',
        state === 'todo' && 'bg-muted text-muted-foreground',
        className
      )}
    >
      {state === 'done' ? <Check className='size-4' /> : n}
    </span>
  )
}

/** Horizontal stepper of the booking wizard: done steps can be clicked to go back */
export function FlowSteps({
  steps,
  current,
  onPick,
}: {
  steps: { n: number; title: string }[]
  current: number
  /** going back to a finished step; omitted once the PNR exists */
  onPick?: (n: number) => void
}) {
  return (
    <ol className='fm-panel flex items-center gap-1 overflow-x-auto px-3 py-2.5'>
      {steps.map((s, i) => {
        const state = s.n < current ? 'done' : s.n === current ? 'current' : 'todo'
        const clickable = !!onPick && state === 'done'
        return (
          <li key={s.n} className='flex shrink-0 items-center gap-1'>
            <button
              type='button'
              disabled={!clickable}
              onClick={() => onPick?.(s.n)}
              className={cn(
                'flex items-center gap-2 rounded-full py-1 ps-1 pe-3 text-xs font-medium',
                clickable && 'hover:bg-muted',
                state === 'current' && 'bg-primary/10 text-primary',
                state === 'todo' && 'text-muted-foreground'
              )}
            >
              <StepBadge n={s.n} state={state} className='size-6 text-xs' />
              {s.title}
            </button>
            {i < steps.length - 1 && <span className='bg-border h-px w-4 sm:w-6' />}
          </li>
        )
      })}
    </ol>
  )
}

/** Card of one flow step: numbered badge, title and a one-line purpose, like the reservation-flow poster */
export function StepCard({
  n,
  title,
  subtitle,
  actions,
  children,
  hints,
  className,
}: {
  n?: number
  title: string
  subtitle?: ReactNode
  actions?: ReactNode
  children: ReactNode
  /** what the agent can do / what the system checks on this step */
  hints?: string[]
  className?: string
}) {
  return (
    <section className={cn('fm-panel flex flex-col gap-4 p-4 sm:p-5', className)}>
      <header className='flex flex-wrap items-start justify-between gap-3'>
        <div className='flex items-start gap-3'>
          {n !== undefined && <StepBadge n={n} className='size-9 text-base' />}
          <div>
            <h3 className='text-base font-semibold tracking-tight'>{title}</h3>
            {subtitle && <p className='text-muted-foreground text-[13px]'>{subtitle}</p>}
          </div>
        </div>
        {actions && <div className='flex items-center gap-2'>{actions}</div>}
      </header>
      {children}
      {hints && hints.length > 0 && (
        <ul className='text-muted-foreground grid gap-1 border-t pt-3 text-xs sm:grid-cols-2'>
          {hints.map((h) => (
            <li key={h} className='flex gap-2'>
              <span className='bg-primary mt-1.5 size-1 shrink-0 rounded-full' />
              {h}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

/** Compact map of the whole flow (home page): where each step lives */
export function FlowMap() {
  const to: Record<number, string> = { 1: '/agency', 2: '/agency/booking', 10: '/agency/bookings', 12: '/agency/booking' }
  return (
    <div className='grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6'>
      {FLOW.map((s) => {
        const body = (
          <>
            <StepBadge n={s.n} state='todo' className='bg-primary/10 text-primary size-7 text-xs' />
            <span className='min-w-0'>
              <span className='block truncate text-xs font-semibold'>{s.title}</span>
              <span className='text-muted-foreground block truncate text-[11px]'>{s.hint}</span>
            </span>
          </>
        )
        const cls = 'flex items-center gap-2 rounded-xl border px-2.5 py-2'
        return to[s.n] ? (
          <Link key={s.n} to={to[s.n]} className={cn(cls, 'hover:bg-muted/50')}>
            {body}
          </Link>
        ) : (
          <div key={s.n} className={cls}>
            {body}
          </div>
        )
      })}
    </div>
  )
}

/** Booking status as the agent reads it (airline status codes) */
export const BOOKING_STATUS: Record<string, { code: string; label: string; className: string }> = {
  confirmed: { code: 'TKT', label: 'Тийз бичигдсэн', className: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' },
  on_hold: { code: 'HK', label: 'Hold — тийз бичээгүй', className: 'bg-amber-500/10 text-amber-700 dark:text-amber-400' },
  waitlisted: { code: 'HL', label: 'Хүлээлгийн жагсаалт', className: 'bg-sky-500/10 text-sky-700 dark:text-sky-400' },
  cancelled: { code: 'XX', label: 'Цуцлагдсан', className: 'bg-muted text-muted-foreground' },
}

export function StatusPill({ status }: { status: string }) {
  const s = BOOKING_STATUS[status] ?? { code: status, label: status, className: 'bg-muted' }
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium', s.className)}>
      <b className='font-mono'>{s.code}</b>
      {s.label}
    </span>
  )
}
