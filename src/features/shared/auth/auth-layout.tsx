import { ShieldCheck } from 'lucide-react'

type AuthLayoutProps = Readonly<{
  children: React.ReactNode
  footer?: React.ReactNode
}>

export function AuthLayout({ children, footer }: AuthLayoutProps) {
  return (
    <div className='fm-backdrop relative flex min-h-svh flex-col overflow-hidden'>
      <div
        aria-hidden
        className='pointer-events-none absolute top-1/3 left-1/2 size-[46rem] -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-cyan-400/10'
      />
      <div
        aria-hidden
        className='pointer-events-none absolute top-1/3 left-1/2 size-[70rem] -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-400/5'
      />

      <header className='relative z-10 flex items-center justify-between gap-3 p-4 sm:p-6'>
        <div className='bg-card/60 inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold tracking-wider uppercase backdrop-blur sm:text-sm'>
          <span className='size-2 rounded-full bg-emerald-400 shadow-[0_0_8px] shadow-emerald-400' />
          FlightMode • Airline back office
        </div>
        <div className='inline-flex items-center gap-2 rounded-full border border-indigo-400/40 bg-indigo-500/10 px-4 py-2 text-xs font-medium text-indigo-700 backdrop-blur sm:text-sm dark:text-indigo-200'>
          <ShieldCheck className='size-4' />
          Admin console
        </div>
      </header>

      <main className='relative z-10 flex flex-1 items-center justify-center px-4 py-8'>
        <div className='w-full max-w-md'>{children}</div>
      </main>

      {footer && (
        <footer className='relative z-10 mx-auto w-full max-w-md px-4 pb-6'>
          {footer}
        </footer>
      )}
    </div>
  )
}
