import { Plane } from 'lucide-react'
import { cn } from '@/lib/utils'

type LogoImageProps = {
  className?: string
  iconClassName?: string
}

/** Gate app-ийн логотой ижил: хар-цэнхэр дөрвөлжин + cyan онгоц */
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
        <Plane
          className={cn('size-1/2 text-cyan-300', iconClassName)}
          fill='currentColor'
          strokeWidth={1.5}
        />
      </div>
    </div>
  )
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn('font-bold tracking-tight', className)}>
      <span className='text-foreground'>flight</span>
      <span className='bg-gradient-to-r from-cyan-400 to-sky-400 bg-clip-text text-transparent'>
        mode
      </span>
    </span>
  )
}
