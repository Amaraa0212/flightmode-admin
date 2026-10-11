import type { ElementType, ReactNode } from 'react'

export function StatTile({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: ElementType
  label: string
  value: ReactNode
  sub?: ReactNode
}) {
  return (
    <div className='fm-panel flex flex-col gap-2 p-4'>
      <div className='flex items-center justify-between'>
        <span className='fm-label'>{label}</span>
        <Icon className='text-brand size-4' />
      </div>
      <span className='text-2xl font-bold'>{value}</span>
      {sub && <span className='text-muted-foreground text-xs'>{sub}</span>}
    </div>
  )
}
