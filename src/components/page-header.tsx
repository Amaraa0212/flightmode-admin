import type { ReactNode } from 'react'

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string
  description?: string
  actions?: ReactNode
}) {
  return (
    <div className='flex flex-wrap items-end justify-between gap-3'>
      <div className='flex flex-col gap-1'>
        <h2 className='text-xl font-semibold tracking-tight'>{title}</h2>
        {description && (
          <p className='text-muted-foreground text-[13px]'>{description}</p>
        )}
      </div>
      {actions && <div className='flex items-center gap-2'>{actions}</div>}
    </div>
  )
}
