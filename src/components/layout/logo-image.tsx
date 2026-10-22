import { cn } from '@/lib/utils'

type LogoImageProps = {
  className?: string
  iconClassName?: string
}

/** Skythium "S" bolt (brand mark) — viewBox fits the mark tightly so it can be centred anywhere */
export function SkythiumMark({ className }: { className?: string }) {
  return (
    <svg viewBox='-2 -2 103 92' className={className} fill='currentColor' aria-hidden='true'>
      <path d='M99 0Q60 15 27 33C13 40 14 47 28 47L70 47Q36 69 0 88Q47 71 83 50C98 43 97 37 84 37L36 37Q68 21 99 0Z' />
    </svg>
  )
}

/** Rounded dark tile with a cyan → indigo ring and the Skythium S bolt (sign-in, sidebar, gate app) */
export function LogoImage({ className, iconClassName }: LogoImageProps) {
  return (
    <div
      className={cn(
        'relative flex size-full items-center justify-center rounded-[28%] bg-[#0b1a2c] p-[2px]',
        'bg-[linear-gradient(135deg,#22d3ee,#6366f1)]',
        className
      )}
    >
      <div className='flex size-full items-center justify-center rounded-[26%] bg-[#0b1a2c]'>
        <SkythiumMark className={cn('w-[58%] text-cyan-300', iconClassName)} />
      </div>
    </div>
  )
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn('font-extrabold tracking-[0.06em] uppercase', className)}>
      <span className='text-foreground'>Sky</span>
      <span className='bg-gradient-to-r from-cyan-400 to-sky-400 bg-clip-text text-transparent'>thium</span>
    </span>
  )
}
